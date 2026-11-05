/* SinDarealest source-to-destination motion.
 * Motion is strictly composited transforms on inner surfaces. Never animate
 * opacity/backdrop-filter on the product detail overlay glass plane.
 * Every exit has a synchronous fallback for reduced motion/navigation.
 */
(()=>{
'use strict';
const EASE='cubic-bezier(.25,.65,.3,1)',DURATION=350;
const adjustedMs=requested=>Math.max(285,Math.min(375,Math.round(requested*.70)));
const origins=new Map(),running=new Map();
let lastInteraction=null;
function rectOf(input){
 let node=input;
 if(input?.target)node=input.target;
 if(typeof node==='string')node=document.querySelector(node);
 if(node?.nodeType===3)node=node.parentElement;
 // Body is not a legitimate launch surface for a card/drawer.
 if(node===document.body||node===document.documentElement)return null;
 if(node instanceof Element){
  const r=node.getBoundingClientRect();
  if(r.width>2&&r.height>2)return{left:r.left,top:r.top,width:r.width,height:r.height,element:node};
 }
 if(node&&Number.isFinite(node.left)&&Number.isFinite(node.top)&&node.width>2&&node.height>2)
  return{left:node.left,top:node.top,width:node.width,height:node.height,element:node.element||null};
 return null;
}
function selectTrigger(node){
 if(!(node instanceof Element))return null;
 const product=node.closest('[data-open-product],[data-favorite-open],.product-card');
 if(product)return product;
 const zoom=node.closest('#detailMainImage,#detailZoom,.detail-image-stage');
 if(zoom)return document.querySelector('#detailMainImage')||zoom;
 return node.closest('[data-action],button,a,[role="button"],[data-product-tab],summary')||node;
}
function freshSource(){
 return lastInteraction&&performance.now()-lastInteraction.at<1200?lastInteraction.source:null;
}
document.addEventListener('pointerdown',event=>{
 if(event.button!==undefined&&event.button!==0)return;
 const node=selectTrigger(event.target);
 lastInteraction={source:rectOf(node),at:performance.now()};
},{capture:true,passive:true});
document.addEventListener('click',event=>{
 if(!lastInteraction||performance.now()-lastInteraction.at>850)
  lastInteraction={source:rectOf(selectTrigger(event.target)),at:performance.now()};
},true);
function reduced(){
 return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function resolvedOrigin(candidate){
 return rectOf(candidate)||freshSource();
}
function currentRect(src,preferSnapshot=false){
 if(!src)return null;
 // The captured rectangle is authoritative when OPENING. The trigger can
 // disappear as soon as the previous drawer is dismissed (Cart -> Checkout).
 const saved=rectOf(src);
 if(preferSnapshot&&saved)return saved;
 const node=src.element;
 if(node instanceof Element&&node.isConnected){
  const live=rectOf(node);
  if(live&&getComputedStyle(node).visibility!=='hidden'&&
     live.left<innerWidth&&live.top<innerHeight&&
     live.left+live.width>0&&live.top+live.height>0)return live;
 }
 // When the old card scrolled away or is behind a hidden drawer, retract
 // to the actual tap position instead of chasing its offscreen new geometry.
 return saved;
}
function getSurface(surface){
 return typeof surface==='string'?document.querySelector(surface):surface;
}
// The detail's glass is a ::before sibling of its content. Clipping only
// .detail-modal leaves a full-screen glass sheet behind a tiny card (owner
// screenshot). Clip the WHOLE visual plane so glass and contents grow together.
function animationSurface(key,surface){
 const actual=getSurface(surface);
 if(key==='product-detail')return document.querySelector('#productOverlay')||actual;
 if(key==='full-gallery')return document.querySelector('#sdFullscreenViewer')||actual;
 return actual;
}
function cancel(key){
 const active=running.get(key);
 if(!active)return;
 running.delete(key);
 try{active.animation?.cancel()}catch{}
 try{active.cleanup?.()}catch{}
}
function resetStyle(surface,snapshot){
 if(!surface)return;
 surface.style.transition=snapshot.transition;
 surface.style.transform=snapshot.transform;
 surface.style.clipPath=snapshot.clipPath;
 surface.style.willChange=snapshot.willChange;
}
// Move ONLY the image, never the text or glass. The ghost is a transient,
// aria-hidden img outside the clipped dialog. Its uniform scale keeps pixels
// proportional even when the card and detail have different aspect ratios.
function imageMorph(key,reverse,duration){
 if(key!=='product-detail'&&key!=='full-gallery')return null;
 const source=origins.get(key)?.element;
 const sourceImage=source?.tagName==='IMG'?source:source?.querySelector?.('img');
 const targetImage=document.querySelector(key==='product-detail'?'#detailMainImage':'#sdFullscreenImage');
 if(!(sourceImage instanceof HTMLImageElement)||!(targetImage instanceof HTMLImageElement))return null;
 if(!sourceImage.isConnected||!targetImage.isConnected)return null;
 const from=rectOf(sourceImage),to=rectOf(targetImage);
 if(!from||!to)return null;
 const asset=(reverse?targetImage:sourceImage).currentSrc||
   (reverse?targetImage:sourceImage).src||targetImage.src;
 if(!asset)return null;
 const ghost=document.createElement('img');
 ghost.className='sd-shared-image-clone';
 ghost.alt='';ghost.setAttribute('aria-hidden','true');ghost.draggable=false;
 ghost.decoding='async';ghost.src=asset;
 ghost.style.cssText='position:fixed;pointer-events:none;user-select:none;z-index:2147482000;'+
  'object-fit:contain;object-position:center;transform-origin:center center;'+
  'will-change:transform;left:'+to.left+'px;top:'+to.top+'px;'+
  'width:'+to.width+'px;height:'+to.height+'px';
 const dx=(from.left+from.width/2)-(to.left+to.width/2);
 const dy=(from.top+from.height/2)-(to.top+to.height/2);
 const ratio=Math.max(.06,Math.min(2.5,Math.min(from.width/to.width,from.height/to.height)));
 const compact='translate3d('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px,0) scale('+ratio.toFixed(5)+')';
 const frames=reverse?[{transform:'none'},{transform:compact}]:
    [{transform:compact},{transform:'none'}];
 const opacityBefore=targetImage.style.opacity;
 targetImage.style.opacity='0';
 document.body.append(ghost);
 const animation=ghost.animate(frames,{duration,easing:EASE,fill:'both'});
 let cleaned=false;
 const cleanup=()=>{
  if(cleaned)return;cleaned=true;
  animation.cancel();ghost.remove();
  targetImage.style.opacity=opacityBefore;
 };
 return{animation,cleanup};
}

// The content keeps its FULL native dimensions. Only a rounded viewing aperture
// expands. No scaleX/scaleY; photos and text are never stretched or compressed.
// The aperture is anchored at the selected card's genuine viewport position.
function aperture(source,target){
 const cx=source.left+source.width/2-target.left;
 const cy=source.top+source.height/2-target.top;
 const w=Math.max(12,Math.min(source.width,target.width*.65));
 const h=Math.max(12,Math.min(source.height,target.height*.65));
 const left=Math.max(0,Math.min(target.width-w,cx-w/2));
 const top=Math.max(0,Math.min(target.height-h,cy-h/2));
 const right=target.width-left-w,bottom=target.height-top-h;
 return 'inset('+top.toFixed(2)+'px '+right.toFixed(2)+'px '+bottom.toFixed(2)+'px '+left.toFixed(2)+'px round 19px)';
}
function animateBetween(key,surface,sourceRect,destinationRect,reverse,done,requestedMs=DURATION){
 const el=animationSurface(key,surface);
 if(!el||typeof el.animate!=='function'||reduced()||!sourceRect||!destinationRect)return false;
 const a=sourceRect,b=destinationRect;
 if(!(b.width>0&&b.height>0&&a.width>0&&a.height>0))return false;
 cancel(key);
 const prev={transition:el.style.transition,transform:el.style.transform,clipPath:el.style.clipPath,willChange:el.style.willChange};
 // Override any slide or scale only while the aperture runs. The original
 // classes and their Liquid Glass material are restored unchanged afterward.
 el.style.transition='none';el.style.transform='none';el.style.clipPath='none';el.style.willChange='clip-path';
 const mask=aperture(a,b);
 const full='inset(0px 0px 0px 0px round 19px)';
 const frames=reverse?[{clipPath:full},{clipPath:mask}]:[{clipPath:mask},{clipPath:full}];
 const animation=el.animate(frames,{duration:adjustedMs(requestedMs),easing:EASE,fill:'both'});
 const record={animation,onFinish:done,mode:reverse?'out':'in',cleanup:null};
 let cleaned=false;
 const cleanup=()=>{
  if(cleaned)return;cleaned=true;
  if(running.get(key)?.animation===animation)running.delete(key);
  resetStyle(el,prev);
  record.imageCleanup?.();
 };
 record.cleanup=cleanup;running.set(key,record);
 const image=imageMorph(key,reverse,adjustedMs(requestedMs));
 if(image){record.imageAnimation=image.animation;record.imageCleanup=image.cleanup}
 animation.addEventListener('finish',()=>{
  try{record.onFinish?.()}finally{animation.cancel();cleanup()}
 },{once:true});
 animation.addEventListener('cancel',cleanup,{once:true});
 return true;
}
function open(key,surface,source,ms=DURATION){
 const el=animationSurface(key,surface);if(!el)return false;
 const origin=resolvedOrigin(source);
 if(origin)origins.set(key,origin);
 const active=running.get(key);
 if(active?.mode==='out'&&active.animation?.playState==='running'){
  active.onFinish=null;active.mode='in';active.animation.reverse();active.imageAnimation?.reverse();return true;
 }
 cancel(key);
 const previousTransition=el.style.transition,previousTransform=el.style.transform;
 el.style.transition='none';el.style.transform='none';
 const target=rectOf(el);
 el.style.transition=previousTransition;el.style.transform=previousTransform;
 const actual=origins.get(key);
 return animateBetween(key,el,currentRect(actual,true)||actual,target,false,null,ms);
}
function close(key,surface,done,source,ms=DURATION){
 const el=animationSurface(key,surface);
 if(!el||reduced()){cancel(key);return false}
 const active=running.get(key);
 if(active?.mode==='in'&&active.animation?.playState==='running'){
  active.onFinish=done;active.mode='out';active.animation.reverse();active.imageAnimation?.reverse();return true;
 }
 const endOrigin=rectOf(source)||origins.get(key)||freshSource();
 const destination=currentRect(endOrigin);
 const from=rectOf(el);
 if(!destination||!from){cancel(key);return false}
 return animateBetween(key,el,destination,from,true,done,ms);
}
function popOrigin(key){origins.delete(key)}
function hasOrigin(key){return origins.has(key)}
function sourceFromLast(){return freshSource()}
document.documentElement.classList.add('sd-shared-motion');
window.SDSharedMotion={open,close,cancel,popOrigin,hasOrigin,sourceFromLast,rectOf,easing:EASE,duration:DURATION,adjustedMs};
})();
