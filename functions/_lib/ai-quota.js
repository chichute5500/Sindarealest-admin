const TEN_SECONDS = 10;
const ROLLING_DAY_SECONDS = 24 * 60 * 60;
const MAX_REQUESTS_PER_ROLLING_DAY = 20;

// One shared budget for all Gemini-backed admin features. This is deliberately
// conservative; Google's actual free-tier limits vary by model and project.
async function consumeWindow(db, scope, windowSeconds, maxRequests) {
  const result = await db.prepare(`
    INSERT INTO ai_request_limits(scope, window_start, request_count)
    VALUES(?, unixepoch(), 1)
    ON CONFLICT(scope) DO UPDATE SET
      window_start = CASE
        WHEN unixepoch() - ai_request_limits.window_start >= ? THEN unixepoch()
        ELSE ai_request_limits.window_start
      END,
      request_count = CASE
        WHEN unixepoch() - ai_request_limits.window_start >= ? THEN 1
        ELSE ai_request_limits.request_count + 1
      END
    WHERE unixepoch() - ai_request_limits.window_start >= ?
       OR ai_request_limits.request_count < ?
    RETURNING request_count, window_start
  `).bind(scope, windowSeconds, windowSeconds, windowSeconds, maxRequests).first();
  return result || null;
}

export async function consumeGeminiRequest(db) {
  try {
    // Check the longer window first so a daily-limit rejection does not consume
    // the short-window allowance.
    const daily = await consumeWindow(db, "gemini-rolling-24h", ROLLING_DAY_SECONDS, MAX_REQUESTS_PER_ROLLING_DAY);
    if (!daily) {
      return { ok: false, status: 429, error: "Đã đạt giới hạn bảo vệ gói miễn phí của SinDarealest: tối đa 20 yêu cầu Gemini trong 24 giờ. Không gửi thêm yêu cầu để tránh tiêu hao quota; hãy thử lại sau khi cửa sổ 24 giờ trôi qua." };
    }
    const recent = await consumeWindow(db, "gemini-10-seconds", TEN_SECONDS, 1);
    if (!recent) {
      return { ok: false, status: 429, error: "Vừa có một yêu cầu Gemini được gửi. Để bảo vệ quota miễn phí, hãy chờ ít nhất 10 giây trước yêu cầu tiếp theo." };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 503, error: "Không kiểm tra được bộ giới hạn Gemini trên D1. Đã chặn yêu cầu AI để tránh vượt quota; hãy kiểm tra migration 0009_ai_request_limits.sql." };
  }
}
