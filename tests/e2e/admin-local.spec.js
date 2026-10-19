import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("Admin local browser smoke: login, dashboard, logout and API denial without credentials or remote writes", async ({ page }) => {
  const writes = [];
  const productAccess = [];
  await page.route("**/api/admin/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const headers = await request.allHeaders();
    const cookie = headers.cookie || "";
    if (method !== "GET" && !path.endsWith("/login") && !path.endsWith("/logout")) {
      writes.push({ method, path });
    }

    if (path.endsWith("/session")) {
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Chưa đăng nhập." }) });
    }
    if (path.endsWith("/login")) {
      return route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": "sd_admin_session=local-browser-session; Path=/; HttpOnly; SameSite=Lax" },
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/logout")) {
      return route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": "sd_admin_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax" },
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/products") && method === "GET") {
      const authenticated = cookie.includes("sd_admin_session=local-browser-session");
      productAccess.push({ authenticated, method });
      return route.fulfill({
        status: authenticated ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(authenticated ? { products: [] } : { ok: false, error: "Chưa đăng nhập." }),
      });
    }
    if (path.endsWith("/settings")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ showPrices: true, watermarkEnabled: false, watermarkPosition: "bottom-right", watermarkSize: 18, watermarkOpacity: 60, welcomeEnabled: false }) });
    if (path.endsWith("/orders")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [] }) });
    if (path.endsWith("/customers")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customers: [] }) });
    if (path.endsWith("/warranties")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ claims: [], warranties: [] }) });
    if (path.endsWith("/audit-logs")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ logs: [] }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:8788/admin/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#loginView")).toBeVisible();
  await expect(page.locator("#loginForm")).toBeVisible();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  await expect(page.locator("#appView")).toBeHidden();

  await page.locator("#password").fill("local-only-test-password");
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appView")).toBeVisible();
  await expect(page.locator("#logout")).toBeVisible();
  expect(productAccess.some(x => x.authenticated), "login should establish the mocked authenticated session").toBe(true);
  expect(writes, "login smoke must not create, update or delete remote records").toEqual([]);

  await page.locator("#logout").click();
  await expect(page.locator("#loginView")).toBeVisible();
  await expect(page.locator("#appView")).toBeHidden();
  const afterLogoutStatus = await page.evaluate(async () => (await fetch("/api/admin/products", { credentials: "same-origin" })).status);
  expect(afterLogoutStatus).toBe(401);
  expect(productAccess.some(x => !x.authenticated), "the API mock must deny product reads after logout").toBe(true);
  expect(writes).toEqual([]);
});
