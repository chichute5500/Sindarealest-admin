# ADMIN — 12-SCREEN REFERENCE AUDIT

**Checkpoint:** 2026-10-22T21:50+07:00  
**Current ADMIN HEAD:** `7d9cde727476ac05ee7431b457e7377b34c750fe`  
**Progress:** 50% PROVISIONAL; all screens remain unaccepted overall.

## Latest relevant test evidence

- Current exact-SHA run [#39797841880](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39797841880) on `7d9cde7` is **QUEUED** at last poll. Commit `7d9cde7` changes the E2E assertion to read the actual page viewport width; it is not a product fix and has no acceptance result yet.
- Run [#39796182324](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39796182324) on `401b961` failed with `ReferenceError: variant is not defined` at line 1752; [artifact #327](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39796182324/artifacts/12433587319).
- Run [#39794007381](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39794007381) on `26f1c6f` failed because `.mobiletabs` was hidden when test expected visible at line 1752; [artifact #326](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39794007381/artifacts/12432254530).

- Source Playwright run [#39792844330](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39792844330) checked out `a6fc090b60e579e9d708775f0c25e3ba56f3439b`; [artifact #324](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39792844330/artifacts/12431484447).
- Artifact #324: 61 PNGs = 16 login-shell images + 45 local fixture images; 41 fixture metrics. Page errors, console errors, failed requests and HTTP errors were zero; fixture mode blocked/recorded all attempted non-GET requests.
- On that SHA, `npm run check` and `npm test` passed; local Playwright was **2 passed / 1 failed** due a strict-mode focus assertion that matched both desktop and mobile copies of the Order detail button. The limited remote Preview smoke passed two tests; it is not authenticated business QA.
- New test assertion fix is at `26f1c6fb0632a2b80b3f8d4864fa043fc3e98642`; run [#39794007381](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39794007381) is QUEUED at last verified poll.

## Screen-by-screen disposition

| # | Screen | Status | Tested SHA / viewport / theme | What evidence says | Remaining gap |
|---:|---|---|---|---|---|
| 1 | Login | PARTIAL_NOT_ACCEPTED | `a6fc090...`; 320×640, 360×800, 375×812, 390×844, 412×915, 768×1024, 1280×800, 1440×900; light/dark | 16 shell PNGs in artifact #324; no page/console/network errors recorded. | Shell and limited CSS/login smoke only; no authenticated business workflow. |
| 2 | Dashboard | PARTIAL_NOT_ACCEPTED | `a6fc090...`; 390×844 light/dark, 1280×800 light | Fixture screenshots; document width matched viewport. | Synthetic/no-data UI; no real KPI/business data. |
| 3 | Product list | PARTIAL_NOT_ACCEPTED — DATA_LIMITED_REVIEW_CLOSED | Prior fixture SHA in existing audit; 320×640 and 360×800 light/dark | No horizontal overflow; search/filters/empty-state/edit path have test coverage. | Only 3 products for page size 12; pagination and reference content density are not proven. No fabricated images/prices/stock; no new geometry repetition without a new defect. |
| 4 | Product editor | PARTIAL_NOT_ACCEPTED | `a6fc090...`; 390×844 light/dark, 1280×800 light | Tabs, keyboard behavior, fields, SKU checkbox, AI button and footer have fixture/layout coverage. | Real save, SKU persistence, AI response and full visual parity unverified. |
| 5 | Product gallery | PARTIAL_NOT_ACCEPTED | `a6fc090...`; 320×640, 360×800 light/dark; 390×844 and 1280×800 light/dark where captured | Gallery dialog/thumbnail rail has responsive fixture screenshots; no document overflow in recorded metrics. | R2 persistence deferred/not verified; fixture images are not business assets. |
| 6 | Orders | PARTIAL_NOT_ACCEPTED | `a6fc090...`; 390×844 light/dark, 1280×800 light | Artifact #324: document width 390/390/1280 with no document overflow. Desktop table client width 934px vs content 987px is intentional internal table scroll. | Three synthetic orders; no authenticated backend or multi-page pagination proof. |
| 7 | Order detail | PARTIAL_NOT_ACCEPTED | `a6fc090...`; 390×844 light, normal + full-page | Artifact #324 contains both screenshots; document width 390, horizontal overflow false. Detail UI rendered, including payment/fulfillment and terms fixture content. | Capture helper then failed at focus assertion due two responsive button matches. Latest selector fix on `26f1c6f...` is awaiting run #326. Fixture only; no dark/desktop or authenticated workflow proof. |
| 8 | Customers | PARTIAL_NOT_ACCEPTED | No Customer screenshot in artifact #324 | Earlier fixture/search evidence only. | Need separate viewport/theme/source-specific proof and authorized live-data verification. |
| 9 | Warranty/support | PARTIAL_NOT_ACCEPTED | No Warranty screenshot in artifact #324 | Earlier fixture evidence only. | Live-data parity and operations unverified. |
| 10 | Website settings | PARTIAL_NOT_ACCEPTED | No settings screenshot in artifact #324 | No persistent live settings proof from this run. | Compare settings groups and toggle/error states separately; live save is not proven. |
| 11 | Backup/Restore | PARTIAL_NOT_ACCEPTED | No backup/restore screenshot in artifact #324 | UI-only tests do not prove export/restore cycle. | No real export/restore or destructive action validation. |
| 12 | Activity log | PARTIAL_NOT_ACCEPTED | Source feature exists from earlier code SHA; not captured in artifact #324 | Read-only GET endpoint, search/action filter, refresh/error state and 200-record limit disclosure have source/unit coverage. | Screenshot layout and authorized live audit-log data remain unverified. |

## Acceptance policy

- Each screen requires exact source SHA, real workflow/artifact URL, viewport/theme, specific interaction and explicit limitations.
- `PASS` is only for a completed/reproducible screen test with evidence. Fixture screens can pass a *fixture behavior* assertion but do not pass authenticated backend acceptance.
- Keep `FAIL`, `BLOCKED`, `NOT VERIFIED` distinct from `PARTIAL_NOT_ACCEPTED`.
- Never invent customer/order/product records, prices, stock, images or payment state.
- Do not run setup/deploy/migrations or remote D1/R2 operations; no Production deploy, Access bypass, merge or protected-branch write.

## Next

1. Poll run #39797841880 (exact SHA `7d9cde7`); update this table only when there is new screen evidence.
2. After CI is understood, continue screens #8–#12 with independent reference comparison and evidence; reuse prior tests/screenshots instead of repeating geometry already closed for #3/#4.
3. Continue PR #111 provenance/payment guard review. Remote D1 schema/ledger remains NOT VERIFIED; migration 0009 and PRE/PRO migrations deferred; R2 save deferred; AI grouping blocked pending owner contract.
