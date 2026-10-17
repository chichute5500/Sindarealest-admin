import assert from "node:assert/strict";
import { isTrustedPushEndpoint } from "../functions/_notifications.js";
import { readFileSync } from "node:fs";

const allowed = [
  "https://fcm.googleapis.com/fcm/send/sample",
  "https://updates.push.services.mozilla.com/wpush/v2/sample",
  "https://web.push.apple.com/sample",
  "https://push.services.opera.com/sample",
  "https://wns2-par02p.notify.windows.com/w/",
];
for (const endpoint of allowed) assert.equal(isTrustedPushEndpoint(endpoint), true, endpoint + " should be accepted");

const rejected = [
  "http://fcm.googleapis.com/fcm/send/sample",
  "https://127.0.0.1:8443/secret",
  "https://localhost/admin",
  "https://fcm.googleapis.com.attacker.test/send",
  "https://user@fcm.googleapis.com/send",
  "https://fcm.googleapis.com:8443/send",
  "https://example.push.apple.com/sample",
  "not a URL",
];
for (const endpoint of rejected) assert.equal(isTrustedPushEndpoint(endpoint), false, endpoint + " should be rejected");

const notifications = readFileSync(new URL("../functions/_notifications.js", import.meta.url), "utf8");
assert.match(notifications, /ORDER BY updated_at DESC LIMIT 50/,
  "push delivery must query a bounded number of recent admin subscriptions");
assert.match(notifications, /\.slice\(0,50\)/,
  "push delivery must apply a second in-memory cap");

const route = readFileSync(new URL("../functions/api/admin/push-subscriptions.js", import.meta.url), "utf8");
assert.ok(route.includes("isTrustedPushEndpoint(endpoint)"),
  "subscription endpoints must be checked before being persisted");
console.log("PASS: push endpoint SSRF guard, bounded delivery, and subscription validation.");
