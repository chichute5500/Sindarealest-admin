import { test, expect } from "@playwright/test";
import { validateAdminPreviewUrl } from "../../scripts/admin-preview-url.mjs";

const adminUrl = validateAdminPreviewUrl(process.env.ADMIN_TEST_URL);
const origin = new URL("/", adminUrl).href;

test.describe("SinDarealest2 storefront Preview (read-only)", () => {
  test("loads the storefront and public product API without 5xx or uncaught JavaScript errors", async ({ page, request }) => {
    const pageErrors = [];
    const serverErrors = [];
    page.on("pageerror", (error) => {
      // Keep diagnostics short and avoid serializing page state or request headers.
      pageErrors.push(String(error?.message || "uncaught page error").slice(0, 180));
    });
    page.on("response", (response) => {
      if (response.status() >= 500 && new URL(response.url()).origin === new URL(origin).origin) {
        serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });

    const home = await page.goto(origin, { waitUntil: "domcontentloaded" });
    expect(home?.status() ?? 0).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("#products")).toBeVisible();

    const productsResponse = await request.get(new URL("/api/products", origin).href, { maxRedirects: 0 });
    expect(productsResponse.status()).toBe(200);
    expect(productsResponse.headers()["content-type"] || "").toContain("application/json");
    const productsPayload = await productsResponse.json();
    expect(Array.isArray(productsPayload.products)).toBe(true);
    expect(productsPayload.products.length).toBeGreaterThan(0);

    await expect(page.locator("#catalogGrid .product-card").first()).toBeVisible({ timeout: 15_000 });
    const cardCount = await page.locator("#catalogGrid .product-card").count();
    expect(cardCount).toBeGreaterThan(0);
    expect(pageErrors, "storefront should not raise uncaught JavaScript errors").toEqual([]);
    expect(serverErrors, "storefront should not return HTTP 5xx responses").toEqual([]);
  });

  test("fits phone, tablet, and desktop viewports and closes the mobile menu after navigation", async ({ page }) => {
    const sizes = [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
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

  test("follows System theme and allows explicit Light/Dark selection", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("sd-theme-mode"));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await expect.poll(() => page.locator("html").evaluate((node) => node.classList.contains("dark"))).toBe(false);
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "auto");

    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => page.locator("html").evaluate((node) => node.classList.contains("dark"))).toBe(true);

    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "light");
    await expect.poll(() => page.locator("html").evaluate((node) => node.classList.contains("dark"))).toBe(false);

    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");
    await expect.poll(() => page.locator("html").evaluate((node) => node.classList.contains("dark"))).toBe(true);

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  });
});
