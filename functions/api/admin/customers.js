import { fail, json, requireAdmin } from "../../_lib.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare(`SELECT c.id,c.full_name AS fullName,c.phone,c.email,c.address,c.created_at AS createdAt,COUNT(o.id) AS orderCount,MAX(o.created_at) AS lastOrderAt FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY lastOrderAt DESC,c.created_at DESC LIMIT 2000`).all();
    return json({ customers: result.results || [] });
  } catch { return fail("Không đọc được khách hàng. Hãy kiểm tra đã áp dụng migration 0003.", 503); }
}
