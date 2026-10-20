# Unblock read-only Cloudflare Pages Preview capture

Purpose: allow GitHub Actions to read and screenshot the **Preview hostname only** so the live Playwright capture can verify layout and product routes. This is not a request to deploy, merge, or change Production.

## 1. Create a dedicated Cloudflare Access service token

1. Open Cloudflare Zero Trust.
2. Go to **Access controls → Service credentials → Service Tokens**.
3. Create a token named `Sindarealest2 Preview Playwright`.
4. Copy both the Client ID and Client Secret when Cloudflare shows them. Cloudflare only displays the client secret once; if it is lost, rotate/create a new token. Do not paste either value into a chat, issue, commit, screenshot, or workflow log.

Official documentation: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/

## 2. Scope Access to the exact Preview alias

The target currently configured in the screenshot workflow is:

`https://3ed49bcc.sindarealest2.pages.dev/`

In **Access controls → Applications**, verify which Access application protects that exact hostname.

- Prefer a dedicated Access application/domain scoped to this Preview hostname, then add a **Service Auth** policy that includes the newly created service token.
- Do not add a broad allow/service-auth policy to an application that also protects `sindarealest2.pages.dev` (Production) or other production hosts.
- Do not weaken or delete existing identity policies. If the hostname is covered by a shared wildcard application and a Preview-only scope cannot be established safely, stop rather than broadening access.
- Keep the service-token use limited to the read-only capture jobs; the capture script validates that the target is a non-production Pages alias and only sends the token headers to that Preview origin.

Cloudflare policy reference: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/

## 3. Save the values as GitHub Actions repository secrets

In https://github.com/chichute5500/Sindarealest-admin:

1. Open **Settings → Secrets and variables → Actions → New repository secret**.
2. Add `CF_ACCESS_CLIENT_ID` with the Cloudflare Client ID.
3. Add `CF_ACCESS_CLIENT_SECRET` with the Cloudflare Client Secret.

Do not add these as plain workflow variables, do not commit them to files, and do not send their values in chat. GitHub's official guide: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

## 4. Run the Preview capture workflow

Open **Actions → Liquid Glass isolated visual preview → Run workflow** and select:

- Branch: `fix/liquid-glass-audit-2026-10-19`
- `confirm_preview_only`: `true`
- `capture_source`: `cloudflare-preview`
- `preview_url`: `https://3ed49bcc.sindarealest2.pages.dev/`

Do not archive a baseline until the deployment behind that alias has been verified to represent the intended pre-change state. If its deployed commit cannot be verified, keep `start-of-work/` marked BLOCKED rather than treating a screenshot of the current state as a historical baseline. Once a genuine baseline exists, run the same workflow for `end-of-work`; it requires full live coverage before archiving, then produces a pixel-diff report for human review.

## 5. Expected acceptance evidence

- Live audit: all required viewport/theme pairs complete; required section screenshots complete; 4 product detail contexts pass direct-open and reload; no blocked Access gate; no unexpected write request.
- Screenshot archive: genuine Preview PNGs only, never reference images or local fixture images.
- End comparison: identical viewport/theme/state file pairs and a generated pixel-diff report.
- Production stays unchanged throughout.
  
## Current status before configuration

Latest live probe: [run 39362960193](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39362960193). It found `accessServiceTokenConfigured=false`, `accessBlocked=true`, and zero real screenshots/routes/viewports. The local fixture audit passed, but it is not a substitute for the live Preview capture. The separate Admin Preview Playwright job also failed to find `#loginView`/`#loginForm` in [run 39368126990](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39368126990); the workflow currently passes only `ADMIN_TEST_URL` and `ADMIN_TEST_PASSWORD`, so this guide does not claim the service-token secrets alone fix that separate job.
