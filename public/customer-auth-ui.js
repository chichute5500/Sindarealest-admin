/* Enhancement to existing Owner-PASS Account drawer. Keeps guest checkout unchanged. */
const root=document.getElementById("sdCustomerAuth");
if(root){
  const q=s=>root.querySelector(s);
  const authOptions=q("[data-auth-options]"),signed=q("[data-auth-signed]");
  const emailForm=q("form"),message=q("[data-auth-message]");
  const guest=root.parentElement?.querySelector(".account-guest");
  const $name=q("[data-auth-user]"),$provider=q("[data-auth-provider]");
  const notify=(text,kind="error")=>{
    message.textContent=text||"";
    message.hidden=!text;
    message.dataset.kind=kind;
  };
  const params=new URLSearchParams(window.location.search);
  const authReturn=params.get("customer_auth");
  if(authReturn){
    const reason=params.get("auth_reason")||"unknown";
    const reasonMessages={
      provider_denied:"Bạn đã hủy cấp quyền trên Zalo/Google hoặc nhà cung cấp từ chối yêu cầu.",
      no_code:"Zalo/Google chưa gửi mã xác thực về website.",
      invalid_code:"Mã xác thực được trả về không hợp lệ.",
      invalid_state:"Phiên bảo mật không khớp. Hãy sử dụng cùng một trình duyệt từ đầu đến cuối, không đổi tab hoặc chế độ ẩn danh.",
      token_rejected:"Zalo/Google từ chối mã đăng nhập ở bước trao đổi token. Cần kiểm tra cấu hình OAuth trên máy chủ.",
      token_invalid:"Nhà cung cấp không trả về token hợp lệ.",
      profile_rejected:"Không lấy được hồ sơ từ Zalo/Google sau khi cấp quyền.",
      profile_invalid:"Nhà cung cấp chưa trả thông tin tài khoản hợp lệ.",
      callback_error:"Lỗi khi xử lý callback hoặc ghi phiên đăng nhập vào cơ sở dữ liệu.",
      unknown:"Chưa hoàn tất đăng nhập. Vui lòng thử lại."
    };
    if(authReturn==="success")notify("Đã xác thực. Đang kiểm tra phiên đăng nhập…","success");
    else notify("Đăng nhập chưa thành công. "+(reasonMessages[reason]||reasonMessages.unknown),"error");
    params.delete("customer_auth");params.delete("auth_reason");
    const rest=window.location.pathname+(params.size?"?"+params:"")+window.location.hash;
    history.replaceState(history.state,"",rest);
    // OAuth returns to a new document. Reopen the approved Account drawer
    // only after the existing Welcome animation has completed.
    window.addEventListener("load",()=>{
      const drawer=document.getElementById("accountDrawer");
      const show=()=>{
        if(drawer?.classList.contains("open"))return true;
        if(document.body.classList.contains("welcome-active"))return false;
        const button=document.getElementById("mobileAccountNav")||document.getElementById("accountOpen");
        if(!button)return false;
        button.click();
        return drawer?.classList.contains("open")||false;
      };
      if(show())return;
      const observer=new MutationObserver(()=>{if(show())observer.disconnect();});
      observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
      window.setTimeout(()=>observer.disconnect(),10000);
    },{once:true});
  }
  const refresh=async()=>{
    try{
      const res=await fetch("/api/customer/session",{credentials:"same-origin",cache:"no-store"});
      if(!res.ok){notify("Máy chủ chưa đọc được phiên tài khoản (HTTP "+res.status+").");return;}
      const data=await res.json(),active=!!data.authenticated;
      if(authReturn==="success" && !active)
        notify("Nhà cung cấp đã trả về nhưng trình duyệt chưa giữ được phiên. Hãy kiểm tra cookie hoặc lỗi xử lý callback.","error");
      else if(authReturn==="success" && active)
        notify("Đăng nhập thành công. Tài khoản đã được xác nhận.","success");
      const google=q("[data-auth-google]"),zalo=q("[data-auth-zalo]");
      if(google){
        google.disabled=!data.providers?.google;
        google.textContent=data.providers?.google?"Tiếp tục với Google":"Google (chưa cấu hình)";
        google.title=data.providers?.google?"":"Cần tạo Google OAuth Client ID và Secret trong Google Cloud";
      }
      if(zalo){
        zalo.disabled=!data.providers?.zalo;
        zalo.title=data.providers?.zalo?"":"Zalo App Secret chưa có ở môi trường này";
      }
      // Email is Preview-only until verified ownership + recovery are implemented.
      const emailEnabled=Boolean(data.providers?.email);
      emailForm.hidden=!emailEnabled;
      q("[data-auth-toggle]").hidden=!emailEnabled;
      q("[data-auth-email-note]").hidden=emailEnabled;
      q("[data-auth-unverified-caption]").hidden=!emailEnabled;
      authOptions.hidden=active;signed.hidden=!active;
      if(guest)guest.hidden=active;
      if(active){
        $name.textContent=data.user?.name||"Khách hàng";
        const names={zalo:"Zalo",google:"Google",email:"Email"};
        $provider.textContent=names[data.user?.provider]||"Tài khoản";
      }
    }catch{notify("Chưa kết nối được tài khoản. Bạn vẫn có thể đặt hàng không cần đăng nhập.");}
  };
  q('[data-auth-zalo]').addEventListener("click",()=>{location.assign("/api/customer/auth/zalo/start");});
  q('[data-auth-google]').addEventListener("click",()=>{location.assign("/api/customer/auth/google/start");});
  q('[data-auth-toggle]').addEventListener("click",()=>{
    const register=emailForm.dataset.mode!=="register";
    emailForm.dataset.mode=register?"register":"login";
    q("[data-auth-name-row]").hidden=!register;
    q("[data-auth-submit]").textContent=register?"Tạo tài khoản":"Đăng nhập bằng Email";
    q("[data-auth-toggle]").textContent=register?"Đã có tài khoản? Đăng nhập":"Chưa có tài khoản? Đăng ký";
    notify("");
  });
  emailForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=q("[data-auth-submit]");submit.disabled=true;notify("");
    try{
      const payload={
        mode:emailForm.dataset.mode||"login",
        name:q('[name="customer_name"]').value,
        email:q('[name="customer_email"]').value,
        password:q('[name="customer_password"]').value
      };
      const res=await fetch("/api/customer/auth/email",{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",
        body:JSON.stringify(payload)
      });
      const data=await res.json();
      if(!res.ok){notify(data.error||"Đăng nhập không thành công.");return;}
      emailForm.reset();notify("Đăng nhập thành công.");
      await refresh();
    }catch{notify("Không thể kết nối. Vui lòng thử lại.");}
    finally{submit.disabled=false;}
  });
  q("[data-auth-logout]").addEventListener("click",async()=>{
    try{
      const res=await fetch("/api/customer/logout",{method:"POST",credentials:"same-origin"});
      if(!res.ok)throw Error("logout");
      await refresh();notify("Đã đăng xuất.");
    }catch{notify("Không thể đăng xuất. Vui lòng thử lại.");}
  });
  refresh();
}
