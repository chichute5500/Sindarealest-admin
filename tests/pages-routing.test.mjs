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

  const fallbackPage = await fetchWithTimeout("/a-nonexistent-static-page");
  assert.equal(fallbackPage.status, 404, "Unknown document paths must return actual HTTP 404");
  assert.equal(fallbackPage.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await fallbackPage.text(), /Không tìm thấy trang/i);

  console.log("PASS: local Pages routing — homepage, admin, unknown API JSON 404, real API route precedence, and genuine 404 document status.");
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
