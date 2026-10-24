import { fail, getSetting, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { validPublicQrImageKey } from "../../_payments.js";

const KEYS = [
  "payment_qr_active", "payment_qr_active_key", "payment_qr_pending_key",
  "payment_qr_bank_name", "payment_qr_account_number", "payment_qr_account_name", "payment_qr_instructions",
  "payment_qr_draft_bank_name", "payment_qr_draft_account_number", "payment_qr_draft_account_name", "payment_qr_draft_instructions"
];
async function values(db) {
  const rows = await db.prepare("SELECT key,value FROM settings WHERE key IN (?,?,?,?,?,?,?,?,?,?,?)").bind(...KEYS).all();
  return Object.fromEntries((rows.results || []).map(row => [row.key, row.value]));
}
function validateBank(body) {
  const bankName = String(body.bankName || "").trim();
  const accountNumber = String(body.accountNumber || "").replace(/\s+/g, "");
  const accountName = String(body.accountName || "").trim().toLocaleUpperCase("en-US").replace(/\s+/g, " ");
  const instructions = String(body.instructions || "").trim();
  if (bankName.length < 2 || bankName.length > 100) return { error: "Tên ngân hàng bắt buộc, tối đa 100 ký tự." };
  if (!/^\d{6,19}$/.test(accountNumber)) return { error: "Số tài khoản chỉ gồm 6–19 chữ số." };
  if (!/^[A-Z0-9 ]{5,80}$/.test(accountName)) return { error: "Tên chủ tài khoản không hợp lệ; nhập không dấu theo tên ngân hàng." };
  if (instructions.length > 500) return { error: "Hướng dẫn chuyển khoản tối đa 500 ký tự." };
  return { value: { bankName, accountNumber, accountName, instructions } };
}
function upsert(db,key,value) {
  return db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,String(value ?? ""));
}

