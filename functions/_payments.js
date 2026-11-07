export function createOrderAccessToken() {
  // Read-only capability token for one order; store only its SHA-256 hash.
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export const MIN_CHECKOUT_TRANSFER_AMOUNT = 2_000;

export async function hashOrderAccessToken(token) {
  const bytes = new TextEncoder().encode(String(token || ""));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map(value => value.toString(16).padStart(2, "0")).join("");
}

export function validPublicQrImageKey(value) {
  return typeof value === "string" && /^qr-[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/.test(value);
}

export function summarizePaymentRows(rows, total) {
  let received = 0, refunded = 0;
  for (const row of rows || []) {
    const amount = Number(row.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    if (row.direction === "received") received += amount;
    else if (row.direction === "refunded") refunded += amount;
  }
  const netReceived = received - refunded;
  const knownTotal = total === null || total === undefined || total === "" ? null : (Number.isSafeInteger(Number(total)) ? Number(total) : null);
  return {
    receivedAmount: received, refundedAmount: refunded, netReceivedAmount: netReceived,
    remainingBalance: knownTotal === null ? null : Math.max(knownTotal - netReceived, 0),
    overpaidAmount: knownTotal === null ? null : Math.max(netReceived - knownTotal, 0),
  };
}


// Shared read-only checkout quote calculation. Public browsers can choose a
// payment *preference*, never author an amount or set verified payment status.
export function discountedCheckoutFullAmount(total) {
  if(!Number.isSafeInteger(total)||total<0||total>2_000_000_000) return null;
  return total-Math.round(total*0.05);
}

export function checkoutTransferSku(items) {
  if(!Array.isArray(items)||!items.length)return "";
  const skus=items.map(item=>String(item.sku||"").toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,32));
  if(skus.some(x=>!x))return "";
  // Multi-product orders use their first SKU plus an explicit item-count suffix.
  return skus[0]+(skus.length>1?"X"+skus.length:"");
}
export function makeCheckoutTransferReference(phone,sku) {
  const digits=String(phone||"").replace(/\D/g,"");
  const cleanSku=String(sku||"").toUpperCase();
  if(digits.length<4||!/^[A-Z0-9-]{1,36}$/.test(cleanSku))return "";
  const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes=crypto.getRandomValues(new Uint8Array(8));
  return "SD-"+Array.from(bytes,v=>abc[v%abc.length]).join("");
}
export function checkoutTransferReferenceMatches(reference,phone,sku) {
  const digits=String(phone||"").replace(/\D/g,"");
  return digits.length>=4&&/^[A-Z0-9-]{1,36}$/.test(String(sku||""))&&/^SD-[A-Z2-9]{8}$/.test(String(reference||""));
}
export function calculateCheckoutQuote(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50) return {eligible:false,reason:"Giỏ hàng không hợp lệ."};
  if(items.some(item=>!Number.isSafeInteger(item.unitPrice)||item.unitPrice<0||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>50))
    return {eligible:false,reason:"Sản phẩm chưa có giá xác nhận. Shop sẽ liên hệ tư vấn."};
  const total=items.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0);
  if(!Number.isSafeInteger(total)||total<=0||total>2_000_000_000)return {eligible:false,reason:"Tổng tiền chưa hợp lệ; cần Shop xác nhận."};
  if(total<MIN_CHECKOUT_TRANSFER_AMOUNT)return {eligible:false,reason:"Thanh toán qua ngân hàng cần từ 2.000đ trở lên; Shop sẽ tư vấn thủ công."};
  // Fixed 100k for all-in-stock carts. Other cart types retain their
  // current percentage policy pending a separate mixed-cart decision.
  const types=new Set(items.map(item=>item?.fulfillmentType));
  const fulfillmentType=types.size===1&&types.has("in_stock")?"in_stock":types.size===1&&types.has("made_to_order")?"made_to_order":"unclassified";
  // Keep the usual 100k ready-stock deposit and 100k rounded custom deposit.
  // For low-value test/sale items, use 30% with a 2k floor so the deposit
  // remains valid without exceeding the item total.
  const lowValueDeposit=total<100_000?Math.max(MIN_CHECKOUT_TRANSFER_AMOUNT,Math.ceil(total*0.3)):null;
  const deposit=lowValueDeposit??(fulfillmentType==="in_stock"?100000:Math.ceil((total*0.3)/100000)*100000);
  const fullAmount=discountedCheckoutFullAmount(total);
  if(!Number.isSafeInteger(deposit)||deposit<MIN_CHECKOUT_TRANSFER_AMOUNT||deposit>total||!Number.isSafeInteger(fullAmount)||fullAmount<=0)
    return {eligible:false,reason:"Khoản cọc hoặc thanh toán không hợp lệ; Shop sẽ tư vấn thủ công."};
  const depositLabel=lowValueDeposit!==null?`Đặt cọc ${deposit.toLocaleString("vi-VN")}đ`:fulfillmentType==="in_stock"?"Đặt cọc 100.000đ":"Đặt cọc 30%";
  const options=[{value:"deposit",amount:deposit,requiredAmount:deposit,remainingAmount:total-deposit,codExpected:total-deposit,discountAmount:0,label:depositLabel,shippingBenefit:"standard_shipping"}];
  if(Number.isSafeInteger(fullAmount)&&fullAmount>=MIN_CHECKOUT_TRANSFER_AMOUNT)options.push({value:"full",amount:fullAmount,requiredAmount:fullAmount,remainingAmount:0,codExpected:0,discountAmount:total-fullAmount,label:"Thanh toán toàn bộ · Giảm 5%",shippingBenefit:"free_shipping"});
  return {eligible:true,total,fulfillmentType,options};
}

