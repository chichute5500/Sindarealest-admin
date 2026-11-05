import { fail, getCurrentDateInVietnam, json, readJsonBodyLimited, requireAdmin, warrantyStatusOnDate } from "../../_lib.js";
import { addWarrantyCalendarMonths, createWarrantyPolicySnapshot, generateShortWarrantyCode, isWarrantyCodeCollisionError, readWarrantyPolicySnapshot } from "../../_warranty-policy.js";
import { normalizeManualWarrantyContact } from "../../_warranty-contact.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare(`SELECT wc.id,wc.order_id AS orderId,o.order_number AS orderNumber,COALESCE(oc.full_name,c.full_name) AS fullName,COALESCE(oc.phone,c.phone) AS phone,wc.warranty_code AS warrantyCode,wc.message,wc.status,wc.admin_note AS adminNote,wc.created_at AS createdAt,a.image_key AS imageKey FROM warranty_claims wc JOIN orders o ON o.id=wc.order_id JOIN customers c ON c.id=wc.customer_id LEFT JOIN order_contact_details oc ON oc.order_id=wc.order_id LEFT JOIN warranty_claim_attachments a ON a.claim_id=wc.id ORDER BY wc.created_at DESC LIMIT 1000`).all();
    const [issued, manualIssued] = await Promise.all([
      context.env.DB.prepare(`SELECT w.id,w.warranty_code AS warrantyCode,w.policy_name AS policyName,w.duration_months AS durationMonths,w.starts_at AS startsAt,w.ends_at AS endsAt,w.status AS status,o.order_number AS orderNumber,oi.sku,oi.sku_verified AS skuVerified,oi.title,COALESCE(oc.full_name,c.full_name) AS fullName,COALESCE(oc.phone,c.phone) AS phone,'' AS address,NULL AS price,w.policy_snapshot_json AS policySnapshotJson,'order' AS source FROM warranties w JOIN orders o ON o.id=w.order_id JOIN order_items oi ON oi.id=w.order_item_id JOIN customers c ON c.id=o.customer_id LEFT JOIN order_contact_details oc ON oc.order_id=o.id ORDER BY w.created_at DESC LIMIT 1000`).all(),
      context.env.DB.prepare(`SELECT id,warranty_code AS warrantyCode,policy_name AS policyName,duration_months AS durationMonths,starts_at AS startsAt,ends_at AS endsAt,status,'Mua trực tiếp' AS orderNumber,'' AS sku,0 AS skuVerified,product_name AS title,customer_name AS fullName,customer_phone AS phone,customer_address AS address,customer_contact_reference AS contactReference,price,policy_snapshot_json AS policySnapshotJson,'manual' AS source FROM manual_warranties ORDER BY created_at DESC LIMIT 1000`).all(),
    ]);
    const today = getCurrentDateInVietnam();
    const warranties = [...(issued.results || []), ...(manualIssued.results || [])].map((warranty) => ({
      ...warranty,
      status: warrantyStatusOnDate(warranty.status, warranty.startsAt, warranty.endsAt, today),
      policy:readWarrantyPolicySnapshot(warranty.policySnapshotJson),
    })).sort((a,b)=>String(b.startsAt).localeCompare(String(a.startsAt)));
    return json({ claims: result.results || [], warranties });
  } catch { return fail("Không đọc được dữ liệu bảo hành. Hãy kiểm tra các migration 0003, 0005 và 0007.", 503); }
}
export async function onRequestPatch(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Dữ liệu cập nhật bảo hành vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Dữ liệu cập nhật không hợp lệ.");
  const body = parsedBody.value;
  if (body.source === "manual") return updateManualWarranty(context,body);
  const id = String(body?.id || ""), status = String(body?.status || ""), note = String(body?.adminNote || "").trim().slice(0,1600);
  if (!id || !["received","reviewing","approved","rejected","resolved"].includes(status)) return fail("Trạng thái yêu cầu không hợp lệ.");
  try {
    const result = await context.env.DB.batch([
      context.env.DB.prepare("UPDATE warranty_claims SET status=?,admin_note=?,updated_at=datetime('now') WHERE id=?").bind(status,note,id),
      context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?, 'admin', 'warranty_claim_updated', 'warranty_claim', ?, ? " +
        "WHERE EXISTS (SELECT 1 FROM warranty_claims WHERE id=?)",
      ).bind(crypto.randomUUID(),id,JSON.stringify({ status }),id),
    ]);
    if (!result[0]?.meta?.changes) return fail("Không tìm thấy yêu cầu bảo hành.",404);
    return json({ ok:true,message:"Đã cập nhật yêu cầu hỗ trợ." });
  } catch { return fail("Không thể cập nhật yêu cầu hỗ trợ.",503); }
}


