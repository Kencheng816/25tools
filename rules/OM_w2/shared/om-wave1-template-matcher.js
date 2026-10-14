/* OM Wave 1 template/media matcher. */
(function registerOmWave1TemplateMatcher() {
  'use strict';

  const TEMPLATE_IDS = Object.freeze([
    'FB_Linelap_1200x1200', 'FB_Linelap_1200x628',
    'FB_Linelap_600x400', 'FB_Linelap_960x1200',
    'Appier_1200x627', 'Appier_1536x2048', 'Appier_160x600', 'Appier_2048x1536',
    'Appier_300x600', 'Appier_320x480', 'Appier_320x50', 'Appier_336x280',
    'Appier_480x320', 'Appier_600x1200', 'Appier_600x500', 'Appier_640x100',
    'Appier_640x200', 'Appier_640x960', 'Appier_672x560', 'Appier_960x640', 'Appier_970x250',
    'DPA Frame_MAU_1080x1080',
    'Rtbhouse_300x250', 'Rtbhouse_300x600', 'Rtbhouse_320x480', 'Rtbhouse_320x50',
    'Rtbhouse_360x640', 'Rtbhouse_480x320', 'Rtbhouse_728x90',
    'Template_1200x1200', 'Template_1200x628', 'Template_600x400',
    'UAC_Pmax_LineLAP_1200x1200', 'UAC_Pmax_LineLAP_1200x628',
    'UAC_Pmax_LineLAP_600x400', 'UAC_Pmax_LineLAP_960x1200',
    'LineOA_Template_一般 01', 'LineOA_Template_創貼 05', 'LineOA_Template_25 spike 創貼 14',
  ]);
  const TEMPLATE_SET = new Set(TEMPLATE_IDS);

  const MEDIA = Object.freeze({
    TEMPLATE: 'Template',
    UAC: 'UAC/Pmax/LineLAP',
    // 工單「曝光媒體」欄位寫的是 FB/Linelap；公版檔名沿用 FB_Linelap 前綴。
    FB: 'FB/Linelap',
    RTBHOUSE: 'Rtbhouse',
    APPIER: 'Appier',
    DPA: 'DPA',
    LINEOA: 'LineOA',
  });

  function normalizeSize(value) {
    return String(value || '').trim().toLowerCase().replace(/[×＊*]/g, 'x').replace(/\s+/g, '');
  }

  function normalizeMedia(value) {
    const raw = String(value || '').trim();
    const key = raw.toLowerCase().replace(/[\s_\-/]+/g, '');
    if (key === 'uacpmaxlinelap') return MEDIA.UAC;
    // FB/Linelap、FB_Linelap、FB Linelap、FBLineLAP 都視為同一個媒體。
    if (key === 'fblinelap' || key === 'facebooklinelap') return MEDIA.FB;
    if (key === 'template') return MEDIA.TEMPLATE;
    if (key === 'rtbhouse') return MEDIA.RTBHOUSE;
    if (key === 'appier') return MEDIA.APPIER;
    if (key === 'dpa' || key === 'dpaframe' || key === 'dpaframemau') return MEDIA.DPA;
    if (key === 'lineoa' || key === 'lineofficialaccount') return MEDIA.LINEOA;
    return raw;
  }

  function mediaPrefix(media) {
    switch (normalizeMedia(media)) {
      case MEDIA.TEMPLATE: return 'Template';
      case MEDIA.UAC: return 'UAC_Pmax_LineLAP';
      case MEDIA.FB: return 'FB_Linelap';
      case MEDIA.RTBHOUSE: return 'Rtbhouse';
      case MEDIA.APPIER: return 'Appier';
      case MEDIA.DPA: return 'DPA Frame_MAU';
      case MEDIA.LINEOA: return 'LineOA_Template';
      default: return '';
    }
  }

  function assetFolder(media) {
    return mediaPrefix(media);
  }

  function familyForMedia(media) {
    switch (normalizeMedia(media)) {
      case MEDIA.TEMPLATE: return 'om_wave1_template';
      case MEDIA.UAC: return 'om_wave1_uac_pmax_linelap';
      case MEDIA.FB: return 'om_wave1_fb_linelap';
      case MEDIA.RTBHOUSE: return 'om_wave1_rtbhouse';
      case MEDIA.APPIER: return 'om_wave1_appier';
      case MEDIA.DPA: return 'om_wave1_dpa_frame_mau';
      case MEDIA.LINEOA: return 'om_wave1_lineoa';
      default: return '';
    }
  }

  function resolveTemplateId(media, size, layoutNo = '') {
    const normalizedSize = normalizeSize(size);
    const normalizedMedia = normalizeMedia(media);
    const prefix = mediaPrefix(media);
    if (!prefix || !normalizedSize) return '';
    if (normalizedMedia === MEDIA.DPA) return 'DPA Frame_MAU_1080x1080';

    const normalizedLayout = String(layoutNo || '').trim();
    // LineOA 的正式檔名規則是 LineOA_Template_<Layout編號>.json，尺寸只用於輸出命名，
    // 不參與模板檔名；因此不能沿用一般 OM 的 <prefix>_<layout>_<size> 組法。
    if (normalizedMedia === MEDIA.LINEOA) {
      const lineOaId = normalizedLayout ? `LineOA_Template_${normalizedLayout}` : '';
      return lineOaId && TEMPLATE_SET.has(lineOaId) ? lineOaId : '';
    }

    // Future-proof rule: if a registered layout-specific file exists, it wins.
    const specific = normalizedLayout ? `${prefix}_${normalizedLayout}_${normalizedSize}` : '';
    if (specific && TEMPLATE_SET.has(specific)) return specific;

    const shared = `${prefix}_${normalizedSize}`;
    return TEMPLATE_SET.has(shared) ? shared : '';
  }

  function normalizeOutputName(value) {
    return String(value || '')
      .trim()
      .replace(/^UAC\s*[\\/]\s*Pmax\s*[\\/]\s*LineLAP/i, 'UAC_Pmax_LineLAP')
      .replace(/^FB\s*[\\/_\s]\s*Linelap/i, 'FB_Linelap')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/^_+|_+$/g, '');
  }

  window.OMWave1TemplateMatcher = Object.freeze({
    TEMPLATE_IDS,
    MEDIA,
    normalizeSize,
    normalizeMedia,
    mediaPrefix,
    assetFolder,
    familyForMedia,
    resolveTemplateId,
    normalizeOutputName,
  });
})();
