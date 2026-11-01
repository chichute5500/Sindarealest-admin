# Audit baseline — 2026-10-31

Source: main at commit `cca1ff9be2ab7de4d89702f6dabf80d9bf3c7657`.
Audit branch: `fix/audit-2026-10`.

## Verified by source inspection
- Public/_redirects contains `/* /index.html 200`.
- Function middleware renders catalog metadata server-side, but omits twitter title/description for catalog.
- /robots.txt and /sitemap.xml are already implemented as Functions; do not duplicate.
- /api/order-tracking rate limit: 5 requests / 900 s; /api/warranty-lookup: 6 requests / 900 s (read-only inspection).
- Homepage title is different from Open Graph title.
- Homepage has untranslated UI strings and conflicting account sync text.
- Welcome logic bypasses on same-site navigation only, not consistently for in-session reload and deep link.

## Runtime / browser baseline
Lighthouse mobile and desktop Performance/Accessibility/Best Practices/SEO: **not measured**.
LCP, CLS, INP/TBT: **not measured**.
FPS minimum/average and long tasks: **not measured**.
Screenshots at 360/390/768/1280/1920: **not captured**.
Cloudflare production or preview probe: **not verified**.
No production checkout, customer data, D1, KV or R2 were accessed.

Reason: local execution container has no DNS access to github.com or pages.dev; available GitHub connector permits source reads and writes but not a browser or Cloudflare deployment.
No numbers are estimated or fabricated.
