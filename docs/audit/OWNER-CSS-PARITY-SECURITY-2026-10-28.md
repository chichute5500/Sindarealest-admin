# SINDAREALEST — OWNER CSS, ADMIN/STOREFRONT PARITY AND SECURITY AUDIT
Date: 2026-10-28 | Scope: full repository review with targeted nonbreaking fixes | Branch: `audit/css-parity-security-2026-10-28`
Baseline: merged Owner-PASS Welcome/device theme main `7c6607e5115cdec9aceee28b00bff4d7d0c4fc30`

## Guardrails
- **No Production D1/R2 writes**. No order/payment/warranty migration, no owner-approved Hero/Welcome animation/layout replacement.
- **No broad auto-rewrite of CSS**. We eliminate provably shadowed declarations and duplicated palette origins, preserving the effective Blue Liquid Glass design; current storefront layered CSS is fragile and requires visual comparison before wider consolidation.
- Preview uses separate `sindarealest-admin-preview` project and a separate branch, with binding isolation checked before deploy. Owner PASS is needed before integrating these changes to `main`.

## Source inventory and completed checks
- Reviewed `public/index.html` (Storefront), `public/admin/index.html` (Admin), `public/code-hero.css`, `public/material-gallery.css`, `public/_headers` and `functions/_middleware.js`/`functions/_lib.js` shared request/session functions.
- Checked the package CI suite and Admin/public API endpoint guard test coverage including login rate-limit, session rotation, same-origin checks, upload restriction, write race, payment/checkout, warranty, inventory and binding isolation.
- The CSS scanner covers **27 inline Storefront style blocks, 1 inline Admin style block, 2 independent CSS files**. Duplicate selectors in distinct screen breakpoints and intentional layers are *not automatically vulnerabilities or cosmetic bugs*. It reports remaining same-selector cascade overlaps as information, not as proof of defects.

## Corrected overlap / regression root causes
1. **Admin inherited three overwritten beige/gold light palettes and two overwritten dark palettes**: removed those 5 token rules; the latest Owner-approved **ice-blue** theme is now the sole Admin light `:root` token source and the approved navy theme the sole dark Admin token source. Restored `font-family` and `color` inheritance in the canonical block to avoid layout differences. Kept the current brand emblem, grids, glass, typography and layout CSS.
2. **Storefront dark background had 7 older filter assignments shadowed by the final approved `filter:none!important`**: removed only those dead filters and retained opacity declarations and final filter. Other background CSS/timing remains untouched.
3. **Android forced-dark conflict in Admin**: explicit `color-scheme:only light` / `only dark`, matching the already PASSed Storefront browser contract, so a manual light theme does not get repainted dark by compatible browsers.
4. **Theme coherence between surfaces**: on a new entry/reload Admin now defaults to device appearance, like Storefront. In-tab manual Admin choice is maintained via `sessionStorage` under a distinct key, rather than reading the obsolete cross-surface `sd-theme-mode` localStorage value. Theme buttons and approved colors remain available separately on each surface.

## Security hardening
1. `public/_headers` declares `frame-ancestors 'none'`, `object-src 'none'`, and `base-uri 'self'` in CSP, plus XFO DENY, nosniff, Referrer-Policy and restrictive browser feature policy. This prevents hostile framing, plugin objects and malicious base URL rewrites without disabling the approved inline scripts.
2. **Functions-generated HTML** (home, catalog and product detail) now explicitly receives the same frame/base/object restrictions, because static `_headers` may not automatically cover dynamically generated Functions responses.
3. Shared JSON helpers used by Admin and Storefront add `X-Frame-Options: DENY`, `Referrer-Policy`, and `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`. Existing `no-store`, `nosniff`, session cookies, API status and JSON bodies are preserved.
4. New audit tests validate actual `Response` headers for Functions homepage/catalog and JSON, exact palette declarations, and a ban on resurrecting stale background CSS.
5. Security checks here are **defense-in-depth and source/integration checks, not an external penetration test or certification**. An aggressive nonce/hash-based script-src CSP would require migrating numerous Owner-approved inline scripts and full visual/E2E validation; it is deliberately **not introduced** by this nonbreaking change.

