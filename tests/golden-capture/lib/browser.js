'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

/**
 * 啟動 headless Chromium（@sparticuz/chromium 隨 npm 附帶二進位，不需另外下載）。
 * 固定關閉 GPU 與字型 hinting，讓黃金樣本與日後回歸走同一條渲染路徑。
 */
async function launchBrowser() {
  const puppeteer = require('puppeteer-core');
  // @sparticuz/chromium 是 ESM 套件；先用 CJS 解析路徑（會吃 NODE_PATH），再以檔案 URL 匯入。
  const { default: chromium } = await import(pathToFileURL(require.resolve('@sparticuz/chromium')).href);
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [...chromium.args, '--disable-gpu', '--font-render-hinting=none', '--disable-lcd-text'],
    defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1 },
  });
  return { browser, version: await browser.version() };
}

/** 把 CDN 的 script 請求改成回傳本機 node_modules 內同版本檔案（沙箱無法連外）。 */
async function interceptCdn(page, cdnMap, resolveModuleFile) {
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const localFile = cdnMap[request.url()];
    if (!localFile) return request.continue();
    request.respond({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: fs.readFileSync(resolveModuleFile(localFile)),
    });
  });
}

/**
 * 用 CDP 直接餵檔案給 <input type=file>。
 * webkitdirectory 的 input 給資料夾路徑，Chrome 會自行展開並填好 webkitRelativePath。
 */
async function setInputFiles(page, inputId, filePaths) {
  const cdp = await page.createCDPSession();
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `#${inputId}` });
  if (!nodeId) throw new Error(`找不到 <input id="${inputId}">`);
  await cdp.send('DOM.setFileInputFiles', { nodeId, files: filePaths.map((p) => path.resolve(p)) });
  await cdp.detach();
}

/**
 * 以「固定順序」把資料夾餵給 webkitdirectory 的 <input>：在頁面內用 fetch 讀檔、建成 File 物件，
 * 依 webkitRelativePath 的 Unicode 碼位排序後派發 change 事件。
 *
 * 為什麼不用 CDP 直接給資料夾：Chrome 會用作業系統的目錄列舉順序（Linux ext4 是雜湊順序、每個資料夾都不同），
 * 而 B 系工具的模糊素材比對會取「第一個命中」，順序不同就選到不同檔案（LineOA LOGO 案例）。
 * 固定排序後黃金樣本與回歸在任何機器都一致；碼位排序也最接近 Windows 檔案總管的列舉順序。
 *
 * @param serverOrigin 靜態伺服器 origin；dirRel 為相對工具根目錄的資料夾（如 'assets'）。
 * @param files 相對 dirRel 的檔案清單（由 node 端列舉）。
 */
async function setInputFilesSorted(page, inputId, dirRel, files, rootName) {
  const sorted = [...files].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  await page.evaluate(async ({ inputId, dirRel, sorted, rootName }) => {
    const mime = (name) => ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp', gif: 'image/gif', json: 'application/json', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }[name.split('.').pop().toLowerCase()] || 'application/octet-stream');
    const list = [];
    for (const rel of sorted) {
      const url = `${dirRel}/${rel}`.split('/').map(encodeURIComponent).join('/');
      // 用 arrayBuffer 而不是 blob()：沙箱 Chromium 對十幾 MB 的回應 blob() 會 Failed to fetch（blob 儲存空間限制），arrayBuffer 不會。
      const bytes = await (await fetch(url, { cache: 'no-store' })).arrayBuffer();
      const name = rel.split('/').pop();
      const file = new File([bytes], name, { type: mime(name), lastModified: 0 });
      Object.defineProperty(file, 'webkitRelativePath', { value: `${rootName}/${rel}`, configurable: true });
      list.push(file);
    }
    const input = document.getElementById(inputId);
    // FileList 無法建構；原工具只用 [...fileList] / fileList[0]，用陣列取代即可。
    Object.defineProperty(input, 'files', { value: list, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { inputId, dirRel, sorted, rootName });
}

module.exports = { launchBrowser, interceptCdn, setInputFiles, setInputFilesSorted };
