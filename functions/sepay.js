const SIGNED_FIELDS = ["order_amount","merchant","currency","operation","order_description","order_invoice_number","customer_id","payment_method","success_url","error_url","cancel_url"];
const encoder = new TextEncoder();
function toBase64(bytes) { let binary=""; for(const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary); }
function getConfig(env) {
  const mode=String(env?.SEPAY_ENV||"sandbox").trim().toLowerCase();
  const merchantId=String(env?.SEPAY_MERCHANT_ID||"").trim();
  const merchantSecret=String(env?.SEPAY_MERCHANT_SECRET_KEY||"");
  const ipnSecret=String(env?.SEPAY_IPN_SECRET_KEY||"");
  if(!["sandbox","production"].includes(mode)||!merchantId||!merchantSecret||!ipnSecret) return null;
  if(merchantId.length>100||merchantSecret.length>500||ipnSecret.length>500) return null;
  return {mode,merchantId,merchantSecret,ipnSecret};
}
export function sepayPaymentReady(env) { return Boolean(getConfig(env)); }
export function sepayIpnSecret(env) { return getConfig(env)?.ipnSecret||""; }
export function constantTimeSecretMatch(actual,expected) {
  const a=encoder.encode(String(actual||"")),b=encoder.encode(String(expected||""));
  let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a[i]||0)^(b[i]||0);
  return difference===0;
}
export function parseVndAmount(value) {
  const raw=String(value??"").trim();if(!/^\d+(?:\.0+)?$/.test(raw))return null;
  const amount=Number(raw);return Number.isSafeInteger(amount)&&amount>0&&amount<=2_000_000_000?amount:null;
}
export async function createSepayCheckout({env,origin,invoiceNumber,amount,description,customerId,accessToken}) {
  const config=getConfig(env);
  if(!config||!Number.isSafeInteger(amount)||amount<=0||amount>2_000_000_000||!/^[A-Za-z0-9_-]{3,64}$/.test(String(invoiceNumber||"")))return null;
  let base;try{base=new URL(origin);if(base.protocol!=="https:"||base.origin!==origin)return null}catch{return null}
  const resultUrl=new URL("/payment-result.html",base);resultUrl.searchParams.set("order",invoiceNumber);resultUrl.searchParams.set("token",String(accessToken||""));
  // Keep the submitted input order aligned with SePay's signedFields
  // contract: optional customer_id/payment_method precede the callback URLs.
  const fields={order_amount:String(amount),merchant:config.merchantId,currency:"VND",operation:"PURCHASE",order_description:String(description||"Thanh toan don hang SinDarealest").slice(0,255),order_invoice_number:invoiceNumber};
  if(customerId)fields.customer_id=String(customerId).slice(0,100);
  fields.payment_method="BANK_TRANSFER";
  fields.success_url=resultUrl.toString();
  fields.error_url=resultUrl.toString();
  fields.cancel_url=resultUrl.toString();
  fields.lang="vi";
  const signed=SIGNED_FIELDS.filter(name=>Object.hasOwn(fields,name)).map(name=>name+"="+fields[name]).join(",");
  const key=await crypto.subtle.importKey("raw",encoder.encode(config.merchantSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=toBase64(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(signed))));
  return {url:config.mode==="production"?"https://pay.sepay.vn/v1/checkout/init":"https://pay-sandbox.sepay.vn/v1/checkout/init",fields:{...fields,signature},mode:config.mode};
}
