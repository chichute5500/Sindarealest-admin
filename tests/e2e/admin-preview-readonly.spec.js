import { test, expect } from "@playwright/test";
import { validateAdminPreviewUrl } from "../../scripts/admin-preview-url.mjs";

const previewUrl = validateAdminPreviewUrl(process.env.ADMIN_PREVIEW_READONLY_URL);

test.use({ serviceWorkers: "block" });

test("known Fix-branch Preview serves the Admin login shell and denies unauthenticated API reads", async ({ page, request }) => {
  const response = await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  expect(response?.status() ?? 0).toBeGreaterThan(0);
  expect(response?.status() ?? 0).toBeLessThan(500);
  expect(() => validateAdminPreviewUrl(page.url())).not.toThrow();

  await expect(page.locator("#loginView")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#loginForm")).toBeVisible();
  await expect(page.locator("#password")).toHaveAttribute("type", "password");
  await expect(page.locator("#appView")).toBeHidden();

  const apiUrl = new URL("/api/admin/products", previewUrl);
  const apiResponse = await request.get(apiUrl.href, { maxRedirects: 0, timeout: 15_000 });
  expect([401, 403]).toContain(apiResponse.status());
  expect(apiResponse.headers()["content-type"] || "").toContain("application/json");
});
