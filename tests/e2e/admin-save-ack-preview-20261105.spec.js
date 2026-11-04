import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// ONE bounded live write test of a QA-owned product in isolated Preview D1.
// No production DB/R2 access; do not upload or delete any real customer/product media.
test.use({ serviceWorkers: 'block' });
test('Admin Preview: create, price, gallery reorder, readback and cleanup', async ({ page }) => {
  test.setTimeout(130_000);
  const base = process.env.SD_ADMIN_SAVE_ACK_PREVIEW_BASE;
  const password = process.env.ADMIN_TEST_PASSWORD;
  if (!base || !/^https:\/\/admin-save-ack-20261105\.sindarealest-admin-preview\.pages\.dev\/?$/.test(base))
    throw new Error('REFUSE_UNPINNED_PREVIEW_URL');
  if (!password) throw new Error('MISSING_PREVIEW_ADMIN_TEST_PASSWORD');
  const accessId = process.env.CF_ACCESS_CLIENT_ID;
  const accessSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (accessId && accessSecret)
    await page.setExtraHTTPHeaders({ 'CF-Access-Client-Id': accessId, 'CF-Access-Client-Secret': accessSecret });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const title = 'QA PREVIEW SAVE ACK ' + (process.env.GITHUB_RUN_ID || 'local');
  const out = 'artifacts/admin-save-ack';
  mkdirSync(out, { recursive: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let id = null;
  const api = async (method, path, body) => page.evaluate(async ({ method, path, body }) => {
    const r = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== null ? { body: JSON.stringify(body) } : {}) });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  }, { method, path, body: body ?? null });
  const allProducts = async () => {
    const res = await api('GET', '/api/admin/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.products)).toBe(true);
    return res.data.products;
  };
  try {
    await page.goto(base + '/admin/?view=products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 15_000 });
    await page.locator('#password').fill(password);
    await page.locator('#loginForm button[type="submit"]').click();
    await expect(page.locator('#appView')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#searchBox')).toBeVisible({ timeout: 15_000 });
    const before = await allProducts();
    expect(before.some(p => p.title === title)).toBe(false);

    // UI CREATE: check a real 201, visible success toast and persisted catalog entry.
    await page.locator('#main [data-action="add"]:visible').first().click();
    await expect(page.locator('#backdrop')).toBeVisible();
    await page.locator('#pTitle').fill(title);
    await page.locator('#pCategory').fill('Clutch');
    await page.locator('#pPrice').fill('1234500');
    await page.locator('#saveProduct').click();
    await expect(page.locator('#toast')).toContainText('Đã thêm sản phẩm.', { timeout: 15_000 });
    let persisted = await allProducts();
    const created = persisted.filter(p => p.title === title);
    expect(created.length, 'Create once, never duplicate').toBe(1);
    id = created[0].id;
    expect(created[0].price).toBe(1234500);
    // Keep the QA item hidden while checking the rest of the workflow.
    const hide = await api('PATCH', '/api/admin/products/' + encodeURIComponent(id),
      { field: 'published', value: false, expectedValue: true });
    expect(hide.status).toBe(200);

    // UI QUICK PRICE: the D1 write must acknowledge 200, then persist after reload.
    await page.locator('#searchBox').fill(title);
    const priceButton = page.locator('[data-inline-edit="price"][data-id="' + id + '"]:visible').first();
    await expect(priceButton).toBeVisible();
    await priceButton.click();
    await page.locator('form.product-quick-editor input[name="quickValue"]').fill('1700000');
    await page.locator('form.product-quick-editor .product-quick-save').click();
    await expect(page.locator('#toast')).toContainText('Đã cập nhật sản phẩm.', { timeout: 15_000 });
    persisted = await allProducts();
    expect(persisted.find(p => p.id === id)?.price).toBe(1700000);

    // Seed only this QA row with references to EXISTING Preview images: NO R2 write.
    const existingImages = [...new Set(before.flatMap(p => p.images || []))]
      .filter(x => /^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(x)
        || /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(x)).slice(0, 2);
    expect(existingImages.length, 'Require two real read-only image references').toBe(2);
    const seeded = await api('PATCH', '/api/admin/products/' + encodeURIComponent(id),
      { field: 'images', value: existingImages, expectedValue: [] });
    expect(seeded.status).toBe(200);
    // Fresh page guarantees the gallery form opened a current version.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#appView')).toBeVisible({ timeout: 20_000 });
    await page.locator('#searchBox').fill(title);
    await page.locator('[data-inline-photo="' + id + '"]:visible').first().click();
    await expect(page.locator('#productPanelGallery')).toBeVisible();
    const second = page.locator('#imageGrid [data-image-index="1"]');
    await second.focus();
    await second.press('Home');
    await expect(page.locator('#galleryStatus')).toContainText('Đã chuyển ảnh 2 đến vị trí 1');
    await page.locator('#saveProduct').click();
    await expect(page.locator('#toast')).toContainText('Đã lưu thay đổi sản phẩm.', { timeout: 15_000 });
    persisted = await allProducts();
    expect(persisted.find(p => p.id === id)?.images).toEqual([...existingImages].reverse());

    // A true stale writer MUST still get 409; don't disable conflict protection.
    const stale = await api('PATCH', '/api/admin/products/' + encodeURIComponent(id),
      { field: 'price', value: 1800000, expectedValue: 1234500 });
    expect(stale.status).toBe(409);
    expect((await allProducts()).find(p => p.id === id)?.price).toBe(1700000);
    await page.screenshot({ path: out + '/mobile-qa-saved.png', animations: 'disabled' });
    expect(errors).toEqual([]);
    console.log('PASS: QA-only Preview D1 create, price, gallery reorder, reload, stale CAS, and success notices.');
  } finally {
    // Must clean up the ONLY run-owned QA product. Failure is visible in CI, not masked.
    if (id) {
      const deleted = await api('DELETE', '/api/admin/products/' + encodeURIComponent(id));
      expect(deleted.status, 'QA product cleanup DELETE').toBe(200);
      expect((await allProducts()).some(p => p.id === id), 'QA product removed').toBe(false);
      console.log('PASS: QA-only Preview product removed; no Production mutation.');
    }
  }
});