// Canonical server-side view of verified order money. Only rows written by an
// authenticated Admin are authoritative; a browser transfer claim is never an
// input. Legacy COD rows are deliberately excluded from bank receipts.
export function summarizeOrderPayment({total,paymentOption,transactions=[],codReceivedAmount=0,termsConfirmed=false,hasPendingRequest=false,agreedAmount=null}={}) {
  const knownTotal=Number.isSafeInteger(Number(total))&&Number(total)>0&&Number(total)<=2_000_000_000?Number(total):null;
  const option=["deposit","full"].includes(paymentOption)?paymentOption:null;
  const quote=knownTotal===null?null:calculateCheckoutQuote([{unitPrice:knownTotal,quantity:1}]);
  const selected=quote?.options.find(item=>item.value===option)||null;
  // Checkout's persisted agreement takes precedence over future pricing policy.
  const snapshot=agreedAmount===null||agreedAmount===undefined||agreedAmount===""?null:Number(agreedAmount);
  const preserved=knownTotal!==null&&option&&Number.isSafeInteger(snapshot)&&snapshot>0&&snapshot<=knownTotal?snapshot:null;
  let receivedAmount=0,refundedAmount=0;
  for(const row of transactions||[]){
    if(row?.actor==="admin_cod_completion")continue;
    const amount=Number(row?.amount);
    if(!Number.isSafeInteger(amount)||amount<=0)continue;
    if(row.direction==="received")receivedAmount+=amount;
    else if(row.direction==="refunded")refundedAmount+=amount;
  }
  const netReceivedAmount=Math.max(0,receivedAmount-refundedAmount);
  const codReceived=Number.isSafeInteger(Number(codReceivedAmount))&&Number(codReceivedAmount)>0?Number(codReceivedAmount):0;
  const requiredAmount=preserved??selected?.amount??null;
  const shortfall=requiredAmount===null?null:Math.max(0,requiredAmount-netReceivedAmount);
  const overpaidAmount=requiredAmount===null?null:Math.max(0,netReceivedAmount-requiredAmount);
  const codExpected=requiredAmount===null?null:option==="deposit"?knownTotal-requiredAmount:0;
  const discountAmount=option==="full"&&requiredAmount!==null?knownTotal-requiredAmount:0;
  const codRemaining=option==="deposit"&&codExpected!==null
    ?Math.max(0,codExpected-Math.max(0,netReceivedAmount-requiredAmount)):option==="full"?0:null;
  const eligibleToShip=Boolean(termsConfirmed&&requiredAmount!==null&&shortfall===0);
  const paidInFull=option==="full"?shortfall===0:knownTotal!==null&&netReceivedAmount+codReceived>=knownTotal;
  const status=!termsConfirmed?"waiting_shop_confirmation":requiredAmount===null?"payment_terms_unavailable":shortfall>0?(netReceivedAmount>0?"additional_payment_required":hasPendingRequest?"waiting_shop_verification":"waiting_for_payment"):paidInFull?"paid_in_full":"eligible_to_ship";
  return {total:knownTotal,paymentOption:option,requiredAmount,discountAmount,receivedAmount,refundedAmount,netReceivedAmount,shortfall,overpaidAmount,codExpected,codRemaining,codReceivedAmount:codReceived,eligibleToShip,paidInFull,status};
}
