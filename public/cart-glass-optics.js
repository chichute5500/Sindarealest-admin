/* SinDarealest cart optical lens.
 * Chrome's nested backdrop root may leave scrolling product text sharp despite
 * backdrop-filter on sticky bars. Blur the actual pixels that are physically
 * covered by each bar, retaining sharp product cards everywhere else.
 * Visual-only: never changes cart state, inputs, prices or checkout requests. */
(() => {
  'use strict';
  const drawer=document.getElementById('cartDrawer');
  const list=drawer?.querySelector('#cartList');
  if(!drawer||!list)return;
  const bars=['.cart-header','.cart-subtotal-bar','#cartCheckout']
    .map(selector=>drawer.querySelector(selector));
  if(bars.some(bar=>!bar))return;

  const lenses=bars.map(bar=>{
    const lens=document.createElement('div');
    lens.className='sd-cart-optical-lens';
    lens.setAttribute('aria-hidden','true');
    lens.inert=true;
    // Keep the real controls and title painted above the visual-only lens.
    for(const child of Array.from(bar.children)){
      if(getComputedStyle(child).position==='static')child.style.position='relative';
      child.style.zIndex='2';
    }
    bar.insertBefore(lens,bar.firstChild);
    return {bar,lens,mirrors:new Map()};
  });
  const touched=new Set();
  let frame=0;

  function discardMirrors(){
    for(const group of lenses){
      for(const clone of group.mirrors.values())clone.remove();
      group.mirrors.clear();
    }
    for(const row of touched)row.style.removeProperty('clip-path');
    touched.clear();
  }

  function makeMirror(row,lens){
    const copy=row.cloneNode(true);
    copy.classList.add('sd-cart-optical-mirror');
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    copy.setAttribute('aria-hidden','true');
    copy.inert=true;
    copy.querySelectorAll('button,input,a,select,textarea,[tabindex]')
      .forEach(el=>el.tabIndex=-1);
    copy.style.pointerEvents='none';
    lens.appendChild(copy);
    return copy;
  }

  function render(){
    frame=0;
    if(!drawer.classList.contains('open')){
      if(touched.size)discardMirrors();
      return;
    }
    const rows=Array.from(list.children).filter(el=>el.classList.contains('cart-row'));
    if(!rows.length){discardMirrors();return}
    const rects=lenses.map(group=>group.bar.getBoundingClientRect());
    const active=new Set(rows);
    for(const row of rows){
      const r=row.getBoundingClientRect();
      let cropTop=0,cropBottom=0;
      lenses.forEach((group,index)=>{
        const b=rects[index];
        const overlapW=Math.min(r.right,b.right)-Math.max(r.left,b.left);
        const overlapH=Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top);
        const visible=overlapW>8&&overlapH>2;
        let copy=group.mirrors.get(row);
        if(!visible){
          if(copy){copy.remove();group.mirrors.delete(row)}
          return;
        }
        if(!copy){
          copy=makeMirror(row,group.lens);
          group.mirrors.set(row,copy);
        }
        // The mirrored card is pixel-aligned with its unmodified source.
        // Only the portion inside the rounded bar survives lens clipping.
        Object.assign(copy.style,{
          left:(r.left-b.left)+'px',
          top:(r.top-b.top)+'px',
          width:r.width+'px',
          height:r.height+'px',
          minWidth:r.width+'px',
          minHeight:r.height+'px'
        });
        if(index===0)cropTop=Math.max(cropTop,Math.min(r.height,b.bottom-r.top));
        else cropBottom=Math.max(cropBottom,Math.min(r.height,r.bottom-b.top));
      });
      if(cropTop||cropBottom){
        row.style.clipPath='inset('+Math.max(0,cropTop)+'px 0px '+Math.max(0,cropBottom)+'px 0px)';
        touched.add(row);
      }else{
        row.style.removeProperty('clip-path');
        touched.delete(row);
      }
    }
    for(const group of lenses){
      for(const [row,copy] of group.mirrors){
        if(!active.has(row)){copy.remove();group.mirrors.delete(row)}
      }
    }
    for(const row of touched){
      if(!active.has(row)){row.style.removeProperty('clip-path');touched.delete(row)}
    }
  }
  function schedule(){
    if(!frame)frame=requestAnimationFrame(render);
  }
  drawer.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  new MutationObserver(schedule).observe(drawer,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  schedule();
})();
