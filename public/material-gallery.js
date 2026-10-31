/* Read-only real crocodile leather gallery. Add image names to gallery.json, no controls. */
(()=>{
  'use strict';
  const tile=document.getElementById('materialTile');
  const host=document.getElementById('materialGallery');
  if(!tile||!host)return;
  const directory='/images/crocodile-leather/';
  const filenameIsSafe=name=>typeof name==='string'&&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}\.(?:avif|webp|jpe?g|png)$/i.test(name)&&!name.includes('..');
  function preload(filename){
    return new Promise(resolve=>{
      const probe=new Image();
      probe.onload=()=>resolve(probe.src);
      probe.onerror=()=>resolve(null);
      probe.src=directory+encodeURIComponent(filename);
    });
  }
  async function start(){
    const response=await fetch(directory+'gallery.json',{cache:'no-cache'});
    if(!response.ok)return;
    const manifest=await response.json();
    const names=Array.isArray(manifest?.images)?
      [...new Set(manifest.images.filter(filenameIsSafe))].slice(0,24):[];
    if(!names.length)return; // Leave the original theme-aware photos untouched until real images are supplied.
    const loaded=(await Promise.all(names.map(preload))).filter(Boolean);
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
    if(loaded.length<2)return;
    let index=0,front=0,onscreen=true;
    const observer='IntersectionObserver' in window
      ?new IntersectionObserver(entries=>{onscreen=entries.some(entry=>entry.isIntersecting)},{threshold:0})
      :null;
    observer?.observe(tile);
    const intervalId=window.setInterval(()=>{
      if(document.hidden||!onscreen)return;
      const nextIndex=(index+1)%loaded.length;
      const back=1-front;
      layers[back].src=loaded[nextIndex];
      layers[back].classList.add('is-visible');
      layers[front].classList.remove('is-visible');
      index=nextIndex;front=back;
    },1500);
    // Pause work for off-screen galleries and release the timer on navigation.
    window.addEventListener('pagehide',()=>{
      window.clearInterval(intervalId);
      observer?.disconnect();
    },{once:true});
  }
  start().catch(()=>{}); // A missing manifest must never break the storefront.
})();
