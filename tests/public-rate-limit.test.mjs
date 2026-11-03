import assert from "node:assert/strict";
import { rateLimitPublicRequest } from "../functions/_lib.js";
import {onRequestPost as quoteCheckout} from "../functions/api/checkout-quote.js";

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
// The public read-only quote must not permit unlimited D1/R2 reads, even for
// callers that omit a browser Origin header (e.g. script-based spam).
const quoteRequest = () => new Request("https://shop.example/api/checkout-quote",{
 method:"POST",headers:{"Content-Type":"application/json","CF-Connecting-IP":"198.51.100.105","Origin":"https://shop.example"},
 body:JSON.stringify({items:[{id:"qa-quote",quantity:1}],phone:"0900000000"})
});
const boundedDB={
 prepare(sql){
  return {sql,bind(){return this;},async all(){return {results:[]}}};
 },
 async batch(){
  return [{success:true},{success:true,results:[{attempts:91}]}];
 }
};
const blocked=await quoteCheckout({env:{DB:boundedDB,SESSION_SECRET},request:quoteRequest()});
assert.equal(blocked.status,429,"Automated quote floods must be rejected before product/QR reads");
assert.equal(blocked.headers.get("Retry-After"),"900");
const allowedDB={
 ...boundedDB,
 async batch(){return [{success:true},{success:true,results:[{attempts:1}]}]}
};
const allowed=await quoteCheckout({env:{DB:allowedDB,SESSION_SECRET},request:quoteRequest()});
assert.equal(allowed.status,409,"Allowed quote reaches normal product validation, not an unexpected 503");
console.log("PASS: scoped public rate limits, anti-spam checkout quote gate and bounded retries.");
