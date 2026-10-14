/* 整合版 – 存檔（.25tool.zip）儲存與載回
 *
 * 一個 zip 裝下「這次做圖的全部狀態」，之後載回可以繼續微調、再存、再下載圖：
 *   manifest.json     版本、分類、工單分頁、目前專案、建立時間、數量
 *   session.json      每張圖的最終畫面（SnapshotManager 快照）＋ batchRecord／可見／專案；未匹配清單；解析診斷
 *   workbook/<檔名>   原始工單（之後還能重新解析）
 *   templates/<檔名>  當時載入的公版 JSON 原檔（不用再找公版資料夾）
 *   assets/<相對路徑> 只打包「有被某張圖用到」的素材（保留使用者當時上傳的相對路徑），加上「手動替換」桶
 *
 * 載回的原則：畫面為準（visual-authority）。每張圖走 SnapshotManager.prepareLoadedSnapshot，
 * B 系 core 的 shouldProtectVisualState 會擋掉重跑套版／規則／Preset；A 系 core 的預覽與匯出本來就只讀 template 資料。
 * 素材則用 TemplateLoader.loadAssetFolder 重建（跟使用者自己上傳資料夾走同一條路），確保查找結果一致。
 *
 * 本檔不依賴 A／B 血緣，只用 core 掛在 window 上的公開介面；core 未載入時按鈕會提示先選分類。
 */
