# SinDarealest · Vietnam shared-hosting Zalo relay (optional)

**Status: NOT DEPLOYED; only a reference for the Owner's isolated Preview.** Code cannot solve Social API `-501` until a trusted host with a Vietnam egress IP is connected and tested. Do not use an unknown public proxy.

## Host requirement

A legitimate, owner-controlled, HTTPS-enabled Vietnam PHP 8+ hosting plan supporting outbound HTTPS cURL calls to `graph.zalo.me` and storage of one private file outside the DocumentRoot.

Possible trial: [123HOST Free Hosting](https://123host.vn/hosting-mien-phi.html) (advertises free shared hosting on servers physically located in Vietnam). **Not yet approved or verified**: ask provider if authenticated server-side API use, outbound cURL and encrypted relay of transient OAuth user tokens are permitted. The free tier generally **requires a separately registered domain**, so it may not be entirely free for someone whose website uses only `.pages.dev`. It also requires periodic renewal. No payment, signup, or hostname changes are authorized by this code.

## Install only after hosting eligibility is confirmed

1. Upload the **contents** of this folder into the site's `public_html` directory: `zalo-me.php` and `.htaccess`.
2. **Outside** `public_html`, create `sd_zalo_relay_private/secret.txt`. The expected location is `dirname(public_html)/sd_zalo_relay_private/secret.txt`. Make directory owner-writable and private. Place one unique random secret of **at least 32 characters**, with no quotes or source-code changes. **Do not** paste it into chat, logs, GitHub, or any public folder.
3. Enable HTTPS for the host domain with a valid CA certificate. If Cloudflare manages DNS for this subdomain, set it to **DNS only** for the initial independent outbound IP test as suggested by the hosting provider.
4. Configure the *identical* secret securely in **Cloudflare Pages project `sindarealest-admin-preview` → environment Preview** as `ZALO_VN_RELAY_SECRET`. Add `ZALO_VN_RELAY_URL=https://YOUR_PRIVATE_OWNED_HOSTNAME/v1/zalo/me`. Do **not** edit Production configuration or the live storefront project.
5. Redeploy **only** branch `feat/zalo-customer-login-2026-10-29` via the guarded Preview workflow and test with your own Zalo account; confirm the displayed identity, provider, reload and logout. Do not touch Main before Owner PASS.

Requests are authenticated with HMAC-SHA256 over `timestamp.nonce.raw_body`, a short expiry, an out-of-webroot nonce store and HTTPS. Incoming access tokens are never echoed or logged, and Social API responses are reduced to a bounded `error` or `{error:0,id,name}`. The endpoint is not a general proxy and cannot be used for other URLs.

**Security note:** Free shared hosting is reasonable only for a controlled trial. It has less resource isolation and service assurance than a dedicated private host; check host policy and privacy obligations before sending real customer access tokens. Without confirmed permission, suitable IP classification and actual real-login success, keep Zalo disabled for customers and let Google login continue.
