/* Optical occlusion for the Checkout mobile glass bars.
 * Cart already has this treatment in cart-glass-optics.js. A backdrop-filter
 * inside the nested Android Chrome glass root cannot sample scrolling text
 * from its own ancestor. Mirror only visible Checkout form blocks into a
 * 14px-blurred, aria-hidden lens, and hide the covered original pixels with
 * a soft local mask. No checkout state, QR data or payment event is changed. */
(() => {
 'use strict';
 const drawer=document.getElementById('checkoutDrawer');
 const form=drawer?.querySelector('#checkoutForm');
 if(!drawer||!form)return;
 const header=drawer.querySelector('.checkout-header');
 const footer=drawer.querySelector('.sd-checkout-footer');
 // The footer itself must NEVER become a frosted rectangle: only its
 // actual control-shaped panes can obscure scrolling text.
 const controls=['#sdCheckoutPrev','#checkoutSubmit','#sdCheckoutConfirmWrap','#sdCheckoutDone']
  .map(selector=>drawer.querySelector(selector));
 if(!header||!footer||controls.some(el=>!el))return;
 const targets=[{bar:header,mount:header},...controls.map(bar=>({bar,mount:footer}))];
 const lenses=targets.map(({bar,mount})=>{
  const lens=document.createElement('div');
  lens.className='sd-checkout-optical-lens';
  lens.dataset.sdOpticalTarget=bar.id||'checkout-header';
  lens.setAttribute('aria-hidden','true');
  lens.inert=true;
  mount.insertBefore(lens,mount.firstChild);
  return {bar,mount,lens,mirrors:new Map()};
 });
 const touched=new Set();
 let frame=0,refresh=false;

 function clear(){
  for(const group of lenses){
   for(const mirror of group.mirrors.values())mirror.remove();
   group.mirrors.clear();
  }
  for(const node of touched){
   node.style.removeProperty('mask-image');
   node.style.removeProperty('-webkit-mask-image');
  }
  touched.clear();
 }

 function mirrorNode(source,group){
  const clone=source.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  clone.setAttribute('aria-hidden','true');
  clone.classList.add('sd-checkout-optical-mirror');
  clone.inert=true;
  // Source blocks are locally masked under the floating bars. Never carry
  // that mask into their blurred mirror or the text would disappear entirely.
  clone.style.removeProperty('mask-image');
  clone.style.removeProperty('-webkit-mask-image');
  clone.querySelectorAll('input,textarea,select').forEach((input,index)=>{
   const original=source.querySelectorAll('input,textarea,select')[index];
   if(original){
    if('value' in input)input.value=original.value;
    if('checked' in input)input.checked=original.checked;
   }
  });
  clone.querySelectorAll('button,a,input,select,textarea,[tabindex]')
   .forEach(node=>node.tabIndex=-1);
  group.lens.appendChild(clone);
  return clone;
 }

 function transparentZones(height,zones){
  const ranges=zones.map(([a,b])=>[
   Math.max(0,Math.min(height,a)),Math.max(0,Math.min(height,b))
  ]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  if(!ranges.length)return '';
  const merged=[];
  for(const [a,b] of ranges){
   const last=merged[merged.length-1];
   if(last&&a<=last[1]+2)last[1]=Math.max(last[1],b);
   else merged.push([a,b]);
  }
  const stops=[];
  let lastEnd=0;
  for(const [a,b] of merged){
   const feather=Math.min(12,(b-a)/2);
   const begin=Math.max(lastEnd,Math.max(0,a-12));
   const clearStart=Math.max(begin,Math.min(height,a+feather));
   const clearEnd=Math.max(clearStart,Math.min(height,b-feather));
   const end=Math.max(clearEnd,Math.min(height,b+12));
   stops.push('black '+begin+'px','transparent '+clearStart+'px',
     'transparent '+clearEnd+'px','black '+end+'px');
   lastEnd=end;
  }
  return 'linear-gradient(to bottom, black 0px, '+stops.join(', ')+', black '+height+'px)';
 }

 function render(){
  frame=0;
  if(innerWidth>760||!drawer.classList.contains('open')){
   if(touched.size||lenses.some(x=>x.mirrors.size))clear();
   return;
  }
  if(refresh){clear();refresh=false}
  const blocks=[...form.children].filter(el=>el.getClientRects().length>0
   &&getComputedStyle(el).display!=='none');
  const active=new Set(blocks);
  const footerRect=footer.getBoundingClientRect();
  const rects=lenses.map(group=>{
   const r=group.bar.getBoundingClientRect();
   if(group.mount===footer){
    const style=group.lens.style;
    const left=(r.left-footerRect.left)+'px',top=(r.top-footerRect.top)+'px';
    const width=r.width+'px',height=r.height+'px';
    if(style.left!==left)style.left=left;
    if(style.top!==top)style.top=top;
    if(style.width!==width)style.width=width;
    if(style.height!==height)style.height=height;
   }
   return r;
  });
  for(const block of blocks){
   const r=block.getBoundingClientRect();
   const covered=[];
   lenses.forEach((group,i)=>{
    const b=rects[i];
    const width=Math.min(r.right,b.right)-Math.max(r.left,b.left);
    const height=Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top);
    const visible=width>8&&height>2;
    let clone=group.mirrors.get(block);
    if(!visible){
     if(clone){clone.remove();group.mirrors.delete(block)}
     return;
    }
    if(!clone){
     clone=mirrorNode(block,group);
     group.mirrors.set(block,clone);
    }
    Object.assign(clone.style,{
     left:(r.left-b.left)+'px',top:(r.top-b.top)+'px',
     width:r.width+'px',height:r.height+'px',
     minWidth:r.width+'px',minHeight:r.height+'px'
    });
    covered.push([b.top-r.top,b.bottom-r.top]);
   });
   const mask=transparentZones(r.height,covered);
   if(mask){
    if(block.style.getPropertyValue('mask-image')!==mask){
     block.style.setProperty('mask-image',mask);
     block.style.setProperty('-webkit-mask-image',mask);
    }
    touched.add(block);
   }else{
    block.style.removeProperty('mask-image');
    block.style.removeProperty('-webkit-mask-image');
    touched.delete(block);
   }
  }
  for(const group of lenses){
   for(const [node,copy] of group.mirrors){
    if(!active.has(node)){copy.remove();group.mirrors.delete(node)}
   }
  }
  for(const node of touched){
   if(!active.has(node)){
    node.style.removeProperty('mask-image');
    node.style.removeProperty('-webkit-mask-image');
    touched.delete(node);
   }
  }
 }

 function schedule(needsRefresh=false){
  if(needsRefresh)refresh=true;
  if(!frame)frame=requestAnimationFrame(render);
 }
 drawer.addEventListener('scroll',()=>schedule(),{passive:true});
 form.addEventListener('scroll',()=>schedule(),{passive:true});
 window.addEventListener('resize',()=>schedule(),{passive:true});
 new MutationObserver(()=>schedule()).observe(drawer,{attributes:true,attributeFilter:['class']});
 new MutationObserver(()=>schedule(true)).observe(form,{
  subtree:true,childList:true,characterData:true,
  attributes:true,attributeFilter:['hidden','class','src']
 });
 // Typing must not tear down and rebuild all heavy blurred QR mirrors.
 // Update any overlapping input value in place, then schedule one RAF.
 form.addEventListener('input',()=>{
  for(const group of lenses)for(const [source,clone] of group.mirrors){
   const originalFields=source.querySelectorAll('input,textarea,select');
   const mirroredFields=clone.querySelectorAll('input,textarea,select');
   originalFields.forEach((field,i)=>{
    if(!mirroredFields[i])return;
    if('value' in mirroredFields[i])mirroredFields[i].value=field.value;
    if('checked' in mirroredFields[i])mirroredFields[i].checked=field.checked;
   });
  }
  schedule();
 },{passive:true});
 form.addEventListener('change',()=>schedule(true),{passive:true});
 schedule();
})();
