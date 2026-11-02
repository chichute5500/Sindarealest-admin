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
    for(const row of touched){
      row.style.removeProperty('mask-image');
      row.style.removeProperty('-webkit-mask-image');
    }
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

  // A hard clip on the source row previously sliced products in a straight
  // line at the top of the sticky footer. Feather the source out and restore
  // the blurred mirror inside each lens instead: no harsh clipping seam.
  function softProductMask(height,covered){
    const ranges=covered.map(([start,end])=>[
      Math.max(0,Math.min(height,start)),
      Math.max(0,Math.min(height,end))
    ]).filter(([start,end])=>end>start).sort((a,b)=>a[0]-b[0]);
    if(!ranges.length)return '';
    const merged=[];
    for(const [start,end] of ranges){
      const last=merged[merged.length-1];
      if(last&&start<=last[1]+2)last[1]=Math.max(last[1],end);
      else merged.push([start,end]);
    }
    const stops=[];
    let lastStop=0;
    for(const [start,end] of merged){
      const feather=Math.min(12,(end-start)*.5);
      const softStart=Math.max(lastStop,Math.max(0,start-12));
      const transparentStart=Math.max(softStart,Math.min(height,start+feather));
      const transparentEnd=Math.max(transparentStart,Math.min(height,end-feather));
      const softEnd=Math.max(transparentEnd,Math.min(height,end+12));
      stops.push('black '+softStart+'px');
      stops.push('transparent '+transparentStart+'px');
      stops.push('transparent '+transparentEnd+'px');
      stops.push('black '+softEnd+'px');
      lastStop=softEnd;
    }
    // Prevent the original sharp lettering from drawing across the lens,
    // while retaining a gradual opacity transition at the lens boundary.
    return 'linear-gradient(to bottom, black 0px, '+stops.join(', ')+', black '+height+'px)';
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
      const covered=[];
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
        covered.push([b.top-r.top,b.bottom-r.top]);
      });
      const softMask=softProductMask(r.height,covered);
      if(softMask){
        row.style.setProperty('mask-image',softMask);
        row.style.setProperty('-webkit-mask-image',softMask);
        touched.add(row);
      }else{
        row.style.removeProperty('mask-image');
        row.style.removeProperty('-webkit-mask-image');
        touched.delete(row);
      }
    }
    for(const group of lenses){
      for(const [row,copy] of group.mirrors){
        if(!active.has(row)){copy.remove();group.mirrors.delete(row)}
      }
    }
    for(const row of touched){
      if(!active.has(row)){
        row.style.removeProperty('mask-image');
        row.style.removeProperty('-webkit-mask-image');
        touched.delete(row);
      }
    }
  }
  function schedule(){
    if(!frame)frame=requestAnimationFrame(render);
  }
  drawer.addEventListener('scroll',schedule,{passive:true});
  // Desktop has its own inner list scroll; mobile scrolls the entire drawer.
  list.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  new MutationObserver(schedule).observe(drawer,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
  schedule();
})();
