import { dbOrFail, fail, getSetting, json, normalizeFulfillmentType, readJsonBodyLimited } from "../_lib.js";
import { calculateCheckoutQuote, validPublicQrImageKey, checkoutTransferSku, makeCheckoutTransferReference } from "../_payments.js";
import { normalizeProductOption } from "../_product-options.js";

const NO_STORE={"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"};

export async function onRequestPost({request,env}) {
  const origin=request.headers.get("Origin");
  if(origin){try{if(new URL(origin).origin!==new URL(request.url).origin)return fail("Yêu cầu không hợp lệ.",403)}catch{return fail("Yêu cầu không hợp lệ.",403)}}
  const unavailable=dbOrFail(env);if(unavailable)return unavailable;
  const parsed=await readJsonBodyLimited(request,8192);
  if(parsed.error)return fail("Dữ liệu giỏ hàng không hợp lệ.",parsed.error==="too_large"?413:400);
  const entries=parsed.value?.items;
  if(!Array.isArray(entries)||entries.length<1||entries.length>50)return fail("Giỏ hàng không hợp lệ.");
  const requested=new Map();
  for(const item of entries){
    const id=String(item?.id||"").trim(),quantity=Number(item?.quantity);
    if(!id||id.length>100||!Number.isInteger(quantity)||quantity<1||quantity>50||(item?.option!=null&&typeof item.option!=="string"))return fail("Sản phẩm, lựa chọn hoặc số lượng không hợp lệ.");
    requested.set(id,(requested.get(id)||0)+quantity);
  }
  if([...requested.values()].some(q=>q>50))return fail("Số lượng mỗi sản phẩm vượt giới hạn.");
  try{
    const ids=[...requested.keys()];
    const result=await env.DB.prepare("SELECT id,sku,title,category,price,published,source_price_confirmed,stock,fulfillment_type FROM products WHERE id IN ("+ids.map(()=>"?").join(",")+")").bind(...ids).all();
    const byId=new Map((result.results||[]).map(p=>[p.id,p]));
    if(ids.some(id=>!byId.has(id)||Number(byId.get(id).published)!==1))return fail("Sản phẩm đã thay đổi. Vui lòng tải lại trang.",409);
    for(const item of entries){
      const option=normalizeProductOption(byId.get(String(item.id||"").trim()).category,item?.option??"");
      if(option===null)return fail("Vui lòng chọn đúng size, bản dây hoặc dòng điện thoại cho sản phẩm.",400);
    }
    for(const id of ids){
      const stock=byId.get(id).stock;
      if(stock!==null&&stock!==undefined&&requested.get(id)>Number(stock))return fail("Số lượng hàng vượt tồn kho ghi nhận; vui lòng liên hệ cửa hàng.",409);
    }
    const sku=checkoutTransferSku(ids.map(id=>byId.get(id)));
    const phone=String(parsed.value?.phone||"");
    const transferReference=/^[+0-9() .-]{9,20}$/.test(phone)?makeCheckoutTransferReference(phone,sku):"";
    const showPrices=(await getSetting(env.DB,"show_prices","0"))==="1";
    const quote=calculateCheckoutQuote(ids.map(id=>{
      const p=byId.get(id);const raw=p.price;
      const price=raw===null||raw===undefined||(typeof raw==="string"&&!raw.trim())?null:Number(raw);
      const unitPrice=showPrices&&Number(p.source_price_confirmed)===1&&Number.isSafeInteger(price)&&price>=0?price:null;
      return {fulfillmentType:normalizeFulfillmentType(p.fulfillment_type),quantity:requested.get(id),unitPrice};
    }));
    if(!quote.eligible)return json({ok:true,quoteReady:false,paymentReady:false,reason:quote.reason,fulfillmentType:quote.fulfillmentType||"unclassified",options:[]},200,NO_STORE);
    const keys=await Promise.all(["payment_qr_active","payment_qr_active_key","payment_qr_bank_name","payment_qr_account_number","payment_qr_account_name","payment_qr_instructions"].map(k=>getSetting(env.DB,k,"")));
    const [active,key,bankName,accountNumber,accountName,instructions]=keys;
    const selectedOption=parsed.value?.paymentOption==="deposit"||parsed.value?.paymentOption==="full"?parsed.value.paymentOption:"";
    const selected=selectedOption?quote.options.find(option=>option.value===selectedOption):null;
    if(selectedOption&&(!selected||parsed.value?.quotedTotal!==quote.total))return fail("Giá trị hoặc cách thanh toán đã thay đổi. Vui lòng kiểm tra lại.",409);
    const configured=Boolean(transferReference)&&active==="1"&&validPublicQrImageKey(key)&&!!bankName&&!!accountNumber&&!!accountName
      &&typeof env.IMAGES?.head==="function"&&Boolean(await env.IMAGES.head(key));
    const paymentDetails=selectedOption&&configured?{status:"ready",qrImageUrl:"/payment-qr/"+key,qrIncludesAmount:false,amount:selected.amount,bankName,accountName,accountNumber,transferContent:transferReference}:null;
    return json({ok:true,quoteReady:true,paymentReady:Boolean(configured),fulfillmentType:quote.fulfillmentType,total:quote.total,options:quote.options,
      reason:configured?"":(!transferReference?"Cần số điện thoại hợp lệ và mã SKU trước khi hiện QR.":"QR ngân hàng chưa được Shop kích hoạt hoặc xác minh. Chưa chuyển khoản; vẫn có thể gửi yêu cầu đặt hàng."),
      ...(selectedOption?{paymentOption:selectedOption,selectedPaymentAmount:selected.amount,paymentInstructions:paymentDetails,transferReference:configured?transferReference:"",paymentQrImageKey:configured?key:""}:{}),
      transferReferenceAvailableAfterSubmit:false
    },200,NO_STORE);
  }catch{return fail("Không kiểm tra được hình thức thanh toán. Vui lòng thử lại.",503)}
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
