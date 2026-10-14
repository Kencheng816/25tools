/* 05_SKBN APP / PC 公版規則
 *
 * 共用 HBN / DD Card / POPUP 的：
 * - Block → 備註No → Record 工單解析
 * - 文案一般 / VIP Variant
 * - 商品 P 素材解析（版位專屬 → 共用素材）
 * - Price Parser / Price Style Resolver / generated price layers
 * - Smart Asset 的 P + compatible price 同步
 *
 * SKBN 專屬差異：
 * - Excel 標題欄位名稱是「文案」而非「主標」
 * - 蝦皮直營 Variant 本版暫不啟用
 * - APP VIP 使用 蝦皮VIP_LOGO + 蝦皮VIP_文案
 * - PC VIP 切換 黃色商城 Logo ↔ 25號_白字 + 白色直線 + 蝦皮VIP_icon_白色
 * - CTA 為固定公版圖片，不讀 Excel CTA
 */
(function registerSkbnWarmupRule() {
  'use strict';

  var APP_ID = '05_SKBN_APP_中';
  var PC_ID = '05_SKBN_PC_中';
  var PRODUCT_FOLDER = '共用素材';

  function trim(value) { return String(value == null ? '' : value).trim(); }
  function sourceTemplateId(template) {
    return trim(template && template.sheetTemplateRoute && template.sheetTemplateRoute.sourceTemplateId
      || template && template.canvas && template.canvas.templateId
      || template && template.sourceTemplateId
      || template && template.templateId
      || template && template.batchSourceName);
  }
  function isPc(template) { return /skbn[_\s-]*pc/i.test(sourceTemplateId(template)); }
  function isApp(template) { return /skbn[_\s-]*app/i.test(sourceTemplateId(template)); }
  function getLayer(template, key) { return template && template.layers ? template.layers[key] || null : null; }
  function setHidden(template, key, hidden) { var layer=getLayer(template,key); if(layer) layer.hidden=!!hidden; }
  function setStaticAsset(template, key, filename, project) {
    var layer=getLayer(template,key); if(!layer) return;
    layer.assetFilename=filename;
    layer.assetProject=project || '';
    layer.__assetMissing=false;
    layer.hidden=false;
  }
  function rememberBaseline(template) {
    if (!template || template.__skbnBaseline) return;
    var text=getLayer(template,'文案');
    template.__skbnBaseline={
      mainCenterX:Number(text && text.centerX),
      textY:Number(text && text.y),
      textFontSize:Number(text && text.fontSizePx),
      textAlign:String(text && text.align || 'center'),
    };
  }
  function mainCenterX(template) {
    rememberBaseline(template);
    var center=Number(template && template.__skbnBaseline && template.__skbnBaseline.mainCenterX);
    if (isFinite(center)) return center;
    return Number(template && template.canvas && template.canvas.width) / 2;
  }
  function assetFolder(template) { return isPc(template) ? PC_ID : APP_ID; }
  function outputPrefix(_template, record) {
    var source=trim(record && record.__sourceName);
    if (/pc/i.test(source)) return PC_ID;
    if (/app/i.test(source)) return APP_ID;
    return 'SKBN';
  }

  function resolveRecordTemplateRoute(args) {
    var n=args.helpers.normalizeRouteValue(args.block && args.block.name);
    var id='';
    if(n.indexOf('app')>=0) id=APP_ID;
    else if(n.indexOf('pc')>=0) id=PC_ID;
    if(!id) return {missingReason:'SKBN 目前有 APP / PC 多個公版，工單名稱必須能唯一判斷 APP 或 PC。'};
    return {key:'skbn_25_bn_warmup',family:'skbn_25_bn_warmup',label:id,templateId:id,templateFile:id+'.json',outputPrefix:id};
  }

  function applyFixedAssets(template) {
    if (isPc(template)) {
      setStaticAsset(template,'SKBN_PC_CTA','05_SKBN_PC_中_CTA.png',PC_ID);
      setStaticAsset(template,'橫式_25號商城狂購節_LOGO_黃','橫式_25號商城狂購節_LOGO_黃.svg','');
      setStaticAsset(template,'25號_白字','25號_白字.svg','');
      setStaticAsset(template,'蝦皮VIP_icon_白色','蝦皮VIP_icon_白色.svg','');
    } else if (isApp(template)) {
      setStaticAsset(template,'SKBN_APP_CTA','05_SKBN_APP_CTA.png',APP_ID);
      setStaticAsset(template,'橫式_25號商城狂購節_LOGO_黃','橫式_25號商城狂購節_LOGO_黃.svg','');
      setStaticAsset(template,'蝦皮VIP_LOGO','蝦皮VIP_LOGO.svg','');
    }
  }

  function applyPcVariant(template, record, helpers) {
    if (!isPc(template)) return;
    var textLayer=getLayer(template,'文案');
    if (!textLayer) return;
    var raw=trim(record && record['主標']);
    var vip=/vip/i.test(raw);
    var display=vip ? raw.replace(/^\s*vip\s*/i,'') : raw;
    var baseline=template.__skbnBaseline || {};
    var measure=helpers && typeof helpers.measureTextWidth==='function'
      ? helpers.measureTextWidth
      : function(layer){return Number(layer && layer.width)||0;};
    var leftX=17;

    textLayer.hidden=false;
    textLayer.text=display;
    textLayer.fontSizePx=Number(baseline.textFontSize) || Number(textLayer.fontSizePx) || 30;
    textLayer.textVerticalAlign='source-baseline';
    textLayer.align='left';
    var width=Math.max(1,Number(measure(textLayer)) || Number(textLayer.width) || 1);
    textLayer.width=Math.round(width*100)/100;
    textLayer.x=leftX;
    textLayer.centerX=Math.round((leftX+width/2)*100)/100;
    if (isFinite(Number(baseline.textY))) textLayer.y=Number(baseline.textY);

    setHidden(template,'橫式_25號商城狂購節_LOGO_黃',vip);
    setHidden(template,'25號_白字',!vip);
    setHidden(template,'白色直線',!vip);
    setHidden(template,'蝦皮VIP_icon_白色',!vip);
  }

  function applyAppVariantVisibility(template, record) {
    if (!isApp(template)) return;
    var vip=/vip/i.test(trim(record && record['主標']));
    // Factory already switches 文案 / VIP Logo + VIP 文案; only ensure the static campaign logo stays on.
    setHidden(template,'橫式_25號商城狂購節_LOGO_黃',false);
    if (!vip) {
      setHidden(template,'蝦皮VIP_LOGO',true);
      setHidden(template,'蝦皮VIP_文案',true);
    }
  }

  var provisionalPriceRatio = 48 / 366; // semantic engine unchanged; temporary geometry scales from each SKBN P width.
  var provisionalWidthRatio = 220 / 366;

  var rule = window.WarmupBannerRuleFactory.createRule({
    ruleKey:'skbn_25_bn_warmup',
    label:'25節 暖身 SKBN',
    tokens:['SKBN','SKBN_APP','SKBN_PC'],
    targets:[APP_ID,PC_ID,'SKBN_APP','SKBN_PC'],
    priority:20,
    legacyPresetOptional:true,
    templateType:'skbn_25_bn_warmup',
    titleHeaderNames:['文案'],
    titleMirrorField:'文案',
    outputPrefix:outputPrefix,
    outputIncludeExposure:false,
    templateAssetFolder:assetFolder,
    productAssetFolder:PRODUCT_FOLDER,
    // Physical smart identity is still folder + filename; this identity only stabilizes each placement baseline.
    smartAssetIdentity:assetFolder,
    priceLayoutKeys:[APP_ID,'SKBN_APP',PC_ID,'SKBN_PC'],
    createBasePriceLayout:function(){
      return {
        fontSizeRatio:provisionalPriceRatio,
        widthRatio:provisionalWidthRatio,
        useLayoutFontSize:true,
        anchorRatioX:0.5,
        anchorRatioY:0.5,
      };
    },
    mainCenterX:mainCenterX,
    mainGroupGap:6,
    fontSizes:{},
    layerKeys:{
      titlePlain:'文案',
      vipLogo:'蝦皮VIP_LOGO',
      vipTitle:'蝦皮VIP_文案',
      directLogo:'__SKBN_UNUSED_DIRECT_LOGO__',
      directTitle:'__SKBN_UNUSED_DIRECT_TITLE__',
      subtitle:'__SKBN_UNUSED_SUBTITLE__',
      vipSubtitleLogo:'__SKBN_UNUSED_VIP_SUBTITLE_LOGO__',
      vipSubtitle:'__SKBN_UNUSED_VIP_SUBTITLE__',
      protect:'__SKBN_UNUSED_PROTECT__',
      subBg:'__SKBN_UNUSED_SUB_BG__',
      subFrame:'__SKBN_UNUSED_SUB_FRAME__',
      ctaText:'__SKBN_UNUSED_CTA_TEXT__',
      ctaBg:'__SKBN_UNUSED_CTA_BG__',
      ctaTri:'__SKBN_UNUSED_CTA_TRI__',
    },
    enableDirectVariant:false,
    requiredFields:['文案','商品圖1'],
    requireProductAsset:true,
    imageCtaValues:[],
  });

  var baseBefore=rule.rules.beforeApplyRecordToTemplate;
  rule.rules.beforeApplyRecordToTemplate=function(args){
    rememberBaseline(args.template);
    applyFixedAssets(args.template);
    return baseBefore(args);
  };

  var baseAfter=rule.rules.afterApplyRecordToTemplate;
  rule.rules.afterApplyRecordToTemplate=function(args){
    baseAfter(args);
    applyFixedAssets(args.template);
    applyAppVariantVisibility(args.template,args.record);
    applyPcVariant(args.template,args.record,args.helpers || {});
  };

  var baseTextChanged=rule.rules.onTextChanged;
  rule.rules.onTextChanged=function(args){
    if (typeof baseTextChanged==='function') baseTextChanged(args);
    var record=args.template && args.template.batchRecord || {};
    applyPcVariant(args.template,record,args.helpers || {});
  };

  // CTA is a fixed image for both SKBN templates. Excel CTA is intentionally ignored.
  rule.rules.ctaPolicy={mode:'rule-managed',imageValues:[],fallbackToText:false};
  rule.rules.resolveRecordTemplateRoute=resolveRecordTemplateRoute;

  window.TemplateRuleRegistry.register('skbn_25_bn_warmup',rule);
  window.__SKBN_RULE_VERSION='2026-08-10c｜SKBN校正Preset＋PC文案固定左對齊x17＋共用雙色價格語意';
})();
