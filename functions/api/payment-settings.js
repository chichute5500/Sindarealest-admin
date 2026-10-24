import { dbOrFail, fail, getSetting, json } from "../_lib.js";
import { validPublicQrImageKey } from "../_payments.js";
export async function onRequestGet({ env }) {
  const unavailable = dbOrFail(env); if (unavailable) return unavailable;
  try {
    const [activeFlag,key,bankName,accountNumber,accountName,instructions] = await Promise.all([
      getSetting(env.DB,"payment_qr_active","0"), getSetting(env.DB,"payment_qr_active_key",""),
      getSetting(env.DB,"payment_qr_bank_name",""), getSetting(env.DB,"payment_qr_account_number",""),
      getSetting(env.DB,"payment_qr_account_name",""), getSetting(env.DB,"payment_qr_instructions","")
    ]);
    const activeConfig = activeFlag === "1" && validPublicQrImageKey(key) && bankName && accountNumber && accountName;
    const imageAvailable = Boolean(activeConfig && typeof env.IMAGES?.head === "function" && await env.IMAGES.head(key));
    const configured = Boolean(activeConfig && imageAvailable);
    return json({
      configured:Boolean(configured), qrImageUrl:configured?"/payment-qr/"+key:"",
      bankName:configured?bankName:"", accountNumber:configured?accountNumber:"",
      accountName:configured?accountName:"", instructions:configured?instructions:""
    });
  } catch { return fail("Chưa thể đọc hướng dẫn chuyển khoản.",503); }
}
export async function onRequestPut() { return fail("Phương thức không được hỗ trợ.",405); }
