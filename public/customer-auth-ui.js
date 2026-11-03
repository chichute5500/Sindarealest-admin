/* Google-only login for approved SinDarealest Account drawer. */
const root=document.getElementById("sdCustomerAuth");
if(root){
 const q=s=>root.querySelector(s);
 const authOptions=q("[data-auth-options]"),signed=root.parentElement?.querySelector("[data-auth-signed]");
 const message=q("[data-auth-message]");
 const guest=root.parentElement?.querySelector(".account-guest");
 const guestWelcome=guest?.querySelector("[data-account-welcome-name]");
 const $provider=guest?.querySelector("[data-auth-provider]");
 const googleMark=guest?.querySelector("[data-account-google-mark]");
 const drawer=document.getElementById("accountDrawer"),toast=document.getElementById("sdAccountToast");
 let toastTimer=0,toastObserver=null;
 const showToast=(text,kind="success")=>{
  window.clearTimeout(toastTimer);toastObserver?.disconnect();
  if(!toast)return;
  if(!text){toast.hidden=true;toast.textContent="";return;}
  const display=()=>{
   toast.textContent=text;toast.dataset.kind=kind;toast.hidden=false;
   toastTimer=window.setTimeout(()=>{toast.hidden=true;toast.textContent="";},3800);
  };
  if(drawer?.classList.contains("open"))display();
  else if(drawer){
   toastObserver=new MutationObserver(()=>{if(drawer.classList.contains("open")){toastObserver?.disconnect();display();}});
   toastObserver.observe(drawer,{attributes:true,attributeFilter:["class"]});
   window.setTimeout(()=>toastObserver?.disconnect(),10000);
  }
 };
 const notify=(text,kind="error")=>{
  if(kind==="success"){message.textContent="";message.hidden=true;showToast(text,"success");return;}
  message.textContent=text||"";message.hidden=!text;message.dataset.kind=kind;
 };
 const params=new URLSearchParams(window.location.search);
 const authReturn=params.get("customer_auth");
 if(authReturn){
  const reason=params.get("auth_reason")||"unknown";
  const reasonMessages={
   provider_denied:"Bạn đã hủy đăng nhập hoặc chưa cấp quyền truy cập tài khoản.",
   no_code:"Google chưa gửi mã xác thực về website.",
   invalid_code:"Mã xác thực Google không hợp lệ.",
   invalid_state:"Phiên đăng nhập đã hết hạn hoặc bị gián đoạn. Vui lòng thử lại trên cùng một trình duyệt.",
   token_rejected:"Google chưa xác nhận đăng nhập. Vui lòng thử lại sau.",
   token_invalid:"Google chưa trả về token hợp lệ.",
   profile_rejected:"Không lấy được thông tin tài khoản Google.",
   profile_invalid:"Google chưa xác minh tài khoản. Vui lòng thử lại.",
   callback_error:"Không hoàn tất được đăng nhập. Vui lòng thử lại.",
   session_store:"Không thể duy trì phiên đăng nhập. Vui lòng thử lại sau.",
   unknown:"Chưa hoàn tất đăng nhập. Vui lòng thử lại."
  };
  if(authReturn==="success")notify("");
  else notify("Đăng nhập chưa thành công. "+(reasonMessages[reason]||reasonMessages.unknown),"error");
  params.delete("customer_auth");params.delete("auth_reason");
  const rest=window.location.pathname+(params.size?"?"+params:"")+window.location.hash;
  history.replaceState(history.state,"",rest);
  window.addEventListener("load",()=>{
   const show=()=>{
    if(drawer?.classList.contains("open"))return true;
    if(document.body.classList.contains("welcome-active"))return false;
    const button=(window.matchMedia("(max-width:760px)").matches ? document.getElementById("mobileAccountNav"):document.getElementById("accountOpen")) || document.getElementById("accountOpen") || document.getElementById("mobileAccountNav");
    if(!button)return false;
    button.click();return drawer?.classList.contains("open")||false;
   };
   if(show())return;
   const observer=new MutationObserver(()=>{if(show())observer.disconnect();});
   observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
   window.setTimeout(()=>observer.disconnect(),10000);
  },{once:true});
 }
 let pendingAuthResult=authReturn;
 const refresh=async()=>{
  const oauthResult=pendingAuthResult;pendingAuthResult=null;
  try{
   const res=await fetch("/api/customer/session",{credentials:"same-origin",cache:"no-store"});
   if(!res.ok){root.hidden=false;if(guest)guest.hidden=true;notify("Máy chủ chưa đọc được phiên tài khoản (HTTP "+res.status+").");return;}
   const data=await res.json(),active=!!data.authenticated;
   if(oauthResult==="success"&&!active)notify("Đăng nhập chưa được duy trì. Vui lòng thử lại trên cùng trình duyệt.","error");
   else if(oauthResult==="success"&&active)notify("Đăng nhập thành công qua Google. Tài khoản đã được xác nhận.","success");
   else if(oauthResult==="failed"&&active)showToast(message.textContent+" Phiên trước đó vẫn đang hoạt động.","error");
   const google=q("[data-auth-google]");
   if(google){
    google.disabled=!data.providers?.google;
    google.querySelector("[data-auth-provider-label]").textContent=data.providers?.google?"Tiếp tục với Google":"Google tạm thời chưa khả dụng";
    google.title=data.providers?.google?"":"Đăng nhập Google hiện chưa sẵn sàng. Vui lòng thử lại sau.";
   }
   authOptions.hidden=active;
   if(signed)signed.hidden=!active;
   const customerName=String(data.user?.name||"").trim().slice(0,100)||"Khách hàng";
   if(guest){
    if(active&&guestWelcome)guestWelcome.textContent="Chào mừng "+customerName;
    if(active&&$provider)$provider.textContent="Google";
    if(googleMark)googleMark.hidden=!active;
    guest.hidden=!active;
   }
   root.hidden=active;
   window.sdAccountBridge?.onAuth(active);
  }catch{
   root.hidden=false;if(guest)guest.hidden=true;
   notify("Chưa kết nối được tài khoản. Bạn vẫn có thể đặt hàng không cần đăng nhập.");
  }
 };
 q('[data-auth-google]').addEventListener("click",()=>{location.assign("/api/customer/auth/google/start");});
 signed?.querySelector("[data-auth-logout]")?.addEventListener("click",async()=>{
  try{
   const res=await fetch("/api/customer/logout",{method:"POST",credentials:"same-origin"});
   if(!res.ok)throw Error("logout");
   await refresh();notify("Đã đăng xuất.","success");
  }catch{notify("Không thể đăng xuất. Vui lòng thử lại.");}
 });
 refresh();
}
