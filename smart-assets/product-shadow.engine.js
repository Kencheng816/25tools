(() => {
  'use strict';
  const defaults = Object.freeze({
    anchor: { alphaThreshold: 24, groundBandRatio: 0.05 },
    shadow: { color:'#901e0e', opacity:.8, blur:3, skewX:-.5, scaleX:.95, scaleY:.45, offsetX:0, offsetY:2, gradientStart:.85, gradientEnd:1.1 }
  });
  const bounds=(data,w,h,t=1)=>{let l=w,r=-1,top=h,b=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(data[(y*w+x)*4+3]<=t)continue;l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);b=Math.max(b,y)}return r<l?null:{left:l,right:r,top,bottom:b}};
  function hasTransparency(image){const w=Math.max(1,image.naturalWidth||image.width),h=Math.max(1,image.naturalHeight||image.height),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,w,h);const d=x.getImageData(0,0,w,h).data;for(let i=3;i<d.length;i+=4)if(d[i]<250)return true;return false}
  function generate(image, renderedWidth, renderedHeight, settings={}){
    const cfg={...defaults.shadow,...settings},w=Math.max(1,Math.round(renderedWidth)),h=Math.max(1,Math.round(renderedHeight));
    const src=document.createElement('canvas');src.width=w;src.height=h;const sx=src.getContext('2d',{willReadFrequently:true});sx.imageSmoothingQuality='high';sx.drawImage(image,0,0,w,h);const id=sx.getImageData(0,0,w,h),ob=bounds(id.data,w,h,defaults.anchor.alphaThreshold);if(!ob)throw Error('找不到商品有效像素');
    const band=Math.max(2,Math.round((ob.bottom-ob.top+1)*defaults.anchor.groundBandRatio)),start=Math.max(ob.top,ob.bottom-band+1);let gl=w,gr=-1,gb=ob.bottom;for(let y=start;y<=ob.bottom;y++)for(let x=ob.left;x<=ob.right;x++)if(id.data[(y*w+x)*4+3]>defaults.anchor.alphaThreshold){gl=Math.min(gl,x);gr=Math.max(gr,x);gb=Math.max(gb,y)}if(gr<gl){gl=ob.left;gr=ob.right}
    const pivot={x:(gl+gr)/2,y:gb},pad=Math.ceil(Math.max(w,h)*1.5+cfg.blur*4),stage=document.createElement('canvas');stage.width=w+pad*2;stage.height=h+pad*2;const st=stage.getContext('2d');
    const sil=document.createElement('canvas');sil.width=stage.width;sil.height=stage.height;const si=sil.getContext('2d');si.drawImage(src,pad,pad);si.globalCompositeOperation='source-in';si.fillStyle=cfg.color;si.fillRect(0,0,sil.width,sil.height);
    const tr=document.createElement('canvas');tr.width=stage.width;tr.height=stage.height;const tx=tr.getContext('2d'),px=pad+pivot.x,py=pad+pivot.y;tx.save();tx.translate(px+cfg.offsetX,py+cfg.offsetY);tx.transform(cfg.scaleX,0,cfg.skewX,cfg.scaleY,0,0);tx.translate(-px,-py);tx.drawImage(sil,0,0);tx.restore();
    st.save();st.globalAlpha=cfg.opacity;st.filter=`blur(${cfg.blur}px)`;st.drawImage(tr,0,0);st.restore();const gs=pad+ob.top+(ob.bottom-ob.top)*cfg.gradientStart,ge=pad+ob.top+(ob.bottom-ob.top)*cfg.gradientEnd;st.globalCompositeOperation='destination-in';const g=st.createLinearGradient(0,gs,0,Math.max(gs+1,ge));g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');st.fillStyle=g;st.fillRect(0,0,stage.width,stage.height);st.globalCompositeOperation='source-over';
    const out=st.getImageData(0,0,stage.width,stage.height),bb=bounds(out.data,stage.width,stage.height,1);if(!bb)throw Error('陰影產生失敗');const ep=Math.max(4,Math.ceil(cfg.blur*2)),l=Math.max(0,bb.left-ep),t=Math.max(0,bb.top-ep),r=Math.min(stage.width-1,bb.right+ep),b=Math.min(stage.height-1,bb.bottom+ep),oc=document.createElement('canvas');oc.width=r-l+1;oc.height=b-t+1;oc.getContext('2d').drawImage(stage,l,t,oc.width,oc.height,0,0,oc.width,oc.height);
    return {dataUrl:oc.toDataURL('image/png'),localX:l-pad,localY:t-pad,width:oc.width,height:oc.height};
  }
  window.ProductShadowEngine={defaults:JSON.parse(JSON.stringify(defaults)),hasTransparency,generate};
})();
