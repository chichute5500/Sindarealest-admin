import { test, expect } from '@playwright/test';

async function setCheckoutOpen(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#checkoutDrawer').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    const drawer = document.getElementById('checkoutDrawer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  });
  await page.waitForTimeout(550);
}

test('mobile checkout uses bottom glass sheet and original payment controls', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await setCheckoutOpen(page);
  const details = await page.locator('#checkoutDrawer').evaluate(el => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return { x: r.left, width: r.width, bottom: innerHeight - r.bottom,
      visibility: st.visibility, position: st.position, transform: st.transform };
  });
  expect(details.position).toBe('fixed');
  expect(details.x).toBeGreaterThanOrEqual(0);
  expect(details.x).toBeLessThan(18);
  expect(details.width).toBeGreaterThan(355);
  expect(details.bottom).toBeGreaterThan(45);
  expect(details.visibility).toBe('visible');
  await expect(page.locator('#checkoutClose')).toHaveCount(1);
  await expect(page.locator('#sdCheckoutSaveQr')).toHaveCount(1);
  await expect(page.locator('#sdCheckoutOpenBank')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/combined-mobile-checkout.png', fullPage: false });
});

test('desktop checkout preserves right-side drawer layout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await setCheckoutOpen(page);
  const details = await page.locator('#checkoutDrawer').evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.left, width: r.width, right: innerWidth - r.right };
  });
  expect(details.x).toBeGreaterThan(500);
  expect(details.right).toBeGreaterThanOrEqual(-3);
  expect(details.right).toBeLessThan(30);
});

test('mobile sheet respects reduced-motion setting', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setCheckoutOpen(page);
  const duration = await page.locator('#checkoutDrawer').evaluate(el => getComputedStyle(el).transitionDuration);
  expect(duration.split(',').every(v => ['0s', '0ms', '0.00001s'].includes(v.trim()))).toBe(true);
});
