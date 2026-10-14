/* 檢查每個分類的 rules.manifest.js 引用的檔案都存在，且 profile 的 coreScripts／scripts／templatesDir／assetsDir 也都存在。
 * 路徑轉換規則與 core/profile-loader.js 相同：'rules/x' → rules/<分類>/x；'@shared/x' → rules/shared/x。
 * 用法：node tests/check-manifests.js（不需瀏覽器，適合放 CI 第一步）。 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PROFILE_DIR = path.join(REPO_ROOT, 'config', 'profiles');
const SHARED_RULES_DIR = 'rules/shared/';

function resolveRuleFile(file, namespace) {
  return String(file).replace(/^rules\//, namespace).replace(/^@shared\//, SHARED_RULES_DIR);
}

function readManifest(manifestPath) {
  const sandbox = { window: {} };
  new Function('window', 'Object', fs.readFileSync(manifestPath, 'utf8'))(sandbox.window, Object);
  return sandbox.window.TemplateRulesManifest || {};
}

function main() {
  const problems = [];
  const exists = (relative) => fs.existsSync(path.join(REPO_ROOT, relative));
  const profiles = fs.readdirSync(PROFILE_DIR).filter((name) => name.endsWith('.profile.js'));
  const readProfile = (file) => {
    // 設定檔是「JSON 包一行登錄到 window.__profileRegistry」的 JS；用假 window 執行後取回。
    const sandbox = { __profileRegistry: {} };
    new Function('window', fs.readFileSync(path.join(PROFILE_DIR, file), 'utf8'))(sandbox);
    const entry = Object.values(sandbox.__profileRegistry)[0];
    if (!entry) throw new Error(`${file} 沒有登錄任何分類`);
    return entry;
  };
  // 分類清單（index.js）裡的每個 id 都要有對應設定檔，反過來也一樣。
  const indexSandbox = { __profileRegistry: {} };
  new Function('window', fs.readFileSync(path.join(PROFILE_DIR, 'index.js'), 'utf8'))(indexSandbox);
  const indexIds = new Set((indexSandbox.__profileRegistry.index || []).map((item) => item.id));
  const profileIds = new Set(profiles.map((file) => readProfile(file).id));
  for (const id of indexIds) if (!profileIds.has(id)) problems.push(`index.js 列了「${id}」但沒有 ${id}.profile.js`);
  for (const id of profileIds) if (!indexIds.has(id)) problems.push(`${id}.profile.js 存在但 index.js 沒列`);
  if (!fs.existsSync(path.join(PROFILE_DIR, '_defaults.js'))) problems.push('缺少 config/profiles/_defaults.js');
  // 入口頁工具登錄表（config/tools.js）：每個工具都要有設定檔，每個設定檔也都要列在入口頁；sheetHints 要與 index.js 一致。
  const toolsSandbox = {};
  new Function('window', fs.readFileSync(path.join(REPO_ROOT, 'config', 'tools.js'), 'utf8'))(toolsSandbox);
  const tools = toolsSandbox.TOOL_REGISTRY || [];
  if (!tools.length) problems.push('config/tools.js 沒有登錄任何工具');
  const toolIds = new Set(tools.map((tool) => tool.id));
  for (const id of toolIds) if (!profileIds.has(id)) problems.push(`tools.js 列了「${id}」但沒有 ${id}.profile.js`);
  for (const id of profileIds) if (!toolIds.has(id)) problems.push(`${id}.profile.js 存在但 tools.js（入口頁）沒列`);
  for (const tool of tools) {
    const indexHints = (indexSandbox.__profileRegistry.index || []).find((item) => item.id === tool.id)?.sheetHints || [];
    if (!Array.isArray(tool.sheetHints) || !tool.sheetHints.length) problems.push(`tools.js「${tool.id}」沒有 sheetHints`);
    else if (!tool.sheetHints.every((hint) => indexHints.some((known) => known.includes(hint) || hint.includes(known)))) problems.push(`tools.js「${tool.id}」的 sheetHints 與 profiles/index.js 對不上`);
  }

  for (const file of profiles) {
    const profile = readProfile(file);
    const namespace = String(profile.rulesNamespace || `rules/${profile.id}/`);
    const manifestPath = path.join(REPO_ROOT, namespace, 'rules.manifest.js');
    if (!fs.existsSync(manifestPath)) { problems.push(`${profile.id}: 找不到 ${namespace}rules.manifest.js`); continue; }

    for (const ruleFile of readManifest(manifestPath).ruleFiles || []) {
      const resolved = resolveRuleFile(ruleFile, namespace);
      if (!exists(resolved)) problems.push(`${profile.id}: manifest 引用的 ${ruleFile} → ${resolved} 不存在`);
    }
    for (const src of [...(profile.scripts || []), ...(profile.coreScripts || [])]) {
      if (!exists(src)) problems.push(`${profile.id}: profile 引用的 ${src} 不存在`);
    }
    for (const dir of [profile.templatesDir, profile.assetsDir].filter(Boolean)) {
      if (!exists(dir)) problems.push(`${profile.id}: 資料夾 ${dir} 不存在`);
    }
  }

  if (problems.length) {
    problems.forEach((line) => console.error('✗', line));
    process.exit(1);
  }
  console.log(`✓ ${profiles.length} 個分類的 manifest／profile 引用全部存在`);
}

main();
