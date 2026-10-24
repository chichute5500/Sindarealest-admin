import assert from "node:assert/strict";
import { assessPreviewSeoResponse, validatePreviewUrl } from "../scripts/verify-preview-seo.mjs";

assert.equal(validatePreviewUrl("https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/").origin,
  "https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev");
assert.throws(() => validatePreviewUrl("https://sindarealest2.pages.dev/"), /Refused URL/);
assert.throws(() => validatePreviewUrl("https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/?token=x"), /Refused URL/);
assert.throws(() => validatePreviewUrl("https://example.com/"), /Refused URL/);

const response = (status, headers = {}) => new Response("", { status, headers });
assert.equal(assessPreviewSeoResponse("/", response(200, {
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex",
})).result, "PASS");
assert.equal(assessPreviewSeoResponse("/", response(200, {
  "Content-Type": "text/html; charset=utf-8",
})).result, "MISSING_NOINDEX");
assert.equal(assessPreviewSeoResponse("/", response(302, {
  "Location": "https://sindarealest2-pages.cloudflareaccess.com/login",
})).result, "ACCESS_REDIRECT");
assert.equal(assessPreviewSeoResponse("/robots.txt", response(200, {
  "Content-Type": "text/plain; charset=utf-8",
}), "User-agent: *\nDisallow: /\n").result, "PASS");
assert.equal(assessPreviewSeoResponse("/robots.txt", response(200, {
  "Content-Type": "text/plain; charset=utf-8",
}), "User-agent: *\nAllow: /\n").result, "ROBOTS_POLICY_MISMATCH");
assert.equal(assessPreviewSeoResponse("/sitemap.xml", response(404, {
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "no-store",
}), "Sitemap unavailable on Preview hosts").result, "PASS");
assert.equal(assessPreviewSeoResponse("/sitemap.xml", response(200, {
  "Content-Type": "application/xml",
}), "<urlset/>").result, "SITEMAP_POLICY_MISMATCH");

console.log("PASS: Preview SEO diagnostic restricts targets and classifies root, robots, sitemap and Access responses.");
