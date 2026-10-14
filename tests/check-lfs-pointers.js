/* 檢查「瀏覽器執行時要讀的檔案」沒有變成 Git LFS 指標檔（不開瀏覽器，適合放 CI 第一步）。
 *
 * 背景：GitHub Pages 與「下載 ZIP」拿到的 LFS 檔是幾行文字（version https://git-lfs.github.com/spec/v1 …），
 * 不是真檔；字型、素材、vendor 程式庫、公版只要有一個是指標，網頁就壞一半且不會報錯。
 * 這支掃 fonts／assets／vendor／templates／config／rules／core／modules／launcher 與根目錄的 html／css，
 * 任何檔案開頭是 LFS 指標就失敗並列出；同時檢查 .gitattributes 沒有把這些目錄交給 LFS，
 * 以及根目錄有 .nojekyll（GitHub Pages 預設用 Jekyll 建站，會略過 _ 開頭的檔案，config/profiles/_defaults.js 就載不到）。
 * 用法：node tests/check-lfs-pointers.js */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIRS = ['fonts', 'assets', 'vendor', 'templates', 'config', 'rules', 'core', 'modules', 'launcher', 'smart-assets', 'renderers'];
const RUNTIME_FILES = ['index.html', 'app.html', 'style.css', 'theme-25.css'];
const POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function isPointer(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(POINTER_PREFIX.length);
    const read = fs.readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.toString('utf8', 0, read) === POINTER_PREFIX;
  } finally { fs.closeSync(fd); }
}

function checkGitAttributes(problems) {
  const file = path.join(REPO_ROOT, '.gitattributes');
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  const lfsLines = lines.filter((line) => /filter=lfs/.test(line));
  for (const line of lfsLines) {
    const pattern = line.split(/\s+/)[0];
    // 沒有限定路徑的副檔名規則（*.png、*.ttf…）會掃到 fonts／assets，這就是 GitHub 上字型載不到的原因。
    if (!pattern.includes('/')) problems.push(`.gitattributes 的「${line}」沒有限定路徑，會把執行時需要的檔案（fonts／assets）也交給 LFS；請改成 tests/golden/**/*.png 這類路徑規則`);
    else if (RUNTIME_DIRS.some((dir) => pattern.startsWith(`${dir}/`))) problems.push(`.gitattributes 的「${line}」把執行時需要的目錄交給 LFS`);
  }
}

function main() {
  const problems = [];
  let scanned = 0;
  const targets = [...RUNTIME_DIRS.map((dir) => path.join(REPO_ROOT, dir)).filter(fs.existsSync).flatMap((dir) => walk(dir)), ...RUNTIME_FILES.map((name) => path.join(REPO_ROOT, name)).filter(fs.existsSync)];
  for (const file of targets) {
    scanned += 1;
    if (isPointer(file)) problems.push(`LFS 指標檔（不是真檔）：${path.relative(REPO_ROOT, file)}`);
  }
  checkGitAttributes(problems);
  if (!fs.existsSync(path.join(REPO_ROOT, '.nojekyll'))) problems.push('缺少根目錄 .nojekyll：GitHub Pages 會用 Jekyll 建站並略過 _ 開頭的檔案（config/profiles/_defaults.js），請建立空檔 .nojekyll');
  if (problems.length) {
    problems.forEach((line) => console.error('✗', line));
    console.error('修法見 README「上 GitHub／GitLab」一節：執行時需要的檔案不能走 Git LFS。');
    process.exit(1);
  }
  console.log(`✓ 執行時需要的 ${scanned} 個檔案都是真檔，.gitattributes 只讓測試資料走 LFS，.nojekyll 存在`);
}

main();
