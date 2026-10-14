/* Runtime Policy – shared identity / normalization helpers – 整合版共用（正式BN／暖身BN／MS 三份僅註解不同）。 */
(function initRuntimePolicy() {
  'use strict';

  const decodeHashUnicode = (value) => String(value ?? '')
    .replace(/#U([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  const nfkc = (value) => decodeHashUnicode(value).normalize('NFKC');
  const stripExtension = (value) => String(value ?? '').replace(/\.[a-z0-9]+$/i, '');
  const stripOrderingPrefix = (value) => String(value ?? '').replace(/^\s*\d+\s*[_\-\s]+/, '');

  function normalizeLoose(value, { stripPrefix = false, stripExt = true } = {}) {
    let text = nfkc(value).replace(/\\/g, '/').split('/').pop();
    if (stripExt) text = stripExtension(text);
    if (stripPrefix) text = stripOrderingPrefix(text);
    return text
      .toLowerCase()
      .replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.＿－—–]+/g, '');
  }

  function normalizeTemplateIdentity(value) {
    return normalizeLoose(value, { stripPrefix: true, stripExt: true });
  }

  function normalizeRuleLabel(value) {
    return normalizeTemplateIdentity(value);
  }

  function normalizeAssetLoose(value) {
    return normalizeLoose(value, { stripPrefix: false, stripExt: true });
  }

  function normalizeAssetExact(value) {
    return stripExtension(nfkc(value).replace(/\\/g, '/').split('/').pop())
      .trim()
      .toLowerCase();
  }

  function normalizeLogicalAssetKey(value) {
    return normalizeAssetLoose(value);
  }

  function normalizeSmartAssetGroup(value) {
    return normalizeAssetLoose(value);
  }

  function getTemplateSourceIdentity(template) {
    return normalizeTemplateIdentity(
      template?.sheetTemplateRoute?.sourceTemplateId
      || template?.canvas?.templateId
      || template?.sourceTemplateId
      || template?.templateId
      || template?.source?.psdName
      || ''
    );
  }

  window.RuntimePolicy = Object.freeze({
    VERSION: '1.0.0',
    decodeHashUnicode,
    nfkc,
    stripExtension,
    stripOrderingPrefix,
    normalizeLoose,
    normalizeTemplateIdentity,
    normalizeRuleLabel,
    normalizeAssetLoose,
    normalizeAssetExact,
    normalizeLogicalAssetKey,
    normalizeSmartAssetGroup,
    getTemplateSourceIdentity,
  });
})();
