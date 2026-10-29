/* Email-only Preview enhancement: OTP, link verification and password reset.
   No secret is saved in localStorage. Google provider flow remains untouched. */
const root=document.getElementById("sdCustomerAuth");
if(root){
 const $=s=>root.querySelector(s);
 const panels={verify:$("#sdAuthVerify"),forgot:$("#sdAuthForgot"),reset:$("#sdAuthReset")};
 const login=$(".sd-auth-email-fields"),message=$("[data-auth-message]"),toggle=$("[data-auth-toggle]"),forgot=$("[data-auth-forgot]");
 let resetToken="";
 const tell=(text,success=false)=>{message.textContent=text;message.hidden=!text;message.dataset.kind=success?"success":"error"};
 const show=(name,email="")=>{
   if(name!=="close"){
    const button=$("[data-auth-email]");
    button.setAttribute("aria-expanded","true");
    login.hidden=true;toggle.hidden=true;forgot.hidden=true;$("[data-auth-unverified-caption]").hidden=true;
   }
   for(const [key,panel] of Object.entries(panels)){
    panel.hidden=key!==name;
    if(key===name&&email)panel.querySelector('input[name="email"]').value=email;
   }
   if(name==="close"){
    login.hidden=false;toggle.hidden=false;forgot.hidden=login.dataset.mode==="register";
   }
 };
 window.sdEmailFlow={show};
 const call=async body=>{
   const r=await fetch("/api/customer/auth/email",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(data.error||"Không hoàn tất được yêu cầu.");
   return data;
 };
 const email=$('[name="customer_email"]');
 forgot.addEventListener("click",()=>{resetToken="";show("forgot",email.value.trim());tell("")});
 root.querySelectorAll("[data-auth-return]").forEach(b=>b.addEventListener("click",()=>{resetToken="";show("close");tell("")}));
 panels.verify.querySelector("form").addEventListener("submit",async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('[type="submit"]');b.disabled=true;
  try{const f=e.currentTarget;const address=f.elements.email.value.trim();
   const r=await call({mode:"verify",email:address,code:f.elements.code.value.trim()});
   show("close");email.value=address;tell(r.message||"Email đã xác minh. Đăng nhập để tiếp tục.",true);
  }catch(err){tell(err.message)}finally{b.disabled=false}
 });
 $("[data-auth-resend]").addEventListener("click",async()=>{
  const b=$("[data-auth-resend]");b.disabled=true;
  try{const r=await call({mode:"resend",email:panels.verify.querySelector('[name="email"]').value.trim()});tell(r.message,true)}
  catch(err){tell(err.message)}finally{b.disabled=false}
 });
 panels.forgot.querySelector("form").addEventListener("submit",async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('[type="submit"]');b.disabled=true;
  try{const address=e.currentTarget.elements.email.value.trim();
   const r=await call({mode:"reset-request",email:address});
   resetToken="";$("[data-reset-code-row]").hidden=false;show("reset",address);tell(r.message,true);
  }catch(err){tell(err.message)}finally{b.disabled=false}
 });
 panels.reset.querySelector("form").addEventListener("submit",async e=>{
  e.preventDefault();const b=e.currentTarget.querySelector('[type="submit"]');b.disabled=true;
  try{const f=e.currentTarget,address=f.elements.email.value.trim();
   const r=await call({mode:"reset-confirm",email:address,password:f.elements.password.value,...(resetToken?{token:resetToken}:{code:f.elements.code.value.trim()})});
   resetToken="";f.reset();$("[data-reset-code-row]").hidden=false;
   show("close");email.value=address;tell(r.message,true);
  }catch(err){tell(err.message)}finally{b.disabled=false}
 });
 const hash=location.hash.startsWith("#customer-reset=")?location.hash.slice("#customer-reset=".length):"";
 if(hash){
  const values=new URLSearchParams(hash),token=values.get("token")||"",address=values.get("email")||"";
  history.replaceState(history.state,"",location.pathname+location.search);
  if(/^[a-f0-9]{64}$/.test(token)&&address.includes("@")){
   resetToken=token;show("reset",address);$("[data-reset-code-row]").hidden=true;
   const open=()=>{
    const drawer=document.getElementById("accountDrawer");
    if(!drawer?.classList.contains("open")&&!document.body.classList.contains("welcome-active")){
     (window.matchMedia("(max-width:760px)").matches?
       document.getElementById("mobileAccountNav"):document.getElementById("accountOpen"))?.click();
    }
    return drawer?.classList.contains("open")||false;
   };
   window.addEventListener("load",()=>{
    if(open())return;
    const observer=new MutationObserver(()=>{if(open())observer.disconnect()});
    observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
    window.setTimeout(()=>observer.disconnect(),10000);
   },{once:true});
  }
 }
}
