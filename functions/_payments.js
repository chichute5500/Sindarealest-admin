export function createOrderAccessToken() {
  // Read-only capability token for one order; store only its SHA-256 hash.
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

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
  const abc="ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes=crypto.getRandomValues(new Uint8Array(4));
  return digits.slice(-4)+"-"+cleanSku+"-"+Array.from(bytes,v=>abc[v%abc.length]).join("");
}
export function checkoutTransferReferenceMatches(reference,phone,sku) {
  const digits=String(phone||"").replace(/\D/g,"");
  return digits.length>=4&&String(reference||"").startsWith(digits.slice(-4)+"-"+sku+"-")&&
    /^[A-Z]{4}$/.test(String(reference).slice((digits.slice(-4)+"-"+sku+"-").length))&&
    String(reference).length===(digits.slice(-4)+"-"+sku+"-").length+4;
}
export function calculateCheckoutQuote(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50) return {eligible:false,reason:"Giỏ hàng không hợp lệ."};
  const types=new Set(items.map(item=>["in_stock","made_to_order"].includes(item.fulfillmentType)?item.fulfillmentType:"unclassified"));
  if(types.size!==1||types.has("unclassified"))return {eligible:false,reason:"Đơn có nhiều tình trạng hàng hoặc chưa xác định. Shop sẽ tư vấn và xác nhận thanh toán.",fulfillmentType:"unclassified"};
  const fulfillmentType=[...types][0];
  if(items.some(item=>!Number.isSafeInteger(item.unitPrice)||item.unitPrice<0||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>50))
    return {eligible:false,fulfillmentType,reason:"Sản phẩm chưa có giá xác nhận. Shop sẽ liên hệ tư vấn."};
  const total=items.reduce((sum,item)=>sum+item.unitPrice*item.quantity,0);
  if(!Number.isSafeInteger(total)||total<=0||total>2_000_000_000)return {eligible:false,fulfillmentType,reason:"Tổng tiền chưa hợp lệ; cần Shop xác nhận."};
  const deposit=fulfillmentType==="in_stock"?100000:Math.ceil((total*0.3)/100000)*100000;
  const fullAmount=discountedCheckoutFullAmount(total);
  if(!Number.isSafeInteger(deposit)||deposit<=0||deposit>total||!Number.isSafeInteger(fullAmount)||fullAmount<=0)
    return {eligible:false,fulfillmentType,reason:"Khoản cọc hoặc thanh toán không hợp lệ; Shop sẽ tư vấn thủ công."};
  return {eligible:true,fulfillmentType,total,options:[
    {value:"deposit",amount:deposit,remainingAmount:total-deposit,discountAmount:0,label:fulfillmentType==="in_stock"?"Đặt cọc 100.000đ":"Đặt cọc 30%",shippingBenefit:"standard_shipping"},
    {value:"full",amount:fullAmount,remainingAmount:0,discountAmount:total-fullAmount,label:"Chuyển khoản toàn bộ · Giảm 5%",shippingBenefit:"free_shipping"}
  ]};
}