// Follow-on activation writes must execute only when the first statement's
// compare-and-swap claimed the exact pending image and bank-draft snapshot.
function guardedUpsert(db,key,value) {
  return db.prepare(
    "INSERT INTO settings(key,value,updated_at) SELECT ?,?,datetime('now') WHERE changes()=1 " +
    "ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at"
  ).bind(key,String(value ?? ""));
}
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const v = await values(context.env.DB);
    const active = v.payment_qr_active === "1" && validPublicQrImageKey(v.payment_qr_active_key);
    const pending = validPublicQrImageKey(v.payment_qr_pending_key);
    return json({
      active, activeImageUrl: active ? "/payment-qr/" + v.payment_qr_active_key : "",
      pending, pendingImageUrl: pending ? "/api/admin/payment-qr-preview?key=" + encodeURIComponent(v.payment_qr_pending_key) : "",
      bankName: v.payment_qr_draft_bank_name || v.payment_qr_bank_name || "",
      accountNumber: v.payment_qr_draft_account_number || v.payment_qr_account_number || "",
      accountName: v.payment_qr_draft_account_name || v.payment_qr_account_name || "",
      instructions: v.payment_qr_draft_instructions ?? v.payment_qr_instructions ?? ""
    });
  } catch { return fail("Không đọc được cấu hình QR thanh toán.", 503); }
}
export async function onRequestPut(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsed = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsed.error === "too_large") return fail("Cấu hình QR vượt giới hạn kích thước.", 413);
  if (parsed.error || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return fail("Cấu hình QR không hợp lệ.");
  const body = parsed.value, db = context.env.DB;
  try {
    const current = await values(db);
    if (body.action === "save-draft") {
      const checked = validateBank(body); if (checked.error) return fail(checked.error);
      const v = checked.value;
      await db.batch([
        upsert(db,"payment_qr_draft_bank_name",v.bankName), upsert(db,"payment_qr_draft_account_number",v.accountNumber),
        upsert(db,"payment_qr_draft_account_name",v.accountName), upsert(db,"payment_qr_draft_instructions",v.instructions),
        db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','payment_qr_draft_saved','payment_qr','config',?)")
          .bind(crypto.randomUUID(),JSON.stringify({ bankName:v.bankName, accountNumberLast4:v.accountNumber.slice(-4) }))
      ]);
      return json({ ok:true, message:"Đã lưu thông tin nháp. Chưa kích hoạt QR." });
    }
    if (body.action === "activate") {
      if (body.verified !== true) return fail("Hãy xác nhận đã quét kiểm tra đúng tài khoản và QR không có số tiền cố định.");
      if (!validPublicQrImageKey(current.payment_qr_pending_key)) return fail("Cần tải ảnh QR lên và xem trước trước khi kích hoạt.",409);
      if (!context.env.IMAGES?.head || !await context.env.IMAGES.head(current.payment_qr_pending_key)) return fail("Không tìm thấy ảnh QR chờ kích hoạt.",404);
      const checked = validateBank({
        bankName:current.payment_qr_draft_bank_name, accountNumber:current.payment_qr_draft_account_number,
        accountName:current.payment_qr_draft_account_name, instructions:current.payment_qr_draft_instructions
      });
      if (checked.error) return fail("Lưu thông tin ngân hàng hợp lệ trước khi kích hoạt: " + checked.error);
      const v = checked.value, key = current.payment_qr_pending_key;
      const draft = {
        bankName: current.payment_qr_draft_bank_name,
        accountNumber: current.payment_qr_draft_account_number,
        accountName: current.payment_qr_draft_account_name,
        instructions: current.payment_qr_draft_instructions,
      };
      const activation = await db.batch([
        db.prepare(
          "UPDATE settings SET value='',updated_at=datetime('now') " +
          "WHERE key='payment_qr_pending_key' AND value=? " +
          "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_draft_bank_name' AND value=?) " +
          "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_draft_account_number' AND value=?) " +
          "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_draft_account_name' AND value=?) " +
          "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_draft_instructions' AND value=?)"
        ).bind(key,draft.bankName,draft.accountNumber,draft.accountName,draft.instructions),
        guardedUpsert(db,"payment_qr_active_key",key),
        guardedUpsert(db,"payment_qr_active","1"),
        guardedUpsert(db,"payment_qr_bank_name",v.bankName),
        guardedUpsert(db,"payment_qr_account_number",v.accountNumber),
        guardedUpsert(db,"payment_qr_account_name",v.accountName),
        guardedUpsert(db,"payment_qr_instructions",v.instructions),
        db.prepare(
          "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
          "SELECT ?,'admin','payment_qr_activated','payment_qr',?,? WHERE changes()=1"
        ).bind(crypto.randomUUID(),key,JSON.stringify({ verifiedByAdmin:true,bankName:v.bankName,accountNumberLast4:v.accountNumber.slice(-4) }))
      ]);
      if (Number(activation?.[0]?.meta?.changes || 0) !== 1) {
        return fail("QR hoặc thông tin ngân hàng vừa thay đổi trong lúc xác nhận. Tải lại cấu hình, kiểm tra ảnh QR và xác minh lại trước khi kích hoạt.",409);
      }
      return json({ ok:true,active:true,message:"Đã kích hoạt QR sau xác nhận thủ công." });
    }
    if (body.action === "deactivate") {
      await db.batch([
        upsert(db,"payment_qr_active","0"),
        db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','payment_qr_deactivated','payment_qr',?,?)")
          .bind(crypto.randomUUID(),current.payment_qr_active_key || "",JSON.stringify({ active:false }))
      ]);
      return json({ ok:true,active:false,message:"Đã tắt QR công khai; ảnh và cấu hình vẫn được giữ lại." });
    }
    return fail("Thao tác QR không hợp lệ.");
  } catch { return fail("Không cập nhật được cấu hình QR. QR đang hoạt động vẫn được giữ nguyên nếu thao tác thất bại.",503); }
}
