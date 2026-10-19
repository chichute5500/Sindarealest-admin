import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("Admin defaults to light mode and explicit theme changes are not inverted", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("sd-theme-mode"));
  await page.route("**/api/admin/session", route => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ ok: false, error: "Chưa đăng nhập." }),
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8788/admin/", { waitUntil: "domcontentloaded" });

  const root = page.locator("html");
  const toggle = page.locator("#adminThemeToggle");
  await expect(toggle).toBeVisible();
  await expect(root).toHaveAttribute("data-admin-theme", "light");
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).getPropertyValue("--bg").trim())).toBe("#f4f0e9");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(root).toHaveAttribute("data-admin-theme", "dark");
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).getPropertyValue("--bg").trim())).toBe("#090908");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sd-theme-mode"))).toBe("dark");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(root).toHaveAttribute("data-admin-theme", "dark");
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).getPropertyValue("--bg").trim())).toBe("#090908");

  await toggle.click();
  await expect(root).toHaveAttribute("data-admin-theme", "light");
  await expect.poll(() => root.evaluate(el => getComputedStyle(el).getPropertyValue("--bg").trim())).toBe("#f4f0e9");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("sd-theme-mode"))).toBe("light");
});
