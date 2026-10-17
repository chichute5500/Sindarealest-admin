import assert from "node:assert/strict";
import { rateLimitLogin } from "../functions/_lib.js";

const secret = "admin-rate-limit-test-secret-with-sufficient-length";
const state = new Map();
let cleanupCalls = 0;
let failCleanup = false;
const windowMs = 15 * 60 * 1000;

const DB = {
  prepare(sql) {
    let values = [];
    const statement = {
      sql,
      bind(...next) { values = next; return statement; },
      values: () => values,
      async run() {
        if (sql.includes("DELETE FROM admin_login_attempts")) {
          cleanupCalls++;
          if (failCleanup) throw new Error("simulated cleanup failure");
        }
        return { success: true, meta: { changes: 0 } };
      },
    };
    return statement;
  },
  async batch(statements) {
    // Model D1's sequential, transactional execution of the upsert followed by
    // SELECT. The mutation happens synchronously so simultaneous JS callers
    // observe a serialized counter, just as transactions do in D1.
    const upsert = statements[0];
    if (upsert.sql.includes("INSERT INTO admin_login_attempts")) {
      const [ipHash, now, resetNow, resetWindow, resetNow2, resetWindow2] = upsert.values();
      const old = state.get(ipHash);
      if (!old) state.set(ipHash, { window_start: now, attempts: 1 });
      else if (resetNow - old.window_start >= resetWindow || resetNow2 - old.window_start >= resetWindow2) {
        state.set(ipHash, { window_start: now, attempts: 1 });
      } else {
        state.set(ipHash, { window_start: old.window_start, attempts: old.attempts + 1 });
      }
    }
    const select = statements[1];
    const row = state.get(select.values()[0]);
    return [{ success: true }, { success: true, results: row ? [{ attempts: row.attempts }] : [] }];
  },
};

const oldNow = Date.now;
let current = 1_800_000_000_000;
Date.now = () => current;
try {
  const request = new Request("https://shop.example/api/admin/login", {
    method: "POST",
    headers: { "CF-Connecting-IP": "198.51.100.99" },
  });
  const results = await Promise.all(Array.from({ length: 12 }, () => rateLimitLogin(DB, request, secret)));
  assert.equal(results.filter((r) => !r.limited).length, 5,
    "exactly five simultaneous attempts should be admitted per IP window");
  assert.equal(results.filter((r) => r.limited).length, 7,
    "parallel attempts beyond the limit should be blocked");
  assert.ok(results.every((r) => r.ipHash === results[0].ipHash),
    "the same source IP must resolve to the same keyed hash");
  current += windowMs + 1;
  const afterWindow = await rateLimitLogin(DB, request, secret);
  assert.equal(afterWindow.limited, false, "the counter should reset after 15 minutes");

  // Expired per-IP rows are cleaned opportunistically, but a cleanup failure
  // must not turn the login rate limiter into an outage.
  let cleanupSecond = Math.floor(current / 1000);
  while (cleanupSecond % 17 !== 0) cleanupSecond++;
  current = cleanupSecond * 1000;
  failCleanup = true;
  const afterCleanupFailure = await rateLimitLogin(DB, request, secret);
  assert.equal(afterCleanupFailure.limited, false, "cleanup failure must not reject a valid rate-limit check");
  assert.equal(cleanupCalls, 1, "expired login rows should be cleaned on the opportunistic interval");

  const unverifiableDB = {
    prepare(sql) { return { sql, bind() { return this; } }; },
    async batch() { return [{ success: true }, { success: true, results: [] }]; },
  };
  await assert.rejects(
    rateLimitLogin(unverifiableDB, request, secret),
    /login rate-limit counter could not be verified/i,
    "a missing login counter result must fail closed instead of admitting an attempt",
  );
} finally {
  Date.now = oldNow;
}
console.log("PASS: admin login rate limit is atomic under parallel attempts and resets after its window.");
