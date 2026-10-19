import { test, expect } from "@playwright/test";

test.use({ serviceWorkers: "block" });

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(entries) {
  const localParts = [], centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }
  const centralBytes = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralBytes, end]);
}

function webpFixture() {
  const bytes = Buffer.alloc(16);
  bytes.write("RIFF", 0, "ascii");
  bytes.write("WEBP", 8, "ascii");
  return bytes;
}

async function mockAdminApis(page, { writes }) {
  await page.route("**/api/admin/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (method !== "GET" && !path.endsWith("/login") && !path.endsWith("/logout")) {
      writes.push({ method, path });
    }
    if (path.endsWith("/login")) {
      return route.fulfill({
        status: 200,
        headers: { "content-type": "application/json", "set-cookie": "sd_admin_session=local-test-session; Path=/; HttpOnly; SameSite=Lax" },
        body: JSON.stringify({ ok: true }),
      });
    }
    if (path.endsWith("/logout")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    if (path.endsWith("/zip-import/status")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, enabled: false, reason: "ZIP_IMPORT_ENABLED chưa được bật trong Preview." }) });
    }
    if (path.endsWith("/products") && method === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [] }) });
    if (path.endsWith("/settings")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ showPrices: true, watermarkEnabled: false, watermarkPosition: "bottom-right", watermarkSize: 18, watermarkOpacity: 60, welcomeEnabled: false }) });
    if (path.endsWith("/orders")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [] }) });
    if (path.endsWith("/customers")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customers: [] }) });
    if (path.endsWith("/warranties")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ claims: [], warranties: [] }) });
    if (path.endsWith("/audit-logs")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ logs: [] }) });
    if (path.endsWith("/session")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ authenticated: true }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
}

test("ZIP import preview stays read-only and disabled when the isolated feature flag is off", async ({ page }) => {
  const writes = [];
  await mockAdminApis(page, { writes });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:8788/admin/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.locator("#password").fill("local-only-test-password");
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appView")).toBeVisible();
  await page.locator("#ziNav").click();
  await expect(page.locator("#zipImportPanel")).toBeVisible();

  const record = {
    export_id: "preview-only-001",
    export_folder: "images/preview-only-001/",
    product_id: "source-product-001",
    product_url: "https://example.invalid/item/preview-only-001",
    title_vi: "Giày kiểm thử",
    category_vi: "Sneaker",
    image_files: ["images/preview-only-001/01.webp"],
    image_manifest: [],
    image_export_failed: 0,
  };
  const zip = makeZip([
    { name: "products.json", data: JSON.stringify([record]) },
    { name: record.image_files[0], data: webpFixture() },
  ]);
  await page.locator("#ziFile").setInputFiles({ name: "preview-only.zip", mimeType: "application/zip", buffer: zip });
  await page.locator("#ziRead").click();
  await expect(page.locator("#ziPreview")).toBeVisible();
  await expect(page.locator("#ziCommit")).toBeDisabled();
  await expect(page.locator("#ziStatus")).toContainText("nhập bị khóa");
  await expect(page.locator("#ziStatus")).toContainText("ZIP_IMPORT_ENABLED");
  expect(writes, "disabled preview must never POST a product or upload an image").toEqual([]);
});

test("ZIP import entry point remains reachable from the phone navigation", async ({ page }) => {
  const writes = [];
  await mockAdminApis(page, { writes });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:8788/admin/", { waitUntil: "domcontentloaded" });
  await page.locator("#password").fill("local-only-test-password");
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appView")).toBeVisible();
  await expect(page.locator("#ziNavMobile")).toBeVisible();
  await page.locator("#ziNavMobile").click();
  await expect(page.locator("#zipImportPanel")).toBeVisible();
  expect(writes).toEqual([]);
});
