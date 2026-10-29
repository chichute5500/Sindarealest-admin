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
      provider_denied:"Bạn đã hủy cấp quyền hoặc Facebook, Google, Zalo từ chối yêu cầu.",
      no_code:"Nhà cung cấp đăng nhập chưa gửi mã xác thực về website.",
      invalid_code:"Mã xác thực được trả về không hợp lệ.",
      invalid_state:"Phiên bảo mật không khớp. Hãy sử dụng cùng một trình duyệt từ đầu đến cuối, không đổi tab hoặc chế độ ẩn danh.",
      token_rejected:"Nhà cung cấp từ chối mã xác thực. Hãy kiểm tra URL callback và thiết lập OAuth của Facebook, Google hoặc Zalo.",
      token_invalid:"Nhà cung cấp không trả về token hợp lệ.",
      profile_rejected:"Không lấy được hồ sơ từ nhà cung cấp đăng nhập sau khi cấp quyền.",
      profile_invalid:"Nhà cung cấp đăng nhập chưa trả về mã định danh tài khoản hợp lệ.",
      profile_api_error:"Zalo trả về lỗi khi lấy thông tin tài khoản, dù đã cấp quyền. Hệ thống đang kiểm tra lỗi này.",
      profile_relay_unavailable:"Máy chủ Việt Nam dùng để xác minh tài khoản Zalo chưa kết nối được. Bạn có thể dùng Google để đăng nhập.",
      facebook_unavailable:"Facebook Login chưa sẵn sàng trên Preview. Kiểm tra URL callback và trạng thái ứng dụng Meta.",
      callback_error:"Lỗi xử lý callback. Máy chủ sẽ cần kiểm tra luồng đăng nhập.",
      session_store:"Đã lấy được hồ sơ, nhưng không thể tạo phiên tài khoản trong cơ sở dữ liệu Preview.",
      unknown:"Chưa hoàn tất đăng nhập. Vui lòng thử lại."
    };
    if(authReturn==="email_verified")notify("Email đã xác minh thành công. Tài khoản đã kích hoạt.","success");
    else if(authReturn==="email_verify_failed")notify("Liên kết xác minh sai hoặc hết hạn. Hãy yêu cầu mã mới.","error");
    else if(authReturn==="success")notify("Đã xác thực. Đang kiểm tra phiên đăng nhập…","success");
    else notify("Đăng nhập chưa thành công. "+(reason==="profile_api_error_-501" ?
      "Zalo báo lỗi -501 khi máy chủ lấy thông tin tài khoản. Có thể liên quan đến IP máy chủ ở ngoài Việt Nam; Shop đang xử lý kết nối. Bạn có thể đăng nhập qua Google." :
      /^profile_api_error_-?\d{1,5}$/.test(reason) ?
        "Zalo báo mã lỗi API "+reason.slice("profile_api_error_".length)+". Vui lòng gửi mã lỗi này để kiểm tra." :
        (reasonMessages[reason]||reasonMessages.unknown)),"error");
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
        const button=(window.matchMedia("(max-width:760px)").matches ?
          document.getElementById("mobileAccountNav") : document.getElementById("accountOpen")) ||
          document.getElementById("accountOpen") || document.getElementById("mobileAccountNav");
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
        notify("Đăng nhập thành công qua "+({zalo:"Zalo",google:"Google",facebook:"Facebook",email:"Email"}[data.user?.provider]||"tài khoản")+". Tài khoản đã được xác nhận.","success");
      // An existing login is independent of a newly failed OAuth attempt.
      // Do not present an old session as a successful login from another provider.
      else if(authReturn==="failed" && active)
        notify(message.textContent+" Phiên "+({zalo:"Zalo",google:"Google",email:"Email"}[data.user?.provider]||"trước đó")+" vẫn đang hoạt động.","error");
      const google=q("[data-auth-google]"),zalo=q("[data-auth-zalo]"),
        facebook=q("[data-auth-facebook]");
      if(google){
        google.disabled=!data.providers?.google;
        google.querySelector("[data-auth-provider-label]").textContent=data.providers?.google?"Tiếp tục với Google":"Google (chưa cấu hình)";
        google.title=data.providers?.google?"":"Cần tạo Google OAuth Client ID và Secret trong Google Cloud";
      }
      if(zalo){
        zalo.hidden=true;
        zalo.disabled=true;
        zalo.title="Zalo Login tạm ngừng để tránh lỗi đăng nhập";
      }
      // Do not expose a clickable login method until Meta app + secret are configured.
      if(facebook){
        facebook.hidden=true;
        facebook.disabled=true;
        facebook.title="Facebook Login tạm ngừng khi ứng dụng Meta chưa được mở công khai";
      }
      // Email/password is experimental on the isolated Preview only.
      // Never present this option on Production before verification/recovery is completed.
      const emailEnabled=Boolean(data.providers?.email);
      const emailButton=q("[data-auth-email]");
      emailButton.hidden=!emailEnabled;
      emailButton.disabled=!emailEnabled;
      if(!emailEnabled)emailButton.setAttribute("aria-expanded","false");
      const emailExpanded=emailEnabled && emailButton.getAttribute("aria-expanded")==="true";
      emailForm.hidden=!emailExpanded;
      q("[data-auth-forgot]").hidden=!emailExpanded||emailForm.dataset.mode==="register";
      q("[data-auth-toggle]").hidden=!emailExpanded;
      q("[data-auth-email-note]").hidden=emailEnabled;
      q("[data-auth-unverified-caption]").hidden=!emailExpanded;
      authOptions.hidden=active;signed.hidden=!active;
      // The storefront bridge owns cloud preferences; no password/PII leaves the authenticated API.
      window.sdAccountBridge?.onAuth(active);
      if(guest)guest.hidden=active;
      if(active){
        $name.textContent=data.user?.name||"Khách hàng";
        const names={zalo:"Zalo",google:"Google",facebook:"Facebook",email:"Email"};
        $provider.textContent=names[data.user?.provider]||"Tài khoản";
      }
    }catch{notify("Chưa kết nối được tài khoản. Bạn vẫn có thể đặt hàng không cần đăng nhập.");}
  };
  q('[data-auth-zalo]').addEventListener("click",()=>{location.assign("/api/customer/auth/zalo/start");});
  q('[data-auth-google]').addEventListener("click",()=>{location.assign("/api/customer/auth/google/start");});
  q('[data-auth-facebook]').addEventListener("click",()=>{location.assign("/api/customer/auth/facebook/start");});
  q('[data-auth-email]').addEventListener("click",()=>{
    const button=q("[data-auth-email]");
    if(button.disabled)return;
    const expanded=button.getAttribute("aria-expanded")==="true";
    button.setAttribute("aria-expanded",String(!expanded));
    emailForm.hidden=expanded;
    q("[data-auth-toggle]").hidden=expanded;
    q("[data-auth-unverified-caption]").hidden=expanded;
    q("[data-auth-forgot]").hidden=expanded||emailForm.dataset.mode==="register";
    if(expanded)window.sdEmailFlow?.show("close");
    if(!expanded)q('[name="customer_email"]')?.focus({preventScroll:true});
  });
  q('[data-auth-toggle]').addEventListener("click",()=>{
    const register=emailForm.dataset.mode!=="register";
    emailForm.dataset.mode=register?"register":"login";
    q("[data-auth-name-row]").hidden=!register;
    q("[data-auth-submit]").textContent=register?"Tạo tài khoản":"Đăng nhập bằng Email";
    q("[data-auth-toggle]").textContent=register?"Đã có tài khoản? Đăng nhập":"Chưa có tài khoản? Đăng ký";
    q("[data-auth-password-hint]")?.toggleAttribute("hidden",!register);
    q("[data-auth-forgot]").hidden=register;
    q('[name="customer_password"]').autocomplete=register?"new-password":"current-password";
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
      if(!res.ok){
        notify(data.error||"Đăng nhập không thành công.");
        if(res.status===403&&payload.mode==="login")window.sdEmailFlow?.show("verify",payload.email);
        return;
      }
      if(data.verification_required){
        emailForm.reset();notify(data.message||"Kiểm tra Email để xác minh.","success");
        window.sdEmailFlow?.show("verify",payload.email);
        return;
      }
      emailForm.reset();notify("Đăng nhập thành công.","success");
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