(function initSessionArchive() {
  'use strict';

  const FORMAT_VERSION = 1;
  const FILE_SUFFIX = '.25tool.zip';
  const MANUAL_BUCKET = '手動替換';
  const $ = (id) => document.getElementById(id);

  // 使用者上傳的工單與公版 JSON 原檔：在 capture 階段攔截 input change，core／bootstrap 的處理不受影響。
  const captured = { workbookFile: null, templateFiles: [] };

  function captureInputs() {
    $('excelInput')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) captured.workbookFile = file;
    }, { capture: true });
    $('templateFolderInput')?.addEventListener('change', (event) => {
      const files = [...(event.target.files || [])].filter((file) => /\.json$/i.test(file.name) && file.name !== 'manifest.json');
      if (files.length) captured.templateFiles = files;
    }, { capture: true });
  }

  const coreReady = () => !!(window.AppState && window.TemplateLoader && window.BatchManager && window.SnapshotManager && window.JSZip);
  const timestamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '_');
  const safeSegment = (value) => String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '_');
  const decodeHashUnicode = (value) => String(value || '').replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // ── 儲存 ──

  /** 找出某張圖每個圖片圖層實際用到的素材檔（File）。找不到的略過（缺素材本來就不會畫）。 */
  function collectUsedAssetFiles(template, project) {
    const files = new Set();
    const entries = window.AssetStore?.getFileEntries?.() || [];
    const byResolvedPath = new Map(entries.map((entry) => [decodeHashUnicode(entry.relativePath || entry.lookupName || '').toLowerCase(), entry.file]));

    Object.entries(template?.layers || {}).forEach(([key, layer]) => {
      if (!layer) return;
      // 規則檔用素材畫的 shape 圖層（shapeLayers 的 renderer:'asset'）：圖層本身沒有 assetFilename，
      // 素材名寫在規則裡，要另外找出來一起打包，載回才畫得出來。
      if (layer.type === 'shape') {
        const rule = window.Renderer?.getRuleShape?.(key, layer, template);
        const ruleAsset = String(rule?.asset || '').trim();
        if (ruleAsset) {
          try {
            const file = window.TemplateLoader.findLocalAssetFile(ruleAsset, template, { project: String(project || '').trim(), layerKey: key, layer });
            if (file) files.add(file);
          } catch (_) { /* 找不到就略過，載回時規則會退回原本的找法 */ }
        }
        return;
      }
      if (layer.type !== 'image') return;
      const filename = String(layer.assetFilename || '').trim();
      if (!filename) return;

      // B 系載圖時會記下實際命中的相對路徑，優先用它（同名檔不會拿錯）。
      const resolvedPath = decodeHashUnicode(layer.__resolvedAssetPath || '').toLowerCase();
      if (resolvedPath && !resolvedPath.startsWith('@')) {
        const hit = [...byResolvedPath.entries()].find(([path]) => path === resolvedPath || path.endsWith(`/${resolvedPath}`));
        if (hit) { files.add(hit[1]); return; }
      }
      const candidates = [filename, ...(Array.isArray(layer.assetCandidates) ? layer.assetCandidates : [])];
      for (const candidate of candidates) {
        try {
          const file = window.TemplateLoader.findLocalAssetFile(candidate, template, {
            project: String(layer.assetProject || project || '').trim(),
            layerKey: key,
            layer,
            allowFuzzy: layer.__exactAssetMatch !== true,
          });
          if (file) { files.add(file); return; }
        } catch (_) { /* A 系查找歧義會拋錯：視為找不到，交給下一個候選 */ }
      }
    });
    return files;
  }

  /** 把要打包的素材整理成 [{ zipPath, relativePath, file, manual, folder, lookupNames }]。
   *  一般素材（使用者上傳資料夾來的，有 webkitRelativePath）走原相對路徑，載回時重播 loadAssetFolder；
   *  手動素材（從檔案選擇器／拖曳來的，沒有相對路徑：「手動替換」桶、MS 的 __manual_upload_* 桶）
   *  記下所在桶名與桶內所有查找名，載回時原樣放回，圖層的 assetFilename／assetProject 才對得上。 */
  function planAssetEntries(templates) {
    const used = new Set();
    templates.forEach((entry) => collectUsedAssetFiles(entry.data, entry.project).forEach((file) => used.add(file)));

    // 桶內每個 File 的所有查找名（同一個 File 可能以檔名與相對路徑兩個 key 存在）。
    const bucketOf = new Map();
    (window.AppState.assetFiles || new Map()).forEach((bucket, folder) => {
      bucket.forEach((file, lookupName) => {
        if (!bucketOf.has(file)) bucketOf.set(file, { folder, lookupNames: [] });
        bucketOf.get(file).lookupNames.push(lookupName);
        // 手動桶整桶帶走（可能有圖層還沒重新載圖、尚未被 collectUsedAssetFiles 找到）。
        if (folder === MANUAL_BUCKET || String(folder).startsWith('__manual_upload_') || String(lookupName).startsWith('manual/')) used.add(file);
        // 規範圖（<公版關鍵字>_規範.png）：只在預覽疊參考線、不影響輸出，但載回後少了會看不到規範，一併帶走。
        if (/規範\.(png|jpe?g|webp)$/i.test(String(file.name || ''))) used.add(file);
      });
    });

    const plan = [];
    const seenPaths = new Set();
    for (const file of used) {
      const isManual = !file.webkitRelativePath;
      const bucket = bucketOf.get(file) || { folder: '', lookupNames: [file.name] };
      const relativePath = isManual
        ? `@manual/${safeSegment(bucket.folder || MANUAL_BUCKET)}/${safeSegment(file.name)}`
        : decodeHashUnicode(file.webkitRelativePath);
      const zipPath = `assets/${relativePath}`;
      if (seenPaths.has(zipPath)) continue;
      seenPaths.add(zipPath);
      plan.push({ zipPath, relativePath, file, manual: isManual, folder: isManual ? bucket.folder : '', lookupNames: isManual ? bucket.lookupNames : null });
    }
    return plan;
  }

  function buildSessionJson(assetPlan) {
    const AppState = window.AppState;
    const SnapshotManager = window.SnapshotManager;
    return {
      formatVersion: FORMAT_VERSION,
      batchMode: AppState.batchMode === true,
      activeIndex: Number(AppState.activeIndex || 0),
      currentProject: String(AppState.currentProject || ''),
      detectedExcelProjects: Array.isArray(AppState.detectedExcelProjects) ? AppState.detectedExcelProjects.slice() : [],
      templates: (AppState.templates || []).map((entry) => ({
        name: entry.name,
        file: entry.file,
        visible: entry.visible !== false,
        project: entry.project || '',
        batchRecord: entry.batchRecord || null,
        data: SnapshotManager.createSnapshot(entry.data),
      })),
      unmatchedBatchItems: Array.isArray(AppState.unmatchedBatchItems) ? AppState.unmatchedBatchItems : [],
      batchDiagnostics: AppState.batchDiagnostics && typeof AppState.batchDiagnostics === 'object'
        ? JSON.parse(JSON.stringify(AppState.batchDiagnostics, (key, value) => (key.startsWith('__') ? undefined : value)))
        : null,
      // 手動素材要用原本的桶名與查找名（例：manual/<時間>_<檔名>）放回去，圖層的 assetFilename／assetProject 才對得上。
      assets: assetPlan.map(({ zipPath, relativePath, manual, folder, lookupNames }) => ({ zipPath, relativePath, manual, folder, lookupNames })),
    };
  }

  async function buildArchive() {
    if (!coreReady()) throw new Error('請先選擇工具分類並載入公版。');
    const AppState = window.AppState;
    if (!AppState.templates?.length) throw new Error('目前沒有任何公版或產出圖片，沒有東西可以存。');

    const profile = window.ProfileLoader?.active;
    const sheet = $('excelSheetSelect')?.value || '';
    const assetPlan = planAssetEntries(AppState.templates);
    const zip = new window.JSZip();

    zip.file('manifest.json', JSON.stringify({
      formatVersion: FORMAT_VERSION,
      tool: '25節Tool_整合版',
      profile: profile?.id || '',
      profileLabel: profile?.label || '',
      sheet,
      currentProject: String(AppState.currentProject || ''),
      createdAt: new Date().toISOString(),
      counts: { templates: AppState.templates.length, assets: assetPlan.length, templateFiles: captured.templateFiles.length },
      workbook: captured.workbookFile ? `workbook/${safeSegment(captured.workbookFile.name)}` : '',
    }, null, 2));
    zip.file('session.json', JSON.stringify(buildSessionJson(assetPlan), null, 2));
    if (captured.workbookFile) zip.file(`workbook/${safeSegment(captured.workbookFile.name)}`, captured.workbookFile);
    captured.templateFiles.forEach((file) => zip.file(`templates/${safeSegment(file.name)}`, file));
    assetPlan.forEach(({ zipPath, file }) => zip.file(zipPath, file));

    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  function archiveFilename() {
    const profile = window.ProfileLoader?.active?.id || '未分類';
    const sheet = $('excelSheetSelect')?.value || '';
    return `${safeSegment(profile)}${sheet ? `_${safeSegment(sheet)}` : ''}_${timestamp()}${FILE_SUFFIX}`;
  }

  async function saveToDownload() {
    window.LoadingOverlay?.show?.('正在打包存檔…');
    try {
      const blob = await buildArchive();
      window.ExportManager.downloadBlob(blob, archiveFilename());
      window.showToast?.('已儲存存檔');
    } catch (error) {
      console.error('[SessionArchive] 儲存失敗', error);
      alert(`儲存存檔失敗：${error?.message || error}`);
    } finally {
      window.LoadingOverlay?.hide?.();
    }
  }

  // ── 載回 ──

  const fileWithRelativePath = (blob, name, relativePath) => {
    const file = new File([blob], name, { type: guessMime(name), lastModified: Date.now() });
    Object.defineProperty(file, 'webkitRelativePath', { value: relativePath, configurable: true });
    return file;
  };

  function guessMime(name) {
    const ext = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
    return { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', json: 'application/json' }[ext] || 'application/octet-stream';
  }

  async function readArchive(blob) {
    const zip = await window.JSZip.loadAsync(blob);
    const readJson = async (path) => {
      const entry = zip.file(path);
      if (!entry) throw new Error(`存檔缺少 ${path}`);
      return JSON.parse(await entry.async('string'));
    };
    const manifest = await readJson('manifest.json');
    const session = await readJson('session.json');
    if (Number(manifest.formatVersion) !== FORMAT_VERSION) throw new Error(`不支援的存檔版本：${manifest.formatVersion}`);
    return { zip, manifest, session };
  }

  /** 分類必須跟存檔一致：沒啟用就啟用；啟用了別的分類就帶參數重載，請使用者再載一次。 */
  async function ensureProfile(profileId) {
    const loader = window.ProfileLoader;
    if (!profileId) throw new Error('存檔沒有記錄工具分類。');
    if (loader.active) {
      if (loader.active.id === profileId) return;
      if (confirm(`這份存檔屬於分類「${profileId}」，目前是「${loader.active.id}」。要切換分類並重新載入頁面嗎？（切換後請再載入一次存檔）`)) {
        loader.reloadWithProfile(profileId);
      }
      throw new Error('分類不同，已中止載入。');
    }
    const select = $('profileSelect');
    if (select) select.value = profileId;
    await loader.activate(profileId);
    await window.__appReady;
  }

  async function restoreTemplatesPool(zip) {
    const entries = zip.file(/^templates\/.+\.json$/i);
    if (!entries.length) throw new Error('存檔裡沒有公版 JSON。');
    const files = [];
    for (const entry of entries) {
      const name = entry.name.split('/').pop();
      files.push(fileWithRelativePath(await entry.async('blob'), name, `templates/${name}`));
    }
    captured.templateFiles = files;
    await window.TemplateLoader.loadTemplateFolder(files);
  }

  async function restoreAssets(zip, session) {
    const regular = [];
    const manual = [];
    for (const record of session.assets || []) {
      const entry = zip.file(record.zipPath);
      if (!entry) continue;
      const blob = await entry.async('blob');
      const name = record.zipPath.split('/').pop();
      if (record.manual) manual.push({ record, file: new File([blob], name, { type: guessMime(name) }) });
      else regular.push(fileWithRelativePath(blob, name, record.relativePath));
    }
    if (regular.length) await window.TemplateLoader.loadAssetFolder(regular);
    if (manual.length) {
      manual.forEach(({ record, file }) => {
        const folder = record.folder || MANUAL_BUCKET;
        (record.lookupNames || [file.name]).forEach((lookupName) => window.AssetStore.registerManualFile(folder, lookupName, file));
      });
    }
  }

  async function restoreWorkbook(zip, manifest) {
    if (!manifest.workbook) return;
    const entry = zip.file(manifest.workbook);
    if (!entry) return;
    const name = manifest.workbook.split('/').pop();
    const file = new File([await entry.async('blob')], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    captured.workbookFile = file;
    await window.BatchManager.handleExcelFile(file);
    const select = $('excelSheetSelect');
    if (select && manifest.sheet) select.value = manifest.sheet;
  }

  async function restoreBatchState(session) {
    const AppState = window.AppState;
    const flag = (key, fallback) => { const value = window.ProfileLoader?.getFlag?.(key, undefined); return value === undefined || value === null ? fallback : value; };

    // 載回前先把剛載入的公版留成「來源公版池」，之後若使用者重新解析工單才有東西可套。
    AppState.sourceTemplates = window.BatchManager.ensureTemplatePool?.(AppState.templates) || AppState.templates.map((entry) => ({ ...entry }));

    await window.TextBaselineModel?.waitForFonts?.();
    const templates = [];
    for (const saved of session.templates || []) {
      const data = saved.data;
      window.SnapshotManager.prepareLoadedSnapshot(data);
      // 跟 loadTemplateFolder 載入快照 JSON 時一樣：只補缺少的文字基線參考，不重算既有值。
      if (flag('templates.textBaselinePrepare', true)) await window.TextBaselineModel?.prepareTemplate?.(data, { source: 'snapshot-restore' });
      templates.push({
        name: saved.name,
        file: saved.file,
        visible: saved.visible !== false,
        project: saved.project || '',
        batchRecord: saved.batchRecord || data.batchRecord || null,
        data,
        restoreSnapshot: true,
      });
    }
    if (!templates.length) throw new Error('存檔裡沒有任何圖片狀態。');

    AppState.currentProject = session.currentProject || '';
    AppState.detectedExcelProjects = session.detectedExcelProjects || [];
    AppState.unmatchedBatchItems = session.unmatchedBatchItems || [];
    AppState.batchDiagnostics = session.batchDiagnostics || null;
    AppState.batchItems = templates;
    AppState.batchGroupsOpen = {};
    AppState.templates = templates;
    AppState.activeIndex = Math.min(Math.max(0, Number(session.activeIndex || 0)), templates.length - 1);
    AppState.template = templates[AppState.activeIndex].data;
    AppState.selectedLayers = [];
    AppState.batchMode = session.batchMode !== false;

    const BatchManager = window.BatchManager;
    BatchManager.renderBatchUI?.();
    if (AppState.batchMode) {
      BatchManager.renderPreviewPlaceholders?.();
      window.LoadingOverlay?.show?.('正在載入存檔的素材與縮圖…', 0);
      try { await BatchManager.renderPreviewGrid({ showProgress: true, revealWhenDone: true }); }
      finally { window.LoadingOverlay?.hide?.(); }
    } else {
      await window.TemplateLoader.loadImagesForActiveTemplate({ project: templates[AppState.activeIndex].project });
    }
    window.App.sync();
    BatchManager.renderBatchUI?.();
  }

  async function restoreArchive(blob) {
    const { zip, manifest, session } = await readArchive(blob);
    await ensureProfile(manifest.profile);
    if (!coreReady()) throw new Error('core 尚未就緒。');
    await restoreTemplatesPool(zip);
    await restoreAssets(zip, session);
    await restoreWorkbook(zip, manifest);
    await restoreBatchState(session);
    return { manifest, templates: session.templates?.length || 0, assets: session.assets?.length || 0 };
  }

  async function loadFromFile(file) {
    if (!file) return;
    window.LoadingOverlay?.show?.('正在讀取存檔…');
    try {
      const result = await restoreArchive(file);
      window.showToast?.(`已載入存檔：${result.templates} 張圖、${result.assets} 個素材`);
      const status = $('profileStatus');
      if (status) status.textContent = `已載入存檔（${result.manifest.profileLabel || result.manifest.profile}／${result.manifest.sheet || '未記錄分頁'}）`;
    } catch (error) {
      console.error('[SessionArchive] 載入失敗', error);
      if (!/已中止載入/.test(String(error?.message))) alert(`載入存檔失敗：${error?.message || error}`);
    } finally {
      window.LoadingOverlay?.hide?.();
    }
  }

  function bindUI() {
    captureInputs();
    $('saveArchiveBtn')?.addEventListener('click', () => saveToDownload());
    $('loadArchiveBtn')?.addEventListener('click', () => $('archiveInput')?.click());
    $('archiveInput')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      await loadFromFile(file);
    });
  }

  window.SessionArchive = Object.freeze({
    FORMAT_VERSION,
    FILE_SUFFIX,
    buildArchive,
    restoreArchive,
    saveToDownload,
    loadFromFile,
    archiveFilename,
  });

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bindUI, { once: true });
  else bindUI();
})();
