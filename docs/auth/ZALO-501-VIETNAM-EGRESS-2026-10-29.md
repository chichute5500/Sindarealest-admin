# Zalo Social login -501 from Cloudflare Pages egress

## Evidence and current acceptance

- Owner performed **real Zalo login** on isolated Cloudflare Pages Preview, Zalo authorization and token exchange completed, but `GET https://graph.zalo.me/v2.0/me` returned JSON error **-501**. Google login independently succeeded in the same site.
- Official Zalo public Social API error list does **not** establish a meaning for -501. **Do not claim Zalo formally confirmed an IP restriction.**
- Third-party Odoo Zalo SSO integration (apps.odoo.com/apps/modules/17.0/zalo_sso, 18.0/zalo_sso) reports -501 when calling `graph.zalo.me` from outside Vietnam and uses a Vietnam egress proxy.
- Cloudflare Pages/Workers do not guarantee Vietnam outbound egress, even when the visitor is in Vietnam. Users' VPN or Zalo app settings cannot change the Workers' outbound IP.
- Zalo app activation, domain verification, two callback URLs, and App Secret Proof were configured already. No further edits to those are warranted.
- This is an **environment/network dependency**, not a reason to bypass the requirement for a validated Zalo user ID.

## Auth code completed

- `functions/_zalo-profile.js` normally calls the official Zalo Social /me API with headers `access_token` and `appsecret_proof` (official SDK HMAC-SHA256), never putting either in URL or logs.
- Only when the official API returns exactly **-501**, the code may retry through an Owner-controlled, HTTPS-enabled, Vietnam-hosted relay. This feature is disabled by default and fails closed.
- Relay config requires **both** Cloudflare Pages **Preview secrets/variables**:
  - `ZALO_VN_RELAY_URL`: full private owned HTTPS URL ending in `/v1/zalo/me`.
  - `ZALO_VN_RELAY_SECRET`: random shared secret >=32 characters stored as encrypted secret. Never paste in chat, PR or GitHub.
- No proxy URL or secret is currently supplied, configured, or deployed. Therefore, installing the code **does not by itself resolve the real -501**.

## Optional Owner-hosted Vietnam relay

- Source: `relay/zalo-vn-profile-server.mjs`. Run on a trusted persistent Linux host/VPS whose outbound IP is actually classified as Vietnam **by Zalo**. There is no requirement for a special Zalo SDK, only Node.js 22+.
- Configure env `SD_ZALO_RELAY_HMAC_SECRET` with the exact same high-entropy value as Cloudflare `ZALO_VN_RELAY_SECRET`; create via trusted secret management, never commit.
- Start the process under systemd or another supervised process manager. It binds **127.0.0.1:8765 only**, not a public port.
- Terminate TLS using a domain owned by the Owner (e.g. Caddy/NGINX) and forward **only** `https://<owner-domain>/v1/zalo/me` to localhost port 8765. Configure firewall to deny direct public access to 8765; TLS cert must validate.
- Both Cloudflare and relay authenticate each request with HMAC-SHA256 over timestamp, unique nonce, and JSON body. Relay rejects expired signatures, replayed nonces, wrong path, oversized bodies or malformed tokens. It returns only `{error,id,name}`; no arbitrary open proxy, and it does not log access tokens, IDs or names.
- Proxy contains users' **temporary Zalo access tokens** in HTTPS request bodies. Never use unknown free proxies or third-party relay services without the Owner's consent and security evaluation.
- Test egress using the operator's own host with Zalo technical support's official advice. An IP located geographically in Vietnam does not guarantee Zalo will accept it.
- Re-run real Zalo sign-in on Preview after connecting the trusted relay. Verify profile, provider label, page reload, logout, repeated sign-in, and that production D1/Google auth remain untouched. Then Owner PASS separately.

## Safer no-infrastructure option

Use the already-working Google login while contacting Zalo Developer Support at https://developers.zalo.me/community to confirm -501 semantics and request guidance or a supported way to allow Cloudflare outbound IPs.

## Release gates

1. Do not auto-create provider subject or infer it from query/permission page; it must come from the authenticated Zalo profile response.
2. Do not accept raw profile body, access tokens, proof or App Secret in browser, logs or client-visible URL.
3. Do not deploy VN relay to CF Workers (no VN egress guarantee).
4. Keep PR #150 **Draft**, code deployed only to Cloudflare Pages Preview environment of `sindarealest-admin-preview`.
5. No Production merge until real Zalo sign-in + verified account + reload/logout passes.
