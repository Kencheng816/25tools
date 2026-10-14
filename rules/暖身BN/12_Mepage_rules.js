/* 12_Mepage
 * Two mutually-exclusive modes driven by Excel「Mepage案型」:
 * - one Unicode character: Mepage_案型 + Mepage_底色
 * - otherwise: P loads the full field name as asset
 *   - 禮物盒icon: Mepage禮物_底色
 *   - all other icons: Mepage_底色
 */
(function registerMepageRule(){
  'use strict';
  function trim(v){ return String(v == null ? '' : v).replace(/_x000d_/gi,'\n').trim(); }
  function pad2(v){ var n=parseInt(v,10); return Number.isFinite(n)?String(n).padStart(2,'0'):''; }
  function unicodeLength(v){ return Array.from(trim(v)).length; }
  function hide(layer){ if(layer) layer.hidden=true; }
  function show(layer){ if(layer) layer.hidden=false; }
  function findAsset(name,template,layer){
    var bm=window.BatchManager; if(!bm || typeof bm.findAssetFilename!=='function') return null;
    var folders=['12_Mepage','Mepage','共用素材'];
    for(var i=0;i<folders.length;i+=1){
      var hit=bm.findAssetFilename(name,{project:folders[i],template:template,layer:layer,layerKey:'Mepage案型'});
      if(hit) return {filename:hit.filename||hit.name||hit,project:hit.folder||folders[i]};
    }
    return null;
  }
  function blockParser(ctx){
    var rows=ctx.rows||[], header=ctx.header||{}, hr=Number(header.headerRow||0), head=rows[hr]||[];
    var norm=function(v){return trim(v).toLowerCase().replace(/[\s\u00a0\u3000\t\r\n_\-+()（）\[\]【】.]+/g,'');};
    function col(test){ for(var i=0;i<head.length;i+=1) if(test(norm(head[i]))) return i; return -1; }
    var cNo=col(function(n){return n==='備註';}), cCode=col(function(n){return n==='編號';}), cExp=col(function(n){return n==='曝光';}), cCase=col(function(n){return n.indexOf('mepage案型')===0;});
    var start=Number(ctx.rowIndex||hr+1), end=Number(ctx.nextHeaderRow||rows.length), out=[];
    for(var r=start;r<end;r+=1){
      var row=rows[r]||[], no=trim(row[cNo]), caseValue=trim(row[cCase]), exp=trim(row[cExp]), code=trim(row[cCode]);
      if(!caseValue || !Number.isFinite(Number(no))) continue;
      out.push({'Mepage案型':caseValue,'__曝光':exp,'__備註No':no,'__編號':code,'__sourceRow':r+1,'__sourceName':trim(ctx.productName||'Mepage')});
    }
    return out.length?{records:out,templateType:'mepage_25_warmup'}:null;
  }
  function createVariantRecords(record){
    var v=Object.assign({},record), seq=pad2(record&&record.__備註No), exp=trim(record&&record.__曝光)||'暖身';
    v.__outputName='12_Mepage_'+exp+'_'+seq; v.__outputSuffix=seq; return [v];
  }
  function beforeApplyRecordToTemplate(args){
    var template=args.template; if(!template) return;
    template.smartAssetPolicy=Object.assign({},template.smartAssetPolicy,{productTransformIdentity:'12_Mepage'});
  }
  function afterApplyRecordToTemplate(args){
    var template=args.template, record=args.record||template&&template.batchRecord||{}; if(!template||!template.layers)return;
    var value=trim(record['Mepage案型']);
    var product=template.layers.product, giftBg=template.layers['Mepage禮物_底色'], text=template.layers['Mepage_案型'], textBg=template.layers['Mepage_底色'];
    var single=unicodeLength(value)===1;
    if(single){
      show(text); show(textBg); hide(product); hide(giftBg);
      if(text) text.text=value;
      return;
    }
    hide(text); show(product);
    var isGiftBox = value === '禮物盒icon';
    if(isGiftBox){ hide(textBg); show(giftBg); }
    else { show(textBg); hide(giftBg); }
    if(!product) return;
    product.role='商品圖1'; product.keepAspectRatio=true;
    var hit=findAsset(value,template,product);
    if(hit){ product.assetFilename=hit.filename; product.assetProject=hit.project; product.__assetMissing=false; }
    else { product.assetFilename=value; product.assetProject='12_Mepage'; product.__assetMissing=true; }
  }
  window.TemplateRuleRegistry.register('mepage_25_warmup',{
    label:'25節 Mepage',tokens:['Mepage','ME PAGE','Mepage Circle'],targets:['12_Mepage'],legacyPresetOptional:true,priority:30,dynamicLayout:false,
    rules:{blockParser:blockParser,createVariantRecords:createVariantRecords,beforeApplyRecordToTemplate:beforeApplyRecordToTemplate,afterApplyRecordToTemplate:afterApplyRecordToTemplate,ctaPolicy:{mode:'rule-managed',imageValues:[],fallbackToText:false}}
  });
  window.__MEPAGE_RULE_VERSION='2026-08-11b｜禮物盒icon專用禮物底色＋其他案型使用Mepage底色';
})();
