import { test, expect } from '@playwright/test';

async function setCheckoutOpen(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // The approved first-load Welcome must finish before a drawer can become visible.
  await page.locator('#welcomeSplash').waitFor({ state: 'detached', timeout: 12000 }).catch(() => {});
  await page.locator('#checkoutDrawer').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    const drawer = document.getElementById('checkoutDrawer');
    drawer.removeAttribute('inert');
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

test('full Storefront has coherent navigation, catalog, glass surfaces and order journey', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/sd-experience-storefront/);
  const styles=await page.request.get('/experience-unified.css?v=20261031-full');
  expect(styles.status()).toBe(200);
  await expect(page.locator('#products #catalogSearch')).toHaveCount(1);
  await expect(page.locator('#categoryFilters')).toHaveCount(1);
  await expect(page.locator('#productOverlay .detail-actions')).toHaveCount(1);
  await expect(page.locator('#cartDrawer')).toHaveCount(1);
  await expect(page.locator('#accountDrawer')).toHaveCount(1);
  await expect(page.locator('#orderDetailsPanel')).toHaveCount(1);
  await expect(page.locator('#checkoutDrawer #sdCheckoutStepper')).toHaveCount(1);
  const viewportSafe=await page.locator('#mobileBottomNav').evaluate(el => {
    const b=el.getBoundingClientRect();return b.left>=-2&&b.right<=innerWidth+2;
  });
  expect(viewportSafe).toBe(true);
});

test('Admin uses shared 3-layer design across overview, operations and editing', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/sd-experience-admin/);
  await expect(page.locator('.topbar')).toHaveCount(1);
  await expect(page.locator('.mobiletabs .nav')).toHaveCount(5);
  await expect(page.locator('.sidebar [data-view="orders"]')).toHaveCount(1);
  await expect(page.locator('.sidebar [data-view="customers"]')).toHaveCount(1);
  await expect(page.locator('.sidebar [data-view="warranties"]')).toHaveCount(1);
  await expect(page.locator('#productEditorTabs')).toHaveCount(1);
  await expect(page.locator('.editorfooter #saveProduct')).toHaveCount(1);
  const styles=await page.request.get('/experience-unified.css?v=20261031-full');
  expect(styles.status()).toBe(200);
});
