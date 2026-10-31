/* Read-only real crocodile leather gallery. Add image names to gallery.json, no controls. */
(()=>{
  'use strict';
  const tile=document.getElementById('materialTile');
  const host=document.getElementById('materialGallery');
  if(!tile||!host)return;
  const directory='/images/crocodile-leather/';
  const filenameIsSafe=name=>typeof name==='string'&&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}\.(?:avif|webp|jpe?g|png)$/i.test(name)&&!name.includes('..');
  const imageCache=new Map();
  function preload(filename){
    if(imageCache.has(filename))return imageCache.get(filename);
    const task=new Promise(resolve=>{
      const probe=new Image();
      probe.onload=()=>resolve(probe.src);
      probe.onerror=()=>resolve(null);
      probe.src=directory+encodeURIComponent(filename);
    });
    imageCache.set(filename,task);
    return task;
  }
  async function start(){
    const response=await fetch(directory+'gallery.json',{cache:'no-cache'});
    if(!response.ok)return;
    const manifest=await response.json();
    const names=Array.isArray(manifest?.images)?
      [...new Set(manifest.images.filter(filenameIsSafe))].slice(0,24):[];
    if(!names.length)return; // Leave the original theme-aware photos untouched until real images are supplied.
    // Never download all 12 high-resolution leather photos at first paint.
    // Load only the first slide after the material tile approaches viewport.
    const loaded=(await Promise.all(names.slice(0,1).map(preload))).filter(Boolean);
    if(!loaded.length)return;
    const layers=[document.createElement('img'),document.createElement('img')];
    for(const layer of layers){
      layer.className='sd-material-slide';
      layer.alt='';
      layer.decoding='async';
      layer.draggable=false;
      layer.setAttribute('aria-hidden','true');
    }
    layers[0].src=loaded[0];
    layers[0].classList.add('is-visible');
    host.replaceChildren(...layers);
    tile.classList.add('has-real-material-gallery');
    if(names.length<2)return;
    let index=0,front=0,onscreen=true,busy=false;
    const observer='IntersectionObserver' in window
      ?new IntersectionObserver(entries=>{onscreen=entries.some(entry=>entry.isIntersecting)},{threshold:0})
      :null;
    observer?.observe(tile);
    const intervalId=window.setInterval(()=>{
      if(document.hidden||!onscreen||busy)return;
      const nextIndex=(index+1)%names.length;
      busy=true;
      preload(names[nextIndex]).then(src=>{
        if(!src){index=nextIndex;return}
        if(document.hidden||!onscreen)return;
        const back=1-front;
        layers[back].src=src;
        layers[back].classList.add('is-visible');
        layers[front].classList.remove('is-visible');
        index=nextIndex;front=back;
      }).finally(()=>{busy=false});
    },1500);
    // Pause work for off-screen galleries and release the timer on navigation.
    window.addEventListener('pagehide',()=>{
      window.clearInterval(intervalId);
      observer?.disconnect();
    },{once:true});
  }
  // Do not even fetch gallery.json while the material panel is far offscreen.
  // The observer also works when a visitor navigates back from the catalog.
  let started=false;
  const launch=()=>{
    if(started)return;
    started=true;
    start().catch(()=>{}); // Unavailable media never blocks the storefront.
  };
  if('IntersectionObserver' in window){
    const activation=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        activation.disconnect();
        launch();
      }
    },{rootMargin:'250px 0px',threshold:0});
    activation.observe(tile);
  }else{
    // Old browsers only: gracefully keep the material gallery functional.
    launch();
  }
})();
