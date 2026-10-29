# Facebook customer login · isolated Preview · 2026-10-29

## User decision
Owner asked to prioritize Facebook login while phone/SMS OTP setup is paused. Preserve Google login Owner PASS, existing storefront/checkout/admin Owner PASS, and do not merge Main.

## Built on branch feat/zalo-customer-login-2026-10-29 / PR #150
- Facebook OAuth code flow with browser-bound, one-use D1 state and a rate-limited start; HTTPS exact Preview callback URL. Facebook web code flow is not assumed to enforce PKCE.
- Code exchanged server-to-server with App ID & Secret in POST body; no secret/token in browser URLs, provider errors sanitised; Graph /me request has Authorization header and minimal fields id,name; only valid Facebook numeric app-scoped ID creates an auth account.
- Shared customer cookie is HttpOnly, Secure, SameSite=Lax and isolated from Admin. No order/customer linking inferred from Facebook name.
- **New migration 0012** copies accounts + live customer sessions + oauth states before replacing constrained provider tables. Must be tested on disposable D1 and applied to isolated PREVIEW D1 only **after Owner setup**; never run automatically on Production.
- Facebook login button stays hidden until Facebook Preview credentials are present. Existing Google and Zalo code remain unchanged.
- CI / disposable SQLite auth tests include surviving Google rows and sessions, CSRF rejection, replay protection, Facebook session and logout.

## Meta configuration required from Owner (no application credentials have been provided)
1. Open https://developers.facebook.com/apps/ and create a Meta app called e.g. "SinDarealest Customer Login", choosing **Authenticate and request data from users with Facebook Login**. Facebook Login can be tested by app admins/testers while Meta app is in Development.
2. Add web platform. Set site URL to `https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev/`.
3. Under Use Cases -> Facebook Login -> Customize -> Settings, enable Client OAuth Login and Web OAuth Login and paste exact **Valid OAuth Redirect URI**:
   `https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev/api/customer/auth/facebook/callback`
   Do NOT overwrite any Production callback.
4. Only default `public_profile` permission is requested by this integration. No email, phone, friends or Pages permissions are assumed. Meta may require a privacy policy URL, data-deletion instructions, domain matching and app publication/review before permitting all customers.
5. From Meta App settings -> Basic obtain App ID and App Secret. **Do not paste App Secret into ChatGPT, a screenshot, code, PR or Github Actions logs.** The Owner must set **Cloudflare Pages project `sindarealest-admin-preview` -> Settings -> Variables and Secrets -> PREVIEW**:
   - `FACEBOOK_APP_ID` (Meta App ID, digits)
   - `FACEBOOK_APP_SECRET` (encrypted Secret)
6. Run the existing guarded Preview isolation gate before applying migration 0012 to **Preview D1** only. Back up that D1 and validate preservation of accounts/sessions in local disposable D1. If a migration cannot be safely applied, do not enable the Facebook button or point it at an unmigrated DB. Redeploy the feature branch after secret configuration.
7. Owner real-account E2E: login by Facebook, correct name/provider, reload session, logout, login again, mobile/PC, same-origin redirects, Google unaffected, no 404 and no Production writes.

## Acceptance
Code and simulated tests are NOT equivalent to real Meta login. Do not claim Facebook login fully works until Meta app config + real account + Preview database migration are verified. PR #150 stays Draft.
