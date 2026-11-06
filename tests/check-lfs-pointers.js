/* 部署前靜態檢查（不開瀏覽器，npm run check 與 CI 第一步）：
 *   1. 專案裡沒有 Git LFS 指標檔（2026-10-14 起不使用 LFS：GitHub 的 Download ZIP／GitHub Pages 不含 LFS 真檔、
 *      沒裝 git-lfs 的電腦 clone 只拿到指標檔——字型／素材變成 130 byte 的文字檔，程式會悄悄用替代字型，輸出會變）。
 *   2. .gitattributes 沒有任何 filter=lfs 規則。
 *   3. 根目錄有 .nojekyll（GitHub Pages 預設用 Jekyll 建站，會略過底線開頭的 config/profiles/_defaults.js → 分類啟用失敗）。
 * 用法：node tests/check-lfs-pointers.js */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'work', 'golden-diff']);
const POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
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

function main() {
  const problems = [];
  const files = walk(REPO_ROOT);
  files.filter(isPointer).forEach((file) => problems.push(`Git LFS 指標檔（不是真檔）：${path.relative(REPO_ROOT, file)}`));

  const attributes = path.join(REPO_ROOT, '.gitattributes');
  if (fs.existsSync(attributes)) {
    fs.readFileSync(attributes, 'utf8').split('\n').map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && /filter=lfs/.test(line))
      .forEach((line) => problems.push(`.gitattributes 仍有 LFS 規則「${line}」：本專案不使用 Git LFS，請移除`));
  }
  if (!fs.existsSync(path.join(REPO_ROOT, '.nojekyll'))) problems.push('缺少根目錄 .nojekyll：GitHub Pages 會用 Jekyll 建站並略過底線開頭的 config/profiles/_defaults.js，請建立空檔 .nojekyll');

  if (problems.length) {
    problems.forEach((line) => console.error('✗', line));
    console.error('修法見 docs/上傳步驟.md（從 LFS 換回一般檔／GitHub Pages 設定）。');
    process.exit(1);
  }
  console.log(`✓ ${files.length} 個檔案沒有 Git LFS 指標檔，.gitattributes 不含 LFS 規則，.nojekyll 存在`);
}

main();
