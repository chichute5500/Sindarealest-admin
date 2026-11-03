import assert from "node:assert/strict";
import { rateLimitPublicRequest } from "../functions/_lib.js";

const SESSION_SECRET = "public-rate-limit-test-secret-that-is-long-enough";
const state = new Map();
const DB = {
  prepare(sql) {
    let values = [];
    const statement = {
      sql,
      bind(...next) { values = next; return statement; },
      values: () => values,
      async run() {
        if (sql.includes("DELETE FROM public_rate_limits")) return { meta: { changes: 0 } };
        return { meta: { changes: 1 } };
      },
    };
    return statement;
  },
  async batch(statements) {
    const upsert = statements[0];
    if (upsert.sql.includes("INSERT INTO public_rate_limits")) {
      const [scope, ipHash, windowStart] = upsert.values();
      const key = scope + ":" + ipHash;
      const prior = state.get(key);
      state.set(key, {
        window_start: windowStart,
        attempts: prior && prior.window_start === windowStart ? prior.attempts + 1 : 1,
      });
    }
    const query = statements[1];
    const [scope, ipHash] = query.values();
    const row = state.get(scope + ":" + ipHash);
    return [{ success: true }, { success: true, results: row ? [{ attempts: row.attempts }] : [] }];
  },
};

const originalNow = Date.now;
let now = 1_800_000_000_000;
Date.now = () => now;
try {
  const request = new Request("https://shop.example/api/orders", {
    method: "POST",
    headers: { "CF-Connecting-IP": "198.51.100.100" },
  });
  const results = await Promise.all(Array.from({ length: 15 }, () =>
    rateLimitPublicRequest({ DB, SESSION_SECRET }, request, "order_create", 6, 900)));
  assert.equal(results.filter((r) => !r.limited).length, 6,
    "only six concurrent attempts should be allowed per public API window");
  assert.equal(results.filter((r) => r.limited).length, 9,
    "concurrent attempts beyond the public API limit should be blocked");

  now += 900_001;
  const afterWindow = await rateLimitPublicRequest({ DB, SESSION_SECRET }, request, "order_create", 6, 900);
  assert.equal(afterWindow.limited, false, "public rate limit should reset when the next window starts");

  const otherScope = await rateLimitPublicRequest({ DB, SESSION_SECRET }, request, "warranty_lookup", 6, 900);
  assert.equal(otherScope.limited, false, "rate limits must be isolated by API scope");

  const unverifiableDB = {
    prepare(sql) { return { sql, bind() { return this; } }; },
    async batch() { return [{ success: true }, { success: true, results: [] }]; },
  };
  await assert.rejects(
    rateLimitPublicRequest({ DB: unverifiableDB, SESSION_SECRET }, request, "order_create", 6, 900),
    /rate-limit counter could not be verified/i,
    "a missing counter result must fail closed instead of disabling public rate limiting",
  );
} finally {
  Date.now = originalNow;
}
console.log("PASS: public API rate limits are atomic under parallel requests and scoped by endpoint.");
