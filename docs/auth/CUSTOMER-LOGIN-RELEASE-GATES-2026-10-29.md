# SinDarealest customer login — release and safety checkpoint (2026-10-29)

Repository: `chichute5500/Sindarealest-admin`
Branch: `feat/zalo-customer-login-2026-10-29`
PR: #150 DRAFT. This is a new authentication feature. Do **not** merge/deploy without a separate Owner PASS.

## Owner-confirmed external setup

- Zalo domain `sindarealest2.pages.dev` has been verified.
- Zalo app has been activated; Web Home URL + callback URL saved.
- Cloudflare Production secrets reported saved by Owner:
  - `ZALO_APP_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Google OAuth client created and configured for web.
- Connector **cannot read Cloudflare bindings, secret values or deployment state**. Owner confirmation of saving is not a runtime connection test. Never put real secret values in GitHub/docs.

## Exact Cloudflare project naming (confirmed by Owner)

- **Pages project `sindarealest-admin-preview`** is a separate Cloudflare project from the production storefront `sindarealest2`.
- URL `.../pages/view/sindarealest-admin-preview/settings/production` is the **Production tab inside the separate admin-preview Pages project**, not the storefront's Production environment. Do not confuse the two.
- Owner screenshot showed **no D1 binding or variables in the visible section** of this admin-preview project's Production settings; it did not prove the D1 database resource itself is absent.
- If no existing, verified, isolated D1 belongs to that Preview project, create `sindarealest-customer-auth-preview` (or another explicit Preview-only name), then bind its ID to `DB` on `sindarealest-admin-preview`. Never attach storefront Production DB, and do not replace any existing verified binding without reviewing its database ID.
- For a **newly empty** D1, migration 0011 **alone is insufficient**: the OAuth and email rate limiter uses `public_rate_limits` from prior schema migrations, so apply the full required ordered baseline before 0011. Validate on isolated D1 only and redeploy the Preview project for binding changes to take effect.
- Source code now allows the exact trusted origins `https://sindarealest2.pages.dev` and `https://sindarealest-admin-preview.pages.dev`, with matching OAuth callback origin per request; arbitrary Host or X-Forwarded-Host are never trusted.
- Real Preview OAuth sign-in requires providers to explicitly accept the **Preview** callback domain; the Owner's previously registered **Production** callbacks are not sufficient. Do not swap or overwrite production callbacks just to make Preview pass.
- Email self-service is intentionally **disabled on the primary storefront** pending verified ownership and account recovery; it is allowed only on the isolated `sindarealest-admin-preview.pages.dev` origin for disposable QA.
- Google and Zalo Cloudflare secrets saved on the storefront project are **not automatically copied** to the separate admin-preview Pages project.

## Current functionality on DRAFT branch

- Zalo Social OAuth V4 code exchange with 43-character PKCE verifier, unique browser-bound OAuth state, single-use expiration, server-side App Secret, API appsecret proof.
- Google OAuth code exchange with state/PKCE and verified email via Google userinfo.
- Independent customer session stored as SHA-256 token hash in D1, `HttpOnly Secure SameSite=Lax` cookie, explicit logout.
- Email/password signup/login with PBKDF2 and rate limits, not yet safe to make public until email verification and password recovery.
- Existing Account drawer includes providers; guest checkout, admin, products, hero, theme, and owner-approved purchase flow untouched.
- Account screen's existing order history, wishlist, shipping address are still **device-local**, and no old customer orders or warranties can be claimed just from an unverified email/phone.

## Database migration

`migrations/0011_customer_auth.sql` creates only:
- `customer_auth_accounts`
- `customer_auth_sessions`
- `customer_auth_flows`

Independent SQLite in-memory E2E executes all existing known migrations through 0011 and verifies real constraints, OAuth state replay rejection, social sessions, email/password, logout and abuse rate limiting. Tests write to **memory only**; do not equate their PASS with Cloudflare Preview/Production D1 writes.

**Before real deployment:**
1. Establish the exact Cloudflare Pages Preview project and D1 binding IDs. Confirm Preview D1 != Production D1. Keep Preview R2 and production order data isolated.
2. Apply reviewed 0011 migration to **Preview D1 only**, then exercise customer auth endpoints and verify rollback/cleanup.
3. Confirm actual binding secrets work on that exact environment (preview callback URLs require Zalo/Google registration, otherwise use mocked provider E2E).
4. Back up Production D1, inspect production schema and migration state, then apply reviewed migration once; never update production DB when schema/binding mismatch.
5. Perform full real sign-in, logout and refresh on Android/desktop in light/dark themes, compare visual design with Owner PASS and verify Admin sessions remain independent.
6. Complete and test email ownership verification/password recovery before enabling email signup for customers.
7. Only after Owner reviews Preview and explicitly approves, merge PR and deploy; verify exact production SHA and have rollback plan.

## Security regression expectations

- Missing secrets or DB must fail closed with 503; never fall back to fake success.
- OAuth state is one-use, short-lived, bound to a browser flow; PKCE verifier never included in browser URL.
- Google userinfo requires `email_verified=true`.
- Zalo token request is authenticated by `secret_key` header; protected profile request includes `appsecret_proof`.
- Email accounts cannot claim an older order, customer record or warranty by merely sharing the email string.
- Rate limit login and OAuth start; no arbitrary callback redirect from user input.
- Admin auth cookie `sd_admin_session` never reused for customer auth.
- Test fixtures may never be inserted in Production D1, real customer ledger, or genuine warranties.

## Verification evidence

- CI source + independent SQLite-auth E2E at `ffce16152179ef2e025cb06af3525185552dd4b4`: [PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40765209594)
- Admin Preview Playwright at same checkpoint: [PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40765209454)
- Follow-up OAuth rate-limit patch must pass fresh CI before any release.
- No claim that real Zalo/Google account login or Cloudflare Preview D1 integration has passed yet.
