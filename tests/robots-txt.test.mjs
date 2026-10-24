import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestGet } from "../functions/robots.txt.js";

const responseBody = async (url) => {
  const response = await onRequestGet({ request: new Request(url) });
  return { response, body: await response.text() };
};

const adminHtml = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
assert.match(adminHtml, /<meta name="robots" content="noindex,nofollow">/,
  "the Admin document must contain a crawl-visible noindex directive");

// Branch/immutable Pages previews must not advertise the whole storefront for indexing.
const preview = await responseBody("https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/robots.txt");
assert.equal(preview.response.status, 200);
assert.match(preview.response.headers.get("Content-Type"), /text\/plain/i);
assert.equal(preview.body, "User-agent: *\nDisallow: /\n");
assert.doesNotMatch(preview.body, /Allow: \/|Sitemap:/);

// A terminal DNS dot is an alternate spelling of a fully qualified hostname;
// it must not bypass the Preview crawl guard.
const dottedPreview = await responseBody("https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev./robots.txt");
assert.equal(dottedPreview.response.status, 200);
assert.equal(dottedPreview.body, "User-agent: *\nDisallow: /\n");
assert.doesNotMatch(dottedPreview.body, /Allow: \/|Sitemap:/);

// The production Pages hostname must let crawlers fetch Admin HTML and see its meta robots noindex directive.
// It still disallows API crawling and retains the canonical sitemap declaration.
const primary = await responseBody("https://sindarealest2.pages.dev/robots.txt");
assert.match(primary.body, /Allow: \/\n/);
assert.doesNotMatch(primary.body, /Disallow: \/admin\//);
assert.match(primary.body, /Disallow: \/api\//);
assert.match(primary.body, /Sitemap: https:\/\/sindarealest2\.pages\.dev\/sitemap\.xml/);

// Custom production domains retain the same intended policy.
const custom = await responseBody("https://shop.example/robots.txt");
assert.match(custom.body, /Allow: \/\n/);
assert.doesNotMatch(custom.body, /Disallow: \/admin\//);
assert.match(custom.body, /Disallow: \/api\//);
assert.match(custom.body, /Sitemap: https:\/\/shop\.example\/sitemap\.xml/);

console.log("PASS: robots.txt blocks Preview crawl, exposes Admin noindex to crawlers on production, and keeps API disallowed.");
