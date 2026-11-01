import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";

export async function onRequestPatch(context){
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,4*1024);
  if(parsed.error||!parsed.value||typeof parsed.value!=="object")return fail("Thông tin giao hàng không hợp lệ.",parsed.error==="too_large"?413:400);
  const body=parsed.value,id=String(body.id||""),deliveryStatus=String(body.deliveryStatus||"");
  if(!id||!['failed_returning','returned'].includes(deliveryStatus))return fail("Trạng thái giao hàng không hợp lệ.");
  try{
    const order=await context.env.DB.prepare("SELECT id,status,delivery_status FROM orders WHERE id=? LIMIT 1").bind(id).first();
    if(!order)return fail("Không tìm thấy đơn hàng.",404);
    if(order.status!=='shipped'||!['in_transit','failed_returning'].includes(order.delivery_status))return fail("Chỉ cập nhật kết quả cho đơn đang giao hoặc đang hoàn hàng.",409);
    if(deliveryStatus==='failed_returning'&&order.delivery_status!=='in_transit')return fail("Đơn đã vào bước hoàn hàng.",409);
    if(deliveryStatus==='returned'&&order.delivery_status!=='failed_returning')return fail("Chỉ xác nhận hàng đã về Shop sau khi đánh dấu giao thất bại.",409);
    const eventId=crypto.randomUUID();
    const result=await context.env.DB.batch([
      context.env.DB.prepare("UPDATE orders SET delivery_status=?,updated_at=datetime('now') WHERE id=? AND status='shipped' AND delivery_status=?").bind(deliveryStatus,id,order.delivery_status),
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'admin','order_delivery_updated','order',?,? WHERE changes()=1").bind(eventId,id,JSON.stringify({from:order.delivery_status,to:deliveryStatus}))
    ]);
    if(Number(result?.[0]?.meta?.changes||0)!==1)return fail("Trạng thái giao hàng vừa thay đổi. Tải lại đơn rồi thử lại.",409);
    return json({ok:true,deliveryStatus,message:deliveryStatus==='returned'?'Đã xác nhận hàng hoàn về Shop. COD chưa được ghi nhận.':'Đã ghi nhận giao thất bại; chờ hàng hoàn về Shop. COD chưa được ghi nhận.'});
  }catch{return fail("Không cập nhật được trạng thái giao hàng.",503)}
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
export async function onRequestPost(){return fail("Phương thức không được hỗ trợ.",405)}
