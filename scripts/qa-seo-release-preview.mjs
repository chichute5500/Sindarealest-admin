import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const preview = process.env.PREVIEW_URL;
if (!preview) throw new Error('PREVIEW_URL is required');
const origin = new URL(preview).origin;
const output = 'artifacts/knowledge-preview';
const title = 'SinDarealest | Giày, Ví, Thắt Lưng & Phụ Kiện Da Cá Sấu Thật 100%';
const description = 'Thương hiệu đồ da cá sấu thủ công SinDarealest: Giày Sneaker, Giày lười, Giày tây, Ví nam nữ, Thắt lưng liền nguyên tấm & Phụ kiện da cá sấu thật 100%. Bảo hành 6–12 tháng, bảo dưỡng trọn đời.';
const cards = [
  ['/kien-thuc/phan-biet-da-ca-sau-that-da-dap-van/', 'Phân biệt da cá sấu thật và da dập vân: cần kiểm tra gì?'],
  ['/kien-thuc/da-bung-da-lung-da-hong-ca-sau/', 'Da bụng, da lưng và da hông cá sấu khác nhau thế nào?'],
  ['/kien-thuc/chon-that-lung-da-ca-sau/', 'Chọn thắt lưng da cá sấu: bản dây, khóa và cách đo size'],
  ['/kien-thuc/chon-size-giay-da-ca-sau-online/', 'Cách chọn size giày da cá sấu khi mua online']
];
const browser = await chromium.launch({ headless: true });
const report = [];
try {
  await mkdir(output, { recursive: true });
  for (const [device, viewport] of [
    ['desktop', { width: 1365, height: 900 }],
    ['mobile', { width: 390, height: 844 }]
  ]) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
      isMobile: device === 'mobile',
      hasTouch: device === 'mobile'
    });
    const home = await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    assert.equal(home?.status(), 200, `${device}: homepage should return 200`);
    await page.locator('#home-knowledge').waitFor({ state: 'visible', timeout: 15000 });
    const homeResult = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      twitterDescription: document.querySelector('meta[name="twitter:description"]')?.content,
      cards: [...document.querySelectorAll('#home-knowledge .sd-home-knowledge-card')].map(card => ({
        href: new URL(card.getAttribute('href'), location.origin).pathname,
        title: card.querySelector('h3')?.textContent.trim()
      })),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    }));
    assert.equal(homeResult.title, title, `${device}: homepage title`);
    assert.equal(homeResult.description, description, `${device}: homepage description`);
    assert.equal(homeResult.ogTitle, title, `${device}: Open Graph title`);
    assert.equal(homeResult.twitterDescription, description, `${device}: Twitter description`);
    assert.deepEqual(homeResult.cards, cards.map(([href, cardTitle]) => ({ href, title: cardTitle })), `${device}: homepage cards`);
    assert.ok(homeResult.scrollWidth <= homeResult.viewportWidth, `${device}: homepage horizontal overflow`);
    await page.screenshot({ path: `${output}/${device}-home.png`, fullPage: true });
    report.push({ device, route: '/', status: home.status(), ...homeResult });

    const article = await page.goto(origin + cards[0][0], { waitUntil: 'domcontentloaded', timeout: 25000 });
    assert.equal(article?.status(), 200, `${device}: article should return 200`);
    await page.getByRole('heading', { name: cards[0][1], level: 1 }).waitFor({ state: 'visible', timeout: 15000 });
    const related = await page.locator('nav.related').evaluate(nav => [...nav.querySelectorAll('a')].map(link => ({
      href: new URL(link.href).pathname,
      title: link.textContent.trim()
    })));
    assert.equal(related.length, 4, `${device}: related navigation should have four links`);
    const articleLayout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth
    }));
    assert.ok(articleLayout.scrollWidth <= articleLayout.viewportWidth, `${device}: article horizontal overflow`);
    await page.screenshot({ path: `${output}/${device}-article.png`, fullPage: true });
    report.push({ device, route: cards[0][0], status: article.status(), related, ...articleLayout });
    await page.close();
  }

  const page = await browser.newPage();
  for (const [path, destination] of [
    ['/tra-cuu?source=preview-qa', '/tra-cuu-don-hang?source=preview-qa'],
    ['/lien-he', '/#contact'],
    ['/gioi-thieu/', '/#about']
  ]) {
    const response = await page.request.get(origin + path, { maxRedirects: 0, timeout: 15000 });
    assert.equal(response.status(), 301, `${path}: should return a permanent redirect`);
    assert.equal(new URL(response.headers().location, origin).href, origin + destination, `${path}: redirect target`);
  }

  const sitemapResponse = await page.request.get(origin + '/sitemap-pages.xml', { timeout: 15000 });
  assert.equal(sitemapResponse.status(), 200, 'static sitemap should load');
  const sitemap = await sitemapResponse.text();
  for (const path of ['/privacy-policy', '/terms-of-service', '/data-deletion']) {
    assert.ok(sitemap.includes(`<loc>https://casauvip.store${path}</loc>`), `${path}: canonical URL should appear in sitemap`);
    const response = await page.request.get(origin + path, { timeout: 15000 });
    assert.equal(response.status(), 200, `${path}: legal page should load`);
  }
  const articleNoSlash = await page.request.get(origin + '/kien-thuc/phan-biet-da-ca-sau-that-da-dap-van', {
    maxRedirects: 0,
    timeout: 15000
  });
  assert.equal(articleNoSlash.status(), 301, 'article without slash should redirect');
  assert.equal(new URL(articleNoSlash.headers().location, origin).pathname, '/kien-thuc/phan-biet-da-ca-sau-that-da-dap-van/');
  report.push({ routeChecks: 'passed', redirects: 3, legalPages: 3, sitemap: 'passed', articleCanonical: 'passed' });
  await page.close();
  await writeFile(`${output}/release-report.json`, JSON.stringify({ preview: origin, sha: process.env.GITHUB_SHA, report }, null, 2));
  console.log('PASS: desktop/mobile homepage and article, legacy redirects, article canonical, legal pages, and sitemap.');
} finally {
  await browser.close();
}
