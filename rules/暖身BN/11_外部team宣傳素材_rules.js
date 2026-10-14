/* 11_外部team宣傳素材
 * HBN-family warmup layout with left-aligned copy area.
 * Shared behavior: Excel parser, text/VIP parsing, product/price resolver and asset fallback
 * come from WarmupBannerRuleFactory. VIP subtitle background geometry is owned here only.
 */
(function registerExternalTeamWarmupRule(){
  'use strict';

  var LEFT_X = 98;
  function unused(name){ return '__EXTERNAL_UNUSED_' + name + '__'; }
  function round2(v){ return Math.round(Number(v || 0) * 100) / 100; }
  function layer(template,key){ return template && template.layers ? template.layers[key] || null : null; }
  function textWidth(target,helpers){
    if(!target || target.hidden) return 0;
    // Must match Renderer.drawText(), including textStyleRanges (82% symbols).
    // The generic measureTextWidth only measures the base font and can diverge from
    // the actual pixels painted by drawStyledTextLine().
    var renderedMeasure=helpers && helpers.measureRenderedTextWidth;
    var genericMeasure=helpers && helpers.measureTextWidth;
    var value=typeof renderedMeasure==='function'
      ? renderedMeasure(target)
      : (typeof genericMeasure==='function' ? genericMeasure(target) : target.width);
    return Math.max(0, Number(value) || 0);
  }
  function applyTextRanges(target,text){
    if(!target) return;
    var standard=window.SPTextStandard;
    var fontSize=Number(target.fontSizePx || target.fontSizePt || 0);
    if(standard && typeof standard.titleRanges==='function' && fontSize>0){
      var ranges=standard.titleRanges(text,fontSize,{color:target.color || '#FFFFFF',smallBaselineOffset:0});
      if(typeof standard.isDualSize==='function' && standard.isDualSize(ranges)){
        target.textStyleRanges=ranges;
        target.styledTextVerticalAlign='source-baseline';
        return;
      }
    }
    if(target.textStyleRanges) delete target.textStyleRanges;
  }

  function setTextLayer(target,text,helpers,leftX){
    if(!target) return 0;
    var sourceWidth=Math.max(0,Number(target.width)||0);
    target.hidden=false;
    target.text=String(text || '');
    target.align='left';
    target.textVerticalAlign='source-baseline';
    applyTextRanges(target,target.text);
    var measuredWidth=Math.max(0,Number(textWidth(target,helpers))||0);
    // The layer box must describe the pixels Renderer will actually paint.  For the
    // VIP subtitle this is essential because the background is derived from this box.
    // Fall back to the calibrated JSON width only when runtime measurement is unavailable.
    var width=measuredWidth || sourceWidth;
    target.width=round2(width);
    target.x=round2(leftX);
    target.centerX=round2(leftX+width/2);
    return width;
  }

  function rebuildVipSubtitleBackground(bg,groupLeft,groupRight){
    if(!bg) return;
    var padding=20;
    var left=round2(groupLeft-padding);
    var right=round2(groupRight+padding);
    var width=Math.max(1,round2(right-left));
    var height=Math.max(1,Number(bg.height)||69);
    var y=Number(bg.y)||0;
    var centerY=Number(bg.centerY);
    if(!isFinite(centerY)) centerY=y+height/2;

    // This is a Rule-managed dynamic layer. Horizontal manual values from an edited
    // output must never override the content-driven width rule. Keep Y manual state only.
    if(bg.__manualOverrides){
      ['x','width','centerX','shape.vectorPath','shape.bezierPoints','shape.pathBounds'].forEach(function(key){ delete bg.__manualOverrides[key]; });
    }

    var pointWidth=Math.min(Math.round(height*0.29),Math.floor(width/2));
    var corners=[
      {x:left+pointWidth,y:y},
      {x:right-pointWidth,y:y},
      {x:right,y:centerY},
      {x:right-pointWidth,y:y+height},
      {x:left+pointWidth,y:y+height},
      {x:left,y:centerY}
    ];
    var vectorPath=corners.map(function(point){
      return {anchor:{x:round2(point.x),y:round2(point.y)},leftDirection:{x:round2(point.x),y:round2(point.y)},rightDirection:{x:round2(point.x),y:round2(point.y)}};
    });
    var fill=bg.fill || bg.shape && bg.shape.fill || '#113366';

    bg.hidden=false;
    bg.x=left;
    bg.width=width;
    bg.centerX=round2((left+right)/2);
    bg.centerY=round2(centerY);
    bg.type='shape';
    bg.useDynamicBounds=true;
    bg.shape=bg.shape||{};
    bg.shape.kind='path';
    bg.shape.fill=fill;
    bg.fill=fill;
    bg.shape.vectorPath=vectorPath;
    bg.shape.bezierPoints=vectorPath.map(function(point){ return JSON.parse(JSON.stringify(point)); });
    // Keep renderer metadata consistent with the actual painted path.  Never retain
    // Photoshop's old pathBounds/geometry because those belong to another width.
    bg.shape.pathBounds={x:left,y:round2(y),width:width,height:round2(height),centerX:bg.centerX,centerY:bg.centerY};
    if(bg.shape.geometry){ try{ delete bg.shape.geometry; }catch(_error){} }
  }

  function applyExternalTeamMode(template,record,helpers){
    var titleRaw=String(record && record['主標'] || '').trim();
    var subtitleRaw=String(record && record['副標'] || '').trim();
    var useVip=/^\s*vip/i.test(subtitleRaw);

    var plainTitle=layer(template,'title');
    var vipTitle=layer(template,'蝦皮VIP_主標題');
    var vipLogo=layer(template,'蝦皮VIP_LOGO');
    var plainSub=layer(template,'subtitle');
    var vipSub=layer(template,'蝦皮VIP_副標題_右');
    var protect=layer(template,'保護文字');
    var bg=layer(template,'副標題_底色');

    // Default state: VIP-only layers are hidden until subtitle explicitly selects VIP mode.
    [vipTitle,vipLogo,vipSub,bg].forEach(function(target){ if(target) target.hidden=true; });

    if(useVip){
      if(plainTitle) plainTitle.hidden=true;
      if(plainSub) plainSub.hidden=true;

      setTextLayer(vipTitle,titleRaw,helpers,LEFT_X);

      var subtitleText=subtitleRaw.replace(/^\s*vip\s*/i,'');
      var logoWidth=Number(vipLogo && vipLogo.width)||0;
      var gap=4; // JSON baseline: logo -> VIP subtitle text = 4px
      if(vipLogo){
        vipLogo.hidden=false;
        vipLogo.x=LEFT_X;
        vipLogo.centerX=round2(LEFT_X+logoWidth/2);
      }
      setTextLayer(vipSub,subtitleText,helpers,LEFT_X+logoWidth+gap);

      // IMPORTANT: derive the VIP subtitle group from the FINAL layer bounds, not from
      // Canvas text measurement. This guarantees the background can never become shorter
      // than the visible Logo + right-text group after Photoshop textTransform is applied.
      var logoLeft=Number(vipLogo && vipLogo.x)||LEFT_X;
      var logoRight=logoLeft+(Number(vipLogo && vipLogo.width)||0);
      var subLeft=Number(vipSub && vipSub.x)||logoRight+gap;
      var subRight=subLeft+(Number(vipSub && vipSub.width)||0);
      var groupLeft=Math.min(logoLeft,subLeft);
      var groupRight=Math.max(logoRight,subRight);
      if(bg){
        // Single source of truth: FINAL visible VIP group bounds + 20px on both sides.
        // Rebuild a fresh hexagon; never scale a Photoshop-exported path whose own
        // path bounds can be offset from layer.x / layer.width.
        rebuildVipSubtitleBackground(bg,groupLeft,groupRight);
      }
    }else{
      if(plainTitle){
        plainTitle.hidden=false;
        setTextLayer(plainTitle,titleRaw,helpers,LEFT_X);
      }
      if(plainSub){
        plainSub.hidden=false;
        setTextLayer(plainSub,subtitleRaw,helpers,LEFT_X);
      }
      [vipTitle,vipLogo,vipSub,bg].forEach(function(target){ if(target) target.hidden=true; });
    }

    if(protect && !protect.hidden){
      protect.align='left';
      protect.x=LEFT_X;
      protect.centerX=round2(LEFT_X+(Number(protect.width)||0)/2);
    }
  }

  var rule=window.WarmupBannerRuleFactory.createRule({
    ruleKey:'external_team_25_warmup',
    label:'25節 外部team宣傳素材',
    tokens:['外部team宣傳素材'],
    targets:['11_外部team宣傳素材_1125x360','11_外部team宣傳素材_1200x360','外部team宣傳素材_1125x360','外部team宣傳素材_1200x360'],
    priority:50,
    legacyPresetOptional:true,
    templateType:'external_team_25_warmup',
    outputPrefix:'11_外部team宣傳素材',
    outputIncludeExposure:true,
    templateAssetFolder:'11_外部team宣傳素材',
    productAssetFolder:'共用素材',
    smartAssetIdentity:function(template){ return template && template.canvas && template.canvas.templateId || template && template.templateId || '11_外部team宣傳素材'; },
    priceLayoutKeys:['11_外部team宣傳素材_1125x360','11_外部team宣傳素材_1200x360'],
    mainCenterX:300,
    subtitleCenterX:300,
    mainGroupGap:9,
    subtitleGroupGap:5,
    vipSubtitleSplit:true,
    enableDirectVariant:false,
    blockParserValidateWarmupExposure:false,
    hideCtaWhenBlank:true,
    imageCtaValues:[],
    fontSizes:{},
    layerKeys:{
      titlePlain:'title', vipLogo:'蝦皮VIP_LOGO', vipTitle:'蝦皮VIP_主標題',
      directLogo:unused('DIRECT_LOGO'), directTitle:unused('DIRECT_TITLE'),
      subtitle:'subtitle', vipSubtitleLogo:'蝦皮VIP_LOGO', vipSubtitle:'蝦皮VIP_副標題_右',
      protect:'保護文字', subBg:unused('SUB_BG_FACTORY'), subFrame:unused('SUBFRAME'),
      ctaText:unused('CTA_TEXT'), ctaBg:unused('CTA_BG'), ctaTri:unused('CTA_TRI')
    }
  });

  var baseAfter=rule.rules.afterApplyRecordToTemplate;
  rule.rules.afterApplyRecordToTemplate=function(args){ baseAfter(args); applyExternalTeamMode(args.template,args.record||{},args.helpers||{}); };
  var baseChanged=rule.rules.onTextChanged;
  rule.rules.onTextChanged=function(args){ if(typeof baseChanged==='function') baseChanged(args); applyExternalTeamMode(args.template,args.template && args.template.batchRecord || {},args.helpers||{}); };
  rule.rules.ctaPolicy={mode:'rule-managed',imageValues:[],fallbackToText:false};
  rule.rules.resolveRecordTemplateRoutes=function(){
    return ['11_外部team宣傳素材_1125x360','11_外部team宣傳素材_1200x360'].map(function(id){
      return {key:'external_team_25_warmup',family:'external_team_25_warmup',label:id,templateId:id,templateFile:id+'.json',outputPrefix:id,multiOutput:true};
    });
  };
  rule.multiOutput=true;
  window.TemplateRuleRegistry.register('external_team_25_warmup',rule);
  window.__EXTERNAL_TEAM_RULE_VERSION='2026-08-11e｜外部team副標底色單一Writer＋Final Render Bounds＋左右20px';
})();
