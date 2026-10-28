/* Enhancement to existing Owner-PASS Account drawer. Keeps guest checkout unchanged. */
const root=document.getElementById("sdCustomerAuth");
if(root){
  const q=s=>root.querySelector(s);
  const authOptions=q("[data-auth-options]"),signed=q("[data-auth-signed]");
  const emailForm=q("form"),message=q("[data-auth-message]");
  const guest=root.parentElement?.querySelector(".account-guest");
  const $name=q("[data-auth-user]"),$provider=q("[data-auth-provider]");
  const notify=(text)=>{message.textContent=text||"";};
  const params=new URLSearchParams(window.location.search);
  if(params.has("customer_auth")){
    notify(params.get("customer_auth")==="success"?"Đã đăng nhập thành công.":"Đăng nhập chưa thành công. Vui lòng thử lại.");
    params.delete("customer_auth");
    const rest=window.location.pathname+(params.size?"?"+params:"")+window.location.hash;
    history.replaceState(history.state,"",rest);
  }
  const refresh=async()=>{
    try{
      const res=await fetch("/api/customer/session",{credentials:"same-origin",cache:"no-store"});
      if(!res.ok)return;
      const data=await res.json(),active=!!data.authenticated;
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