async function updateManualWarranty(context, body) {
  const id=typeof body.id==="string" ? body.id.trim() : "";
  const action=body.action==="void" ? "void" : body.action==="update" ? "update" : null;
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)||!action)
    return fail("Mã phiếu hoặc thao tác cập nhật không hợp lệ.");
  const db=context.env.DB;
  try {
    const row=await db.prepare("SELECT id,warranty_code,customer_name,customer_phone,customer_address,customer_contact_reference,product_name,price,policy_name,duration_months,starts_at,ends_at,status,policy_snapshot_json FROM manual_warranties WHERE id=? LIMIT 1").bind(id).first();
    if(!row)return fail("Không tìm thấy phiếu bảo hành trực tiếp.",404);
    if(row.status==="void")return fail("Phiếu đã hủy, không thể sửa hoặc hủy lại.",409);
    let statements, next=null;
    const original={ warrantyCode:row.warranty_code, status:row.status };
    if(action==="void"){
      const reason=typeof body.reason==="string" ? body.reason.trim().slice(0,300) : "";
      if(reason.length<3)return fail("Cần nhập lý do hủy phiếu (ít nhất 3 ký tự).");
      statements=[
        db.prepare("UPDATE manual_warranties SET status='void' WHERE id=? AND status!='void' AND warranty_code=?")
          .bind(id,row.warranty_code),
        db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'admin','manual_warranty_voided','manual_warranty',?,? WHERE changes()=1")
          .bind(crypto.randomUUID(),id,JSON.stringify({warrantyCode:row.warranty_code,reason})),
      ];
      next={status:"void"};
    }else{
      const clean=(value,max)=>typeof value==="string" ? value.trim().slice(0,max) : "";
      const customerName=clean(body.customerName,120),customerPhone=clean(body.customerPhone,32);
      const customerAddress=clean(body.customerAddress,500),productName=clean(body.productName,180);
      const contactReference=normalizeManualWarrantyContact(body.contactReference);
      const digits=customerPhone.replace(/\D/g,"");
      const priceRaw=body.price,monthsRaw=body.durationMonths;
      const price=(typeof priceRaw==="number"||(typeof priceRaw==="string"&&/^\d+$/.test(priceRaw))) ? Number(priceRaw):NaN;
      const months=(typeof monthsRaw==="number"||(typeof monthsRaw==="string"&&/^\d+$/.test(monthsRaw))) ? Number(monthsRaw):NaN;
      const startsAt=clean(body.startsAt,10);
      if(customerName.length<2||!/^[+0-9().\s/-]+$/.test(customerPhone)||!/^\d{9,12}$/.test(digits)||
        customerAddress.length<5||productName.length<2||contactReference===null||!Number.isSafeInteger(price)||price<0||price>2_000_000_000||
        !Number.isInteger(months)||months<1||months>120)
        return fail("Tên, SĐT, địa chỉ, sản phẩm, giá hoặc thời hạn bảo hành chưa hợp lệ.");
      let endsAt;
      try{endsAt=addWarrantyCalendarMonths(startsAt,months)}
      catch{return fail("Ngày bắt đầu bảo hành chưa hợp lệ.")}
      if(row.policy_snapshot_json&&(price!==row.price||months!==row.duration_months||startsAt!==row.starts_at))
        return fail("Giá và thời hạn đã cố định lúc cấp phiếu, không thể sửa sau phát hành.",409);
      next={customer_name:customerName,customer_phone:customerPhone,customer_address:customerAddress,
        customer_contact_reference:contactReference,product_name:productName,price,duration_months:months,starts_at:startsAt,ends_at:endsAt};
      if(Object.entries(next).every(([key,value])=>row[key]===value))
        return fail("Không có thay đổi nào để lưu.",409);
      // Guard against another Admin changing the same record between read and write.
      statements=[
        db.prepare("UPDATE manual_warranties SET customer_name=?,customer_phone=?,customer_address=?,customer_contact_reference=?,product_name=?,price=?,duration_months=?,starts_at=?,ends_at=? WHERE id=? AND status!='void' AND warranty_code=? AND customer_name=? AND customer_phone=? AND customer_contact_reference=? AND product_name=? AND price=? AND duration_months=? AND starts_at=? AND ends_at=?")
          .bind(customerName,customerPhone,customerAddress,contactReference,productName,price,months,startsAt,endsAt,
            id,row.warranty_code,row.customer_name,row.customer_phone,row.customer_contact_reference,row.product_name,
            row.price,row.duration_months,row.starts_at,row.ends_at),
        db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'admin','manual_warranty_updated','manual_warranty',?,? WHERE changes()=1")
          .bind(crypto.randomUUID(),id,JSON.stringify({
            warrantyCode:row.warranty_code,fields:Object.entries(next).filter(([key,val])=>row[key]!==val).map(([key])=>key)
          })),
      ];
    }
    const result=await db.batch(statements);
    if(!Array.isArray(result)||result.length!==2||result.some(entry=>entry?.success===false))
      return fail("Không thể xác nhận cập nhật bảo hành.",503);
    if(Number(result[0]?.meta?.changes)!==1)
      return fail("Phiếu vừa được thay đổi ở phiên khác hoặc đã hủy. Hãy tải lại.",409);
    const saved=await db.prepare("SELECT id,warranty_code,customer_name,customer_phone,customer_address,customer_contact_reference,product_name,price,duration_months,starts_at,ends_at,status FROM manual_warranties WHERE id=? LIMIT 1").bind(id).first();
    if(!saved||saved.warranty_code!==original.warrantyCode||
       Object.entries(next).some(([key,value])=>saved[key]!==value))
      return fail("Chưa xác minh được phiếu sau cập nhật. Hãy kiểm tra danh sách trước khi thử lại.",503);
    return json({ok:true,warrantyCode:original.warrantyCode,status:saved.status,
      message:action==="void"?"Đã hủy hiệu lực phiếu bảo hành. Mã vẫn được giữ để tra cứu.":"Đã cập nhật phiếu bảo hành. Mã SDW được giữ nguyên."});
  }catch{return fail("Không thể cập nhật phiếu bảo hành trực tiếp.",503)}
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Thông tin cấp bảo hành vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Thông tin cấp bảo hành không hợp lệ.");
  const body = parsedBody.value;
  if (body?.source === "manual") return issueManualWarranty(context, body);
  const orderNumber = String(body?.orderNumber || "").trim().toUpperCase();
  const sku = String(body?.sku || "").trim().toUpperCase();
  const policyName = String(body?.policyName || "").trim().slice(0,160);
  // Browser FormData sends decimal strings. Accept those and numeric JSON integers,
  // but reject arrays/booleans that JavaScript Number() would silently coerce.
  const rawMonths = body?.durationMonths;
  const months = (typeof rawMonths === "number" ||
    (typeof rawMonths === "string" && /^\d+$/.test(rawMonths)))
    ? Number(rawMonths) : NaN;
  const startsAt = String(body?.startsAt || "").trim();
  if (!orderNumber || !sku || policyName.length < 3 || !Number.isInteger(months) || months < 1 || months > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(startsAt)) return fail("Cần nhập mã đơn, SKU, tên chính sách, thời hạn 1–120 tháng và ngày bắt đầu hợp lệ.");
  const startDate = new Date(`${startsAt}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime()) || startDate.toISOString().slice(0,10) !== startsAt) return fail("Ngày bắt đầu bảo hành không hợp lệ.");
  const endDate = new Date(startDate); const day = endDate.getUTCDate(); endDate.setUTCDate(1); endDate.setUTCMonth(endDate.getUTCMonth()+months); const lastDay = new Date(Date.UTC(endDate.getUTCFullYear(),endDate.getUTCMonth()+1,0)).getUTCDate(); endDate.setUTCDate(Math.min(day,lastDay));
  try {
    const item = await context.env.DB.prepare(`SELECT o.id AS orderId,o.status,oi.id AS itemId,oi.unit_price AS unitPrice,w.id AS existingWarrantyId FROM orders o JOIN order_items oi ON oi.order_id=o.id LEFT JOIN warranties w ON w.order_item_id=oi.id WHERE o.order_number=? AND upper(oi.sku)=? LIMIT 1`).bind(orderNumber,sku).first();
    if (!item) return fail("Không tìm thấy SKU trong đơn hàng.",404);
    if (item.existingWarrantyId) return fail("Sản phẩm này trong đơn đã có mã bảo hành.",409);
    if (item.status !== "completed") return fail("Chỉ phát hành bảo hành sau khi đơn hàng đã được đánh dấu hoàn tất.",409);
    if(!Number.isSafeInteger(item.unitPrice)||item.unitPrice<0)return fail("Thiếu đơn giá xác nhận để lưu chính sách bảo hành.",409);
    const snapshot=createWarrantyPolicySnapshot({unitPrice:item.unitPrice,durationMonths:months,startsAt,endsAt:endDate.toISOString().slice(0,10),policyName});
    // The 4-character code is easier to communicate than the older 24-digit
    // codes. Unique index is the final arbiter. Retry only a code collision;
    // a duplicate order item or status race is not a reason to create another.
    for (let attempt=0;attempt<8;attempt++) {
      const id=crypto.randomUUID(),warrantyCode=generateShortWarrantyCode();
      try {
        const issued = await context.env.DB.batch([
          context.env.DB.prepare(
            "INSERT INTO warranties(id,order_id,order_item_id,warranty_code,policy_name,duration_months,starts_at,ends_at,status,policy_snapshot_json) " +
            "SELECT ?,?,?,?,?,?,?,?,'active',? WHERE NOT EXISTS (SELECT 1 FROM warranties WHERE order_item_id=?) " +
            "AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='completed') " +
            "AND NOT EXISTS (SELECT 1 FROM manual_warranties WHERE upper(warranty_code)=?)",
          ).bind(id,item.orderId,item.itemId,warrantyCode,policyName,months,startsAt,endDate.toISOString().slice(0,10),snapshot,item.itemId,item.orderId,warrantyCode),
          context.env.DB.prepare(
            "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
            "SELECT ?, 'admin', 'warranty_issued', 'warranty', ?, ? WHERE EXISTS (SELECT 1 FROM warranties WHERE id=?)",
          ).bind(crypto.randomUUID(),id,JSON.stringify({ orderNumber,sku,policyName,months,startsAt,endsAt:endDate.toISOString().slice(0,10),warrantyCode }),id),
        ]);
        if (!issued[0]?.meta?.changes) {
          const codeCollision = await context.env.DB.prepare("SELECT id FROM manual_warranties WHERE upper(warranty_code)=? LIMIT 1").bind(warrantyCode).first();
          if (codeCollision) continue;
          return fail("Sản phẩm này trong đơn đã được cấp mã bảo hành.",409);
        }
        return json({ ok:true,warrantyCode,message:"Đã phát hành mã bảo hành. Hãy cung cấp mã này cho khách hàng qua kênh liên hệ an toàn." },201);
      } catch (error) {
        if (!isWarrantyCodeCollisionError(error) || attempt===7) throw error;
      }
    }
  } catch { return fail("Không thể phát hành bảo hành. Hãy kiểm tra migration 0003 và dữ liệu đơn hàng.",503); }
}


async function issueManualWarranty(context, body) {
  const clean = (value, max) => String(value ?? "").trim().slice(0, max);
  const customerName = clean(body.customerName, 120);
  const customerPhone = clean(body.customerPhone, 32);
  const phoneDigits = customerPhone.replace(/\D/g, "");
  const customerAddress = clean(body.customerAddress, 500);
  const contactReference = normalizeManualWarrantyContact(body.contactReference);
  if (customerName.length < 2 || !/^[+0-9().\s/-]+$/.test(customerPhone) ||
      !/^\d{9,12}$/.test(phoneDigits) || customerAddress.length < 5 || contactReference === null) {
    return fail("Cần nhập tên, số điện thoại và địa chỉ khách hàng hợp lệ.");
  }
  // Legacy single-product requests remain valid. A multi-product purchase is
  // created atomically; no partial set of warranty codes should be issued.
  if (body.items !== undefined && !Array.isArray(body.items)) return fail("Danh sách sản phẩm không hợp lệ.");
  const requestedItems = body.items ?? [body];
  if (!requestedItems.length || requestedItems.length > 10) return fail("Mỗi lần tạo phiếu cần từ 1 đến 10 sản phẩm.");
  const items = [];
  for (let index = 0; index < requestedItems.length; index++) {
    const input = requestedItems[index];
    if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Sản phẩm " + (index + 1) + " không hợp lệ.");
    const productName = clean(input.productName, 180);
    const price = (typeof input.price === "number" ||
      (typeof input.price === "string" && /^\d+$/.test(input.price))) ? Number(input.price) : NaN;
    const months = (typeof input.durationMonths === "number" ||
      (typeof input.durationMonths === "string" && /^\d+$/.test(input.durationMonths)))
      ? Number(input.durationMonths) : NaN;
    const startsAt = clean(input.startsAt, 10);
    if (productName.length < 2 || !Number.isSafeInteger(price) || price < 0 || price > 2_000_000_000 ||
        !Number.isInteger(months) || months < 1 || months > 120) {
      return fail("Sản phẩm " + (index + 1) + ": cần nhập tên, giá hợp lệ và thời hạn 1–120 tháng.");
    }
    let endsAt;
    try { endsAt = addWarrantyCalendarMonths(startsAt, months); }
    catch { return fail("Sản phẩm " + (index + 1) + ": ngày bắt đầu bảo hành không hợp lệ."); }
    const snapshot=createWarrantyPolicySnapshot({unitPrice:price,durationMonths:months,startsAt,endsAt,policyName:"Bảo hành trực tiếp"});
    items.push({ productName, price, months, startsAt, endsAt, snapshot });
  }
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const codes = items.map(() => generateShortWarrantyCode());
      if (new Set(codes).size !== codes.length) continue;
      // Check both existing namespaces before writing all rows in one D1 batch.
      const placeholders = codes.map(() => "?").join(",");
      const collisions = await context.env.DB.prepare(
        "SELECT warranty_code FROM warranties WHERE upper(warranty_code) IN (" + placeholders + ") " +
        "UNION ALL SELECT warranty_code FROM manual_warranties WHERE upper(warranty_code) IN (" + placeholders + ")"
      ).bind(...codes, ...codes).all();
      if ((collisions.results || []).length) continue;
      const records = items.map((item, index) => ({
        ...item, id: crypto.randomUUID(), warrantyCode: codes[index],
      }));
      const statements = [];
      for (const record of records) {
        statements.push(context.env.DB.prepare(
          "INSERT INTO manual_warranties(id,warranty_code,customer_name,customer_phone,customer_address,customer_contact_reference,product_name,price,policy_name,duration_months,starts_at,ends_at,status,policy_snapshot_json) " +
          "VALUES(?,?,?,?,?,?,?,?,'Bảo hành trực tiếp',?,?,?,'active',?)"
        ).bind(record.id,record.warrantyCode,customerName,customerPhone,customerAddress,contactReference,record.productName,
          record.price,record.months,record.startsAt,record.endsAt,record.snapshot));
        statements.push(context.env.DB.prepare(
          "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
          "VALUES(?,'admin','manual_warranty_issued','manual_warranty',?,?)"
        ).bind(crypto.randomUUID(),record.id,JSON.stringify({
          customerName,customerPhone,productName:record.productName,price:record.price,
          months:record.months,startsAt:record.startsAt,endsAt:record.endsAt,warrantyCode:record.warrantyCode,
        })));
      }
      try {
        const result = await context.env.DB.batch(statements);
        if (!Array.isArray(result) || result.length !== statements.length ||
            result.some(entry => entry?.success === false))
          return fail("Không thể xác nhận việc lưu đầy đủ phiếu bảo hành.",503);
        // D1 meta.changes may be cumulative, not one per INSERT. Read back the
        // generated IDs/codes instead of falsely treating a successful batch as 503.
        const recordIds=records.map(record=>record.id);
        const saved=await context.env.DB.prepare(
          "SELECT id,warranty_code FROM manual_warranties WHERE id IN (" +
          recordIds.map(()=>"?").join(",") + ")"
        ).bind(...recordIds).all();
        const savedCodes=new Map((saved.results||[]).map(row=>[row.id,row.warranty_code]));
        if (savedCodes.size!==records.length ||
            records.some(record=>savedCodes.get(record.id)!==record.warrantyCode))
          return fail("Không xác minh được toàn bộ phiếu đã lưu. Vui lòng kiểm tra danh sách bảo hành.",503);
        return json({
          ok:true, warrantyCode:records[0].warrantyCode,
          warranties:records.map(({productName,price,months,startsAt,endsAt,warrantyCode}) => ({
            productName,price,durationMonths:months,startsAt,endsAt,warrantyCode,
          })),
          message:"Đã tạo " + records.length + " phiếu bảo hành độc lập cho khách hàng.",
        },201);
      } catch (error) {
        // Cloudflare D1 batch rolls back all statements on a failed insert.
        if (!isWarrantyCodeCollisionError(error) || attempt === 7) throw error;
      }
    }
    return fail("Không thể cấp mã bảo hành không trùng. Hãy thử lại.",409);
  } catch {
    return fail("Không thể tạo phiếu bảo hành độc lập. Hãy xác nhận migration 0019 đã được áp dụng.",503);
  }
}
