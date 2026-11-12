import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const wranglerCli = resolve(root, "node_modules/wrangler/bin/wrangler.js");
assert.ok(existsSync(wranglerCli), "Wrangler must be installed before Pages routing smoke tests.");

const port = Number(process.env.PAGES_SMOKE_TEST_PORT || 8788);
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [
  wranglerCli, "pages", "dev", "public",
  "--ip", "127.0.0.1", "--port", String(port),
], {
  cwd: root,
  env: { ...process.env, NO_COLOR: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
const capture = (chunk) => {
  output = (output + chunk.toString()).slice(-12000);
};
child.stdout.on("data", capture);
child.stderr.on("data", capture);
let childExit = null;
child.on("exit", (code, signal) => { childExit = { code, signal }; });
child.on("error", (error) => { output += `\nWrangler spawn error: ${error.message}`; });

async function fetchWithTimeout(path) {
  return fetch(new URL(path, origin), { signal: AbortSignal.timeout(2500) });
}
async function waitForServer() {
  const deadline = Date.now() + 20000;
  let lastError = "server did not become ready";
  while (Date.now() < deadline) {
    if (childExit) throw new Error(`Wrangler exited early (${JSON.stringify(childExit)}).\n${output}`);
    try {
      const response = await fetchWithTimeout("/");
      if (response.status === 200) return;
      lastError = `homepage returned HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Timed out waiting for local Pages. Last error: ${lastError}\n${output}`);
}

try {
  await waitForServer();

  const homepage = await fetchWithTimeout("/");
  assert.equal(homepage.status, 200, "Homepage should resolve through Pages assets");
  assert.match(homepage.headers.get("content-type") || "", /text\/html/i);
  assert.match(await homepage.text(), /SinDarealest/i);

  // Test through Wrangler's real Pages router, not just the exported handler:
  // before the fix GET /sitemap.xml was 200 while HEAD returned 404/noindex.
  const sitemapGet = await fetchWithTimeout("/sitemap.xml");
  assert.equal(sitemapGet.status, 200, "Sitemap GET must work when D1 is unavailable");
  assert.match(sitemapGet.headers.get("content-type") || "", /application\/xml/i);
  assert.match(await sitemapGet.text(), /<urlset[^>]*sitemaps\.org/);

  const sitemapHead = await fetch(new URL("/sitemap.xml", origin), {
    method: "HEAD", signal: AbortSignal.timeout(2500)
  });
  assert.equal(sitemapHead.status, 200, "Pages router must serve sitemap HEAD with HTTP 200");
  assert.match(sitemapHead.headers.get("content-type") || "", /application\/xml/i);
  assert.equal(sitemapHead.headers.get("x-robots-tag"), null);
  assert.equal(await sitemapHead.text(), "");

  const malformedSitemap = await fetch(new URL("/sitemap.xml.", origin), { redirect: "manual", signal: AbortSignal.timeout(2500) });
  assert.equal(malformedSitemap.status, 301, "Trailing punctuation on the sitemap URL should redirect to the canonical sitemap");
  assert.equal(malformedSitemap.headers.get("location"), origin + "/sitemap.xml");

  const legacyListing = await fetch(new URL("/san-pham/", origin), { redirect: "manual", signal: AbortSignal.timeout(2500) });
  assert.equal(legacyListing.status, 301, "The retired product listing route should redirect to the canonical catalog");
  assert.equal(legacyListing.headers.get("location"), origin + "/sanpham");

  // Static sitemap is served by Pages assets rather than a D1-backed Function.
  const staticSitemapGet = await fetchWithTimeout("/sitemap-pages.xml");
  assert.equal(staticSitemapGet.status, 200, "Static sitemap must bypass function routing");
  assert.match(staticSitemapGet.headers.get("content-type") || "", /application\/xml/i);
  assert.equal(staticSitemapGet.headers.get("x-robots-tag"), null);
  const staticXml = await staticSitemapGet.text();
  assert.match(staticXml, /<loc>https:\/\/casauvip\.store\/sanpham\/sneaker<\/loc>/);
  assert.equal((staticXml.match(/<url>/g) || []).length, 16);
  assert.match(staticXml, /<loc>https:\/\/casauvip\.store\/sanpham\/vinamnu<\/loc>/);
  assert.match(staticXml, /<loc>https:\/\/casauvip\.store\/kien-thuc\/<\/loc>/);
  assert.match(staticXml, /<loc>https:\/\/casauvip\.store\/kien-thuc\/phan-biet-da-ca-sau-that-da-dap-van\/<\/loc>/);
  assert.doesNotMatch(staticXml, /<loc>https:\/\/casauvip\.store\/sanpham\/vinam<\/loc>/);

  const staticSitemapHead = await fetch(new URL("/sitemap-pages.xml", origin), {
    method: "HEAD", signal: AbortSignal.timeout(2500)
  });
  assert.equal(staticSitemapHead.status, 200);
  assert.match(staticSitemapHead.headers.get("content-type") || "", /application\/xml/i);
  assert.equal(await staticSitemapHead.text(), "");

  const admin = await fetchWithTimeout("/admin/");
  assert.equal(admin.status, 200, "Admin login page should remain reachable through Pages redirect rules");
  assert.match(await admin.text(), /Quản trị SinDarealest/i);

  const unknownApi = await fetchWithTimeout("/api/admin/removed-experiment");
  assert.equal(unknownApi.status, 404, "Unknown API paths must not return storefront HTML");
  assert.ok((unknownApi.headers.get("content-type") || "").toLowerCase().includes("application/json"));
  assert.equal(unknownApi.headers.get("cache-control"), "no-store");
  assert.equal(unknownApi.headers.get("x-content-type-options"), "nosniff");
  const unknownApiBody = await unknownApi.json();
  assert.equal(unknownApiBody.code, "API_ROUTE_NOT_FOUND");

  const realApi = await fetchWithTimeout("/api/products");
  assert.notEqual(realApi.status, 404, "Specific existing API routes must take precedence over the API catch-all");
  const realApiText = await realApi.text();
  assert.ok(!realApiText.includes("API_ROUTE_NOT_FOUND"), "API catch-all must not shadow /api/products");

  // Linkable standalone public lookup pages, no customer credentials in URLs.
  for (const [path,title,formId] of [
    ["/tra-cuu-don-hang","Tra cứu đơn hàng","sdTrackForm"],
    ["/bao-hanh","Kiểm tra bảo hành","warrantyLookupForm"]
  ]) {
    const response=await fetchWithTimeout(path);
    assert.equal(response.status,200,path+" must render HTML when shared by Zalo");
    assert.match(response.headers.get("content-type")||"",/text\/html/i);
    const html=await response.text();
    assert.ok(html.includes('<title>'+title+' | SinDarealest</title>'),path+" has an independent server title");
    assert.ok(html.includes('id="sdServicePage"'),path+" has a dedicated page shell");
    assert.ok(html.includes('id="'+formId+'"'),path+" uses the original lookup form");
    assert.match(html,new RegExp('rel="canonical" href="http://127\\.0\\.0\\.1:'+port+path+'"'));
  }
  const redirected=await fetch(new URL("/bao-hanh/",origin),{redirect:"manual",signal:AbortSignal.timeout(2500)});
  assert.equal(redirected.status,301,"Trailing slash canonicalizes support URLs");
  assert.equal(redirected.headers.get("location"),origin+"/bao-hanh");

  const fallbackPage = await fetchWithTimeout("/a-nonexistent-static-page");
  assert.equal(fallbackPage.status, 404, "Unknown document paths must return HTTP 404, not a homepage fallback");
  assert.match(await fallbackPage.text(), /Không tìm thấy trang/);

  console.log("PASS: local Pages routing — homepage, admin, unknown API JSON 404, real API route precedence, and static fallback.");
} catch (error) {
  console.error("FAIL: local Pages routing smoke test.");
  console.error(error?.stack || error);
  if (output) console.error("Wrangler output:\n" + output);
  process.exitCode = 1;
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGTERM");
    await new Promise((resolvePromise) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolvePromise();
      const timeout = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        resolvePromise();
      }, 2000);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolvePromise();
      });
    });
  }
}
