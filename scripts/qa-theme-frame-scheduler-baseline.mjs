/* No remote I/O: measures the CI runner's basic CSS compositor timing. */
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},colorScheme:'light'});
 await page.setContent(String.raw`<!doctype html><html><head><style>
 html,body{margin:0;min-height:100%}
 .bg{position:fixed;inset:0;background:#dbeaf7;opacity:1;transition:opacity .22s ease-out}
 .nav{position:relative;margin:24px;padding:18px;border-radius:28px;background-color:rgba(244,250,255,.94);transition:background-color .22s ease-out}
 html.dark .bg{opacity:0}
 html.dark .nav{background-color:rgba(4,20,34,.94)}
 </style></head><body><div class="bg"></div><nav class="nav"><button id="toggle">Toggle</button></nav></body></html>`);
 const output=[];
 for(const dark of [true,false,true,false]){
  await page.evaluate(()=>{
   const btn=document.querySelector('#toggle'),nav=document.querySelector('.nav'),bg=document.querySelector('.bg');
   window.__measure={events:[],frames:[],click:0};
   for(const el of [nav,bg])for(const type of ['transitionstart','transitionend'])
    el.addEventListener(type,e=>{
      if(e.target!==el||!['background-color','opacity'].includes(e.propertyName))return;
      window.__measure.events.push({type,property:e.propertyName,at:Math.round(performance.now())});
    },{once:true});
   btn.addEventListener('click',()=>{
     window.__measure.click=performance.now();
     const frame=t=>{if(performance.now()-window.__measure.click>400)return;
       window.__measure.frames.push(Math.round(t-window.__measure.click));
       requestAnimationFrame(frame)};
     requestAnimationFrame(frame);
     document.documentElement.classList.toggle('dark');
   },{once:true});
  });
  await page.locator('#toggle').dispatchEvent('click');
  await page.waitForTimeout(570);
  const record=await page.evaluate(()=>window.__measure);
  const start=record.events.find(e=>e.type==='transitionstart'&&e.property==='background-color');
  const end=record.events.find(e=>e.type==='transitionend'&&e.property==='background-color');
  if(!start||!end)throw Error('Missing CSS transition events on minimal benchmark');
  output.push({dark,startMs:Math.round(start.at-record.click),endMs:Math.round(end.at-record.click),
    durationMs:Math.round(end.at-start.at),frames:record.frames.slice(0,12)});
 }
 console.log('MINIMAL_CHROMIUM_THEME_FRAME_BASELINE '+JSON.stringify(output));
}finally{await browser.close()}
