import { test, expect } from "@playwright/test";
import { validateAdminPreviewUrl } from "../../scripts/admin-preview-url.mjs";

const adminPassword = process.env.ADMIN_TEST_PASSWORD;

function getAdminUrl() {
  if (!adminPassword) throw new Error("BLOCKED: ADMIN_TEST_PASSWORD is missing; do not pass credentials through chat or workflow inputs.");
  return validateAdminPreviewUrl(process.env.ADMIN_TEST_URL);
}

async function expectProtectedProductsApiDenied(request, adminUrl, cookie) {
  const url = new URL("/api/admin/products", adminUrl);
  const options = { maxRedirects: 0 };
  if (cookie) options.headers = { Cookie: cookie };
  const response = await request.get(url.href, options);
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["content-type"] || "").toContain("application/json");
}

test.describe("SinDarealest2 Admin Preview", () => {
  test("shows the login shell and rejects unauthenticated and invalid-session API access", async ({ page, request }) => {
    const adminUrl = getAdminUrl();
    const response = await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 0).toBeGreaterThan(0);
    expect(response?.status() ?? 0).toBeLessThan(500);

    // Refuse redirects out of the project's Preview-host allowlist.
    expect(() => validateAdminPreviewUrl(page.url())).not.toThrow();

    await expect(page.locator("#loginView")).toBeVisible();
    await expect(page.locator("#loginForm")).toBeVisible();
    await expect(page.locator("#password")).toHaveAttribute("type", "password");
    await expect(page.locator("#appView")).toBeHidden();

    await expectProtectedProductsApiDenied(request, adminUrl);
    await expectProtectedProductsApiDenied(
      request,
      adminUrl,
      "sd_admin_session=invalid-session-token",
    );
  });

  test("logs in once, verifies the session and dashboard, then confirms logout removes admin access", async ({ page, request }) => {
    const adminUrl = getAdminUrl();
    const serverErrors = [];
    page.on("response", (response) => {
      if (response.status() >= 500) {
        // Log only status and path. Never print cookies, headers, response bodies, or credentials.
        serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });

    await page.goto(adminUrl, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#loginForm")).toBeVisible();
    await page.locator("#password").fill(adminPassword);
    await page.locator('#loginForm button[type="submit"]').click();

    await expect(page.locator("#appView")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#logout")).toBeVisible();

    const sessionResponse = await page.request.get(new URL("/api/admin/session", adminUrl).href, {
      maxRedirects: 0,
    });
    expect(sessionResponse.status()).toBe(200);
    expect((await sessionResponse.json()).authenticated).toBe(true);

    await page.locator("#logout").click();
    await expect(page.locator("#loginView")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#appView")).toBeHidden();
    await expectProtectedProductsApiDenied(page.request, adminUrl);

    expect(serverErrors, "Preview should not return unexpected HTTP 5xx responses during authentication").toEqual([]);
  });
});
