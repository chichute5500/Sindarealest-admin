import {getAccount,json,error,sameOrigin} from "../../_customer-auth.js";
import {readJsonBodyLimited} from "../../_lib.js";
const clean=(v,max)=>typeof v==="string"?v.trim().slice(0,max):"";
const fail=(msg,status=400)=>error(msg,status);
async function accountFrom(env,request){
 if(!env?.DB)return null;
 return getAccount(env,request);
}
export async function onRequestGet({request,env}){
 try{
  const account=await accountFrom(env,request);
  if(!account)return fail("Bạn cần đăng nhập Google.",401);
  const [favorites,address]=await Promise.all([
   env.DB.prepare("SELECT product_key FROM customer_account_favorites WHERE account_id=? ORDER BY created_at DESC LIMIT 100").bind(account.id).all(),
   env.DB.prepare("SELECT full_name,phone,email,province_code,province,ward_code,ward,street_address FROM customer_account_shipping WHERE account_id=?").bind(account.id).first()
  ]);
  return json({ok:true,accountId:account.id,favorites:(favorites.results||[]).map(r=>r.product_key),
    address:address?{fullName:address.full_name,phone:address.phone,email:address.email,
      provinceCode:address.province_code,province:address.province,
      wardCode:address.ward_code,ward:address.ward,streetAddress:address.street_address}:null});
 }catch{return fail("Chưa đọc được hồ sơ tài khoản.",503)}
}
export async function onRequestPut({request,env}){
 if(!sameOrigin(request))return fail("Yêu cầu không hợp lệ.",403);
 try{
  const account=await accountFrom(env,request);
  if(!account)return fail("Bạn cần đăng nhập Google.",401);
  const parsed=await readJsonBodyLimited(request,16*1024);
  if(parsed.error || !parsed.value || typeof parsed.value!=="object" || Array.isArray(parsed.value))return fail("Dữ liệu không hợp lệ.");
  const body=parsed.value;
  if(body.action==="favorites"){
   if(!Array.isArray(body.favorites)||body.favorites.length>100 ||
      body.favorites.some(x=>typeof x!=="string"||!/^[\w.:-]{1,100}$/.test(x)))return fail("Danh sách yêu thích không hợp lệ.");
   const keys=[...new Set(body.favorites)];
   const statements=[env.DB.prepare("DELETE FROM customer_account_favorites WHERE account_id=?").bind(account.id),
     ...keys.map(key=>env.DB.prepare("INSERT INTO customer_account_favorites(account_id,product_key) VALUES(?,?)").bind(account.id,key))];
   await env.DB.batch(statements);
   return json({ok:true,favorites:keys});
  }
  if(body.action==="address"){
   const a=body.address;
   if(!a||typeof a!=="object"||Array.isArray(a))return fail("Địa chỉ không hợp lệ.");
   const fullName=clean(a.fullName,120),phone=clean(a.phone,24),email=clean(a.email,160),
     province=clean(a.province,100),provinceCode=clean(a.provinceCode,12),
     ward=clean(a.ward,120),wardCode=clean(a.wardCode,12),
     street=clean(a.streetAddress,300);
   if(fullName.length<2||!/^[+0-9() .-]{9,20}$/.test(phone)||
      (email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||
      !province||!ward||!street||!provinceCode||!wardCode)return fail("Vui lòng nhập đầy đủ địa chỉ hợp lệ.");
   await env.DB.prepare("INSERT INTO customer_account_shipping(account_id,full_name,phone,email,province_code,province,ward_code,ward,street_address,updated_at) VALUES(?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(account_id) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,email=excluded.email,province_code=excluded.province_code,province=excluded.province,ward_code=excluded.ward_code,ward=excluded.ward,street_address=excluded.street_address,updated_at=datetime('now')").bind(account.id,fullName,phone,email,provinceCode,province,wardCode,ward,street).run();
   return json({ok:true,address:{fullName,phone,email,provinceCode,province,wardCode,ward,streetAddress:street}});
  }
  return fail("Thao tác không hỗ trợ.");
 }catch{return fail("Chưa lưu được dữ liệu tài khoản.",503)}
}
