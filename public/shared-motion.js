/* SinDarealest source-to-destination motion.
 * Motion is strictly composited transforms on inner surfaces. Never animate
 * opacity/backdrop-filter on the product detail overlay glass plane.
 * Every exit has a synchronous fallback for reduced motion/navigation.
 */
(()=>{
'use strict';
const EASE='cubic-bezier(.42,0,.58,1)',DURATION=490;
const origins=new Map(),running=new Map();
let lastInteraction=null;
function rectOf(input){
 let node=input;
 if(input?.target)node=input.target;
 if(typeof node==='string')node=document.querySelector(node);
 if(node?.nodeType===3)node=node.parentElement;
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
 if(performance.now()-(lastInteraction?.at??-1)>850)
  lastInteraction={source:rectOf(selectTrigger(event.target)),at:performance.now()};
},true);
function reduced(){
 return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
function resolvedOrigin(candidate){
 return rectOf(candidate)||freshSource();
}
function currentRect(src){
 if(!src)return null;
 return rectOf(src.element)||rectOf(src);
}
function getSurface(surface){
 return typeof surface==='string'?document.querySelector(surface):surface;
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
 surface.style.transformOrigin=snapshot.transformOrigin;
 surface.style.willChange=snapshot.willChange;
}
function animateBetween(key,surface,sourceRect,destinationRect,reverse,done,ms=DURATION){
 const el=getSurface(surface);
 if(!el||typeof el.animate!=='function'||reduced()||!sourceRect||!destinationRect){
  done?.();return false;
 }
 const a=sourceRect,b=destinationRect;
 if(!(b.width>0&&b.height>0&&a.width>0&&a.height>0)){
  done?.();return false;
 }
 cancel(key);
 const prev={transition:el.style.transition,transform:el.style.transform,transformOrigin:el.style.transformOrigin,willChange:el.style.willChange};
 el.style.transition='none';el.style.transform='none';el.style.transformOrigin='0 0';el.style.willChange='transform';
 const dx=Math.max(-innerWidth*2,Math.min(innerWidth*2,a.left-b.left));
 const dy=Math.max(-innerHeight*2,Math.min(innerHeight*2,a.top-b.top));
 const sx=Math.max(.07,Math.min(2.2,a.width/b.width));
 const sy=Math.max(.07,Math.min(2.2,a.height/b.height));
 const start='translate3d('+dx+'px,'+dy+'px,0) scale('+sx+','+sy+')';
 const frames=reverse?[{transform:'none'},{transform:start}]:[{transform:start},{transform:'none'}];
 // Pure transforms are GPU-compositable; nothing waits on image decode or network.
 const animation=el.animate(frames,{duration:ms,easing:EASE,fill:'both'});
 let cleaned=false;
 const cleanup=()=>{
  if(cleaned)return;cleaned=true;
  if(running.get(key)?.animation===animation)running.delete(key);
  resetStyle(el,prev);
 };
 running.set(key,{animation,cleanup});
 animation.addEventListener('finish',()=>{
  // Complete the visibility change synchronously with removing fill:both.
  try{done?.()}finally{animation.cancel();cleanup()}
 },{once:true});
 animation.addEventListener('cancel',cleanup,{once:true});
 return true;
}
function open(key,surface,source,ms=DURATION){
 const el=getSurface(surface);if(!el)return false;
 cancel(key);
 const origin=resolvedOrigin(source);
 if(origin)origins.set(key,origin);
 // Force the final layout now; the next frame begins the FLIP transform.
 const previousTransition=el.style.transition,previousTransform=el.style.transform;
 el.style.transition='none';el.style.transform='none';
 const target=rectOf(el);
 el.style.transition=previousTransition;el.style.transform=previousTransform;
 const actual=origins.get(key);
 return animateBetween(key,el,currentRect(actual)||actual,target,false,null,ms);
}
function close(key,surface,done,source,ms=DURATION){
 const el=getSurface(surface);
 if(!el||reduced()){cancel(key);return false}
 const endOrigin=rectOf(source)||origins.get(key)||freshSource();
 const destination=currentRect(endOrigin);
 const from=rectOf(el);
 if(!destination||!from){cancel(key);return false}
 return animateBetween(key,el,destination,from,true,done,ms);
}
function popOrigin(key){origins.delete(key)}
function hasOrigin(key){return origins.has(key)}
function sourceFromLast(){return freshSource()}
window.SDSharedMotion={open,close,cancel,popOrigin,hasOrigin,sourceFromLast,rectOf,easing:EASE,duration:DURATION};
})();
