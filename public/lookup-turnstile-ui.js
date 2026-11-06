/* A visible Cloudflare Turnstile challenge is required only for phone lookups.
   Warranty/order codes remain usable without the widget. */
(()=>{
 "use strict";
 const definitions=[
  {action:"order_lookup",formId:"sdTrackForm",inputId:"sdTrackInput"},
  {action:"warranty_lookup",formId:"warrantyLookupForm",inputId:"warrantyLookupValue"}
 ];
 const states=new Map();
 const clearPending=state=>{state.pendingValue="";state.pendingSubmit=false};
 let config=null,loadPromise=null,configLoadPromise=null;
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
  current.token="";current.when=0;clearPending(current);
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
  const state={token:"",when:0,widgetId:null,busy:false,pendingValue:"",pendingSubmit:false};
  states.set(def.action,state);
  // A single deliberate submit queues the phone lookup until CAPTCHA success.
  // Capturing runs before the existing Storefront submit handler, ensuring
  // it cannot send an unverified request or demand a second button press.
  form.addEventListener("submit",event=>{
   if(!isPhone(field.value)||validToken(def.action)){clearPending(state);return}
   event.preventDefault();
   event.stopImmediatePropagation();
   state.pendingValue=field.value.trim();
   state.pendingSubmit=true;
   const status=form.querySelector('[role="status"]');
   if(status)status.textContent="Hoàn tất xác minh bên dưới, hệ thống sẽ tự tra cứu.";
   refresh();
  },true);
  async function refresh(){
   if(!isPhone(field.value)){wrapper.hidden=true;clearPending(state);return}
   wrapper.hidden=false;
   // Only phone-number lookup needs Turnstile. Avoid a Worker request on
   // every normal Storefront visit, including code-based lookups.
   if(config===null){
    hint.textContent="Đang chuẩn bị xác minh...";
    await ensureConfig();
    if(!isPhone(field.value)){wrapper.hidden=true;clearPending(state);return}
   }
   if(!config?.phoneLookupAvailable||!config.siteKey){
    clearPending(state);
    hint.textContent="Tra cứu bằng số điện thoại hiện yêu cầu xác minh. Hãy dùng mã đơn hoặc mã bảo hành để tiếp tục.";
    const status=form.querySelector('[role="status"]');
    if(status)status.textContent=hint.textContent;
    return;
   }
   hint.textContent=state.pendingSubmit?
    "Hoàn tất xác minh để hệ thống tự tra cứu.":"Xác minh để tra cứu bằng số điện thoại.";
   if(state.widgetId!==null||state.busy)return;
   state.busy=true;
   try{
    const api=await loadScript();
    state.widgetId=api.render(mount,{
     sitekey:config.siteKey,
     theme:"auto",action:def.action,
     callback:token=>{
      state.token=String(token);state.when=Date.now();
      const shouldSubmit=state.pendingSubmit&&
        field.value.trim()===state.pendingValue&&isPhone(field.value)&&Boolean(validToken(def.action));
      clearPending(state);
      hint.textContent=shouldSubmit?"Đã xác minh. Đang tra cứu…":"Đã xác minh. Bạn có thể tra cứu.";
      if(shouldSubmit)form.requestSubmit();
     },
     "expired-callback":()=>{state.token="";state.when=0;clearPending(state);hint.textContent="Mã xác minh đã hết hạn. Vui lòng xác minh lại.";},
     "error-callback":()=>{state.token="";state.when=0;clearPending(state);hint.textContent="Chưa thể xác minh. Hãy thử lại hoặc dùng mã đơn/mã bảo hành.";}
    });
   }catch{
    clearPending(state);
    hint.textContent="Không tải được xác minh. Bạn có thể tra cứu bằng mã đơn hoặc mã bảo hành.";
    const status=form.querySelector('[role="status"]');
    if(status)status.textContent=hint.textContent;
   }
   finally{state.busy=false}
  }
  field.addEventListener("input",()=>{
   if(state.pendingSubmit&&field.value.trim()!==state.pendingValue)clearPending(state);
   refresh();
  });
  field.addEventListener("focus",refresh);
  refresh();
 }
 function ensureConfig(){
  if(config!==null)return Promise.resolve(config);
  if(configLoadPromise)return configLoadPromise;
  configLoadPromise=(async()=>{
   try{
    const r=await fetch("/api/lookup-challenge-config",{cache:"no-store",credentials:"same-origin"});
    if(!r.ok)throw Error("Configuration unavailable");
    config=await r.json();
   }catch{config={phoneLookupAvailable:false,siteKey:""}}
   return config;
  })();
  return configLoadPromise;
 }
 function init(){
  // Install form listeners at DOM-ready, including for pasted phone numbers.
  // Config is fetched once, only if the phone lookup challenge becomes needed.
  for(const def of definitions)setupField(def);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
