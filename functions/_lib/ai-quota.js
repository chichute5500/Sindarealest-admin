const MINIMUM_INTERVAL_SECONDS = 15;
const ROLLING_DAY_SECONDS = 24 * 60 * 60;
const MAX_REQUESTS_PER_ROLLING_DAY = 20;

async function consumeWindow(db, scope, windowSeconds, maxRequests) {
  const result = await db.prepare(`
    INSERT INTO ai_request_limits(scope, window_start, request_count)
    VALUES(?, unixepoch(), 1)
    ON CONFLICT(scope) DO UPDATE SET
      window_start = CASE WHEN unixepoch() - ai_request_limits.window_start >= ? THEN unixepoch() ELSE ai_request_limits.window_start END,
      request_count = CASE WHEN unixepoch() - ai_request_limits.window_start >= ? THEN 1 ELSE ai_request_limits.request_count + 1 END
    WHERE unixepoch() - ai_request_limits.window_start >= ? OR ai_request_limits.request_count < ?
    RETURNING request_count, window_start
  `).bind(scope, windowSeconds, windowSeconds, windowSeconds, maxRequests).first();
  return result || null;
}

export async function consumeWorkersAiRequest(db) {
  if (!db) return { ok: false, status: 503, error: "Không có D1 để kiểm tra hạn mức AI. Đã chặn yêu cầu nhằm tránh gọi ngoài kiểm soát." };
  try {
    const recent = await consumeWindow(db, "workers-ai-15-seconds", MINIMUM_INTERVAL_SECONDS, 1);
    if (!recent) return { ok: false, status: 429, error: "Vừa có yêu cầu Workers AI. Hãy chờ ít nhất 15 giây trước lần tiếp theo." };
    const daily = await consumeWindow(db, "workers-ai-rolling-24h", ROLLING_DAY_SECONDS, MAX_REQUESTS_PER_ROLLING_DAY);
    if (!daily) return { ok: false, status: 429, error: "Đã đạt giới hạn bảo vệ nội bộ: tối đa 20 yêu cầu Workers AI trong 24 giờ. Không tự động thử lại; hãy chờ cửa sổ 24 giờ." };
    return { ok: true };
  } catch {
    return { ok: false, status: 503, error: "Không kiểm tra được giới hạn Workers AI trên D1. Đã chặn yêu cầu; kiểm tra migration 0009_ai_request_limits.sql." };
  }
}
