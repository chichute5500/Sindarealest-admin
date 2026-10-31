/* A visible Cloudflare Turnstile challenge is required only for phone lookups.
   Warranty/order codes remain usable without the widget. */
(()=>{
 "use strict";
 const definitions=[
  {action:"order_lookup",formId:"sdTrackForm",inputId:"sdTrackInput"},
  {action:"warranty_lookup",formId:"warrantyLookupForm",inputId:"warrantyLookupValue"}
 ];
 const states=new Map();
 let config=null,loadPromise=null;
 const isPhone=value=>{
  const digits=String(value||"").replace(/[^0-9]/g,"");
  return /^[0-9]{9,12}$/.test(digits)&&/^[+0-9() .\/-]+$/.test(String(value||""));
 };
 const validToken=action=>{
  const current=states.get(action);
  return current&&typeof current.token==="string"&&current.token.length>0&&Date.now()-current.when<240000?current.token:"";
 };
 window.sdPhoneLookupVerified=action=>Boolean(validToken(action));
 window.sdPhoneLookupToken=action=>validToken(action);
 window.sdPhoneLookupRequiresVerification=isPhone;
 window.sdResetPhoneLookupProof=action=>{
  const current=states.get(action);if(!current)return;
  current.token="";current.when=0;
  try{if(current.widgetId!==null&&window.turnstile)window.turnstile.reset(current.widgetId)}catch{}
 };
 function loadScript(){
  if(loadPromise)return loadPromise;
  loadPromise=new Promise((resolve,reject)=>{
   if(window.turnstile){resolve(window.turnstile);return}
   const node=document.createElement("script");
   node.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
   node.async=true;node.defer=true;
   node.onload=()=>window.turnstile?resolve(window.turnstile):reject(Error("No Turnstile API"));
   node.onerror=()=>reject(Error("Turnstile unavailable"));
   document.head.appendChild(node);
  });
  return loadPromise;
 }
 function setupField(def){
  const form=document.getElementById(def.formId),field=document.getElementById(def.inputId);
  if(!form||!field)return;
  const wrapper=document.createElement("div"),hint=document.createElement("p"),mount=document.createElement("div");
  wrapper.className="sd-phone-challenge";wrapper.hidden=true;
  hint.className="sd-phone-challenge-hint";hint.setAttribute("role","status");
  mount.className="sd-phone-challenge-widget";
  wrapper.append(hint,mount);
  form.insertBefore(wrapper,form.querySelector('[role="status"]')||null);
  states.set(def.action,{token:"",when:0,widgetId:null,busy:false});
  async function refresh(){
   if(!isPhone(field.value)){wrapper.hidden=true;return}
   wrapper.hidden=false;
   if(!config?.phoneLookupAvailable||!config.siteKey){
    hint.textContent="Tra cứu bằng số điện thoại hiện yêu cầu xác minh. Hãy dùng mã đơn hoặc mã bảo hành để tiếp tục.";
    return;
   }
   hint.textContent="Xác minh để tra cứu bằng số điện thoại.";
   const state=states.get(def.action);
   if(state.widgetId!==null||state.busy)return;
   state.busy=true;
   try{
    const api=await loadScript();
    state.widgetId=api.render(mount,{
     sitekey:config.siteKey,
     theme:"auto",action:def.action,
     callback:token=>{state.token=String(token);state.when=Date.now();hint.textContent="Đã xác minh. Bạn có thể tra cứu.";},
     "expired-callback":()=>{state.token="";hint.textContent="Mã xác minh đã hết hạn. Vui lòng xác minh lại.";},
     "error-callback":()=>{state.token="";hint.textContent="Chưa thể xác minh. Hãy thử lại hoặc dùng mã đơn/mã bảo hành.";}
    });
   }catch{hint.textContent="Không tải được xác minh. Bạn có thể tra cứu bằng mã đơn hoặc mã bảo hành."}
   finally{state.busy=false}
  }
  field.addEventListener("input",refresh);
  field.addEventListener("focus",refresh);
  refresh();
 }
 async function init(){
  try{
   const r=await fetch("/api/lookup-challenge-config",{cache:"no-store",credentials:"same-origin"});
   if(!r.ok)throw Error("Configuration unavailable");
   config=await r.json();
  }catch{config={phoneLookupAvailable:false,siteKey:""}}
  for(const def of definitions)setupField(def);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
