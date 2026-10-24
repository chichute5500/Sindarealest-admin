import { test, expect } from "@playwright/test";

const baseURL = process.env.STOREFRONT_TEST_URL || "http://127.0.0.1:8788/";

test.describe("SinDarealest2 storefront local browser smoke (no remote credentials)", () => {
  test("loads the home shell and products section without uncaught JavaScript errors", async ({ page }) => {
    const pageErrors = [];
    const documentFailures = [];
    page.on("pageerror", error => pageErrors.push(String(error?.message || "page error").slice(0, 180)));
    page.on("response", response => {
      const url = new URL(response.url());
      // Local Pages has no remote R2 bindings and no production D1 credentials.
      // Report server errors from documents/static assets, but do not mislabel the
      // expected local API/storage "binding absent" responses as Preview failures.
      if (response.status() >= 500 && url.origin === new URL(baseURL).origin &&
          !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/media/")) {
        documentFailures.push(`${response.status()} ${url.pathname}`);
      }
    });

    const response = await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 0).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("#products")).toBeVisible();
    await expect(page.locator("#themeToggle")).toBeVisible();
    expect(pageErrors, "storefront should not throw uncaught JavaScript exceptions").toEqual([]);
    expect(documentFailures, "local Pages documents/static assets should not return 5xx").toEqual([]);
  });

  test("keeps layout within phone, tablet, and desktop viewports", async ({ page }) => {
    for (const size of [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(size);
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#products")).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(
        Math.max(dimensions.document, dimensions.body),
        `horizontal overflow at ${size.width}px viewport (document ${dimensions.document}px, body ${dimensions.body}px)`,
      ).toBeLessThanOrEqual(dimensions.viewport + 2);

      if (size.width <= 390) {
        const skipIntro = page.locator("#skipIntro");
        if (await skipIntro.isVisible().catch(() => false)) await skipIntro.click();
        await page.locator("#menuToggle").click();
        await expect(page.locator("#mobileNav")).toHaveClass(/open/);
        await page.locator('#mobileNav a[href="#products"]').click();
        await expect(page.locator("#mobileNav")).not.toHaveClass(/open/);
      }
    }
  });

  test("follows System theme and allows explicit Light/Dark mode", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("sd-theme-mode"));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "auto");
    await expect.poll(() => page.locator("html").evaluate(node => node.classList.contains("dark"))).toBe(false);

    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => page.locator("html").evaluate(node => node.classList.contains("dark"))).toBe(true);

    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "light");
    await expect.poll(() => page.locator("html").evaluate(node => node.classList.contains("dark"))).toBe(false);

    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");
    await expect.poll(() => page.locator("html").evaluate(node => node.classList.contains("dark"))).toBe(true);

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  });
});
