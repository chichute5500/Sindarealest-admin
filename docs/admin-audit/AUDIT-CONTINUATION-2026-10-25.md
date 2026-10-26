# Admin code audit continuation — 2026-10-25, 06:43 UTC

**No integration, PR merge, Production changes, or store Preview modifications.** Scope: Admin branch `feature/admin-isolated-handoff-2026-10-20`.

## Verified source checkpoint

Source/test HEAD before this report: `9b6bb3145145b1399391dd235f1a2efb9ee66b99`.

Six workflow runs **SUCCESS** on that exact SHA: [Validate #40169836229](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169836229), [Validate #40169833551](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169833551), [Admin Playwright #40169836222](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169836222), [isolated Playwright #40169836334](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169836334), [isolated Playwright #40169833547](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169833547), [diagnostic #40169833613](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169833613).

### Bugs actually corrected

1. **Private warranty evidence R2 outage:** `functions/api/admin/warranty-claim-image.js` used to catch `ORIGINALS.get()` failure and silently read `IMAGES`, risking substitution of a public object for a private evidence image. Fail closed 503 now, while retaining legacy fallback only when the private get genuinely returns no object. Test covers both failure and absence.
2. **Product PUT/DELETE stale-write phantom audit:** `functions/api/admin/products/[id].js` formerly treated an UPDATE/DELETE after a concurrent delete as success. It now verifies D1 `meta.changes===1`, rejects stale writes HTTP 409, and conditionally inserts audit with `WHERE changes()=1`. Real in-memory SQLite (migrations `0001`–`0009`) tests successful and stale updates/deletes and zero phantom audit logs. No live products touched.
3. **Runtime access control:** `tests/admin-route-runtime-auth.test.mjs` executes **31 authenticated Admin HTTP handlers** against both missing-session and cross-site-session requests and demands HTTP 401 / 403 without any D1 method call. Three explicit unsupported 405 handlers are separately accounted for. All checks PASS.

### New visual evidence

[Admin Preview diagnostic run #40169833613, artifact #12589933479](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40169833613/artifacts/12589933479) contains 142 captured PNG (including a reference composite and supplemental examples); metadata confirms the login logo source remains `/images/brand-emblem.png`, computed CSS filter **none**, in light/dark at 320/360/375/390/412/768/1280/1440 px. Login horizontal overflow false in all 16 tested configurations. The source logo is gold in both login and product editor screenshots.

**Important limitation:** This artifact is multi-state local/static screenshot evidence. It is not an owner-approved, reference-matched visual comparison. Approved-design parity still **0 of 12 accepted**. In the reference login there are a username field, remember-me and recovery features; live password-only Admin deliberately omits these. Do not add fake credential/forgot-password UI just to mimic an image. The reference revenue chart/6-customer list also use illustrative data unlike the isolated Preview; compare equivalent data states before visual signoff.

### Environment blocker remains external, not fixable by inventing bindings

Fail-closed metadata preflight [#40167641001](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40167641001) intentionally FAILS with exactly 3 blockers: storefront Preview DB uses Production DB, Admin Preview lacks `ORIGINALS`, storefront Preview `ORIGINALS` uses Production private R2. Admin Preview DB and IMAGES remain isolated from Production. **Do not perform live private R2 upload/write or storefront Preview D1 write QA until owner corrects configuration, verifies privacy, and reruns preflight.**

### Exact deployment distinction

Source branch contains new backend changes from commits after `c64e07f`; the deployed Admin Preview app may still be based on the last `c64e07f` deploy. Source CI PASS and isolated Preview read-only tests **do not** mean new backend handlers were deployed or tested against live R2. Do not claim that.

### Next steps

Continue independent code review of payment transactions/races, backup/restore atomicity, startup security and UI. Once owner configures isolated `ORIGINALS`, test run-owned R2 objects with verified rollback/cleanup only on isolated Preview. To reach 100%, complete evidence rubric, 12-screen same-state comparison and owner acceptance. **No merge/integration unless separately authorized.**