## Source/browser QA evidence
- Full `npm run check` and `npm test` on the branch; includes `tests/owner-css-parity-security-audit.test.mjs` in normal CI.
- Chromium visual integration: [Actions 40559386212](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40559386212): **4/4 PASS** for **Admin + Storefront**, mobile 390 px and desktop 1366 px, device Light and Dark. Checks computed palette, brand artwork, color-scheme, no horizontal overflow or JS page exceptions. Artifact includes 8 real browser screenshots.
- Final tested source SHA `f5728d040b14433d36f2da2868236da2b3b3231c` removes the 7 dead CSS declarations and includes explicit regression guards. Source and browser CI have now both passed. Later commits only update audit/handoff documents; check new HEAD CI as an extra gate.
- Isolated Owner Preview: https://owner-css-parity-1028.sindarealest-admin-preview.pages.dev/
- Existing security suite remains in CI: login/session tests, Admin auth surface tests, upload/JSON limits, SQL concurrency, return of private data, production binding guards.

## Remaining risk and next possible nonbreaking iterations
- The Storefront still has many layered style blocks from prior Owner-PASS iterations and intentionally repeated responsive selectors. They should not be collapsed based on duplicate counts alone. A safe future refactor needs baseline mobile/desktop screenshots across the actual Home, category, detail, checkout, cart and warranty screens, plus per-selector visual diff; do not claim every overlap is resolved.
- A strict `script-src` CSP and standalone JavaScript/CSS modules remain separate security/maintainability migrations due to approved inline script dependencies. No action without explicit approval.
- Runtime third-party Cloudflare configuration and a live adversarial penetration test are beyond the scope of static source/isolated browser QA; don't equate passing test suites with an absolute absence of security issues.

## Status
- **Audit changes are isolated and awaiting Owner PASS** as **Draft PR #136**; do not merge without approval.
- Final isolated Preview + 4/4 Chromium browser tests: [run #40560364276](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40560364276) **SUCCESS**.
- PR CI for verified code: [run #40560417021](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40560417021) **SUCCESS**.
- Next-chat documents: `docs/audit/HANDOFF-LATEST-2026-10-28-CSS-PARITY-SECURITY.md` and `docs/audit/PROMPT-NEXT-CHAT-2026-10-28-CSS-PARITY-SECURITY.md`.
- Main Production code stays `7c6607e5115cdec9aceee28b00bff4d7d0c4fc30` unless a later independently verified main change occurs.

## Phụ lục audit tiếp nối — 2026-10-28 (bổ sung trong chat này)
- Source follow-up SHA: `05c35a655f4e07771d94fc8cd9bd248087b9bc33`. Source GitHub Actions [#40567425583](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40567425583) **SUCCESS** after `npm run check` + full `npm test` on branch. Isolated Preview/browser matrix [#40567425595](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40567425595) **đang xác minh** ở thời điểm bổ sung (không tự tuyên bố PASS).
- **Confirmed HTTP route defect:** `functions/_middleware.js` let unsupported POST/PUT/PATCH/DELETE to product detail paths fall through to an internal GET or redirect. Added early HTTP 405 response, `Allow: GET, HEAD`, `Cache-Control: no-store` for modern and legacy product detail paths, before any DB access. Regression covers all four verbs in `tests/storefront-integration-route.test.mjs`.
- **Confirmed CSS dead declarations:** removed five older Storefront `.theme-bg--light` `filter` declarations, shadowed by the final unconditional `filter:none!important`. Preserved backgrounds, opacity and effective look. New source assertion explicitly verifies only the final filter; browser matrix asserts computed filters for light/dark.
- **QA coverage gap fixed:** isolated owner browser workflow used to trigger only on edits to its own YAML. Push path filters now include relevant Storefront/Admin CSS, Functions, audit scanner, unit and E2E files. Browser script also opens and closes Liquid Glass cart on 390/1366 widths in Light/Dark and saves four more screenshots.
- CSS audit still shows many layered responsive/conditional declarations in 27 Storefront style blocks. No mass rewrite. Admin/Storefront are aligned on theme tokens and the same product API; status/deposit/verification policies remain server-authoritative and production data untouched. Remaining surface coverage: category/detail/checkout/warranty with real data, Admin logged-in visual screens, live environment review/pentest. These are *not* certified by empty-data browser stubs.
- This PR is **DRAFT awaiting Owner PASS**; no Production D1/R2 mutation, no main merge or production deploy. A docs-only HEAD later than the tested code SHA is not evidence of a browser rerun.
