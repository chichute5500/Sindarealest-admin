> **Current-target correction (2026-10-23):** Any older `3ed49bcc` URL in this guide is stale. The intended stable Preview alias is `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`. Always verify the actual deployment SHA/branch with the read-only verifier before treating screenshots as current evidence. This guide never authorizes Production or Access policy changes.\n\n# Unblock and verify read-only Cloudflare Pages Preview capture

Purpose: enable GitHub Actions to read and screenshot the **Preview hostname only**, verify the exact alias maps to a successful Cloudflare Pages Preview deployment, and record its actual deployment commit. This is not permission to deploy, merge, or change Production.

The screenshot workflow now requires both:
1. Cloudflare Access service credentials to pass the protected hostname.
2. A separate Cloudflare API token with **Pages Read** permission to identify the deployment/branch/commit behind that exact alias.

## 1. Create a dedicated Cloudflare Access service token

1. Open Cloudflare Zero Trust.
2. Go to **Access controls → Service credentials → Service Tokens**.
3. Create a token named `Sindarealest2 Preview Playwright`.
4. Copy both its Client ID and Client Secret when Cloudflare shows them. The client secret is only displayed once; if lost, rotate or create another token.

Official documentation: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/

## 2. Scope Access to the exact Preview alias

The current screenshot workflow target is:

`https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`

In **Access controls → Applications**, verify which Access application protects that exact hostname.

- Prefer a dedicated Access application/domain scoped to this Preview hostname, then add a **Service Auth** policy that includes the new service token.
- Do not add a broad allow/service-auth policy to an application that also protects `sindarealest2.pages.dev` (Production) or other production hosts.
- Do not weaken or delete existing identity policies. If the hostname is covered by a shared wildcard application and Preview-only scope cannot be established safely, stop rather than broadening access.
- The Playwright capture script validates a non-production Pages alias, attaches service-token headers only to that exact Preview origin, and blocks writes/external navigation.

Cloudflare policy reference: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/

## 3. Create a separate read-only Cloudflare Pages API token

In Cloudflare Dashboard → **My Profile → API Tokens → Create Token**:

- Choose a custom token with **Account / Cloudflare Pages / Read** (Pages Read) permission only, scoped to the account containing the `sindarealest2` Pages project.
- Do not grant Pages Write, Workers Write, D1, R2, or unrelated permissions.
- Copy the token once. This API token is separate from the Access Service Token above.

The verifier calls only the Cloudflare Pages deployments list endpoint with `env=preview`, finds the exact alias, and requires a successful deployment, Preview environment, branch and commit hash before the archive step can run.

Official API reference: https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/list/

## 4. Save the configuration in GitHub Actions

Open the repository: https://github.com/chichute5500/Sindarealest-admin

Go to **Settings → Secrets and variables → Actions**.

Create this repository **Variable**:
- `CLOUDFLARE_ACCOUNT_ID` = the 32-character Cloudflare account ID containing the Pages project. This is an identifier, not an API credential.

The visual workflow now also has a non-secret fallback to the previously recorded account identifier for read-only deployment diagnostics when the variable is absent. Keep the repository variable configured as the primary, explicit setting; the separate `CLOUDFLARE_PAGES_READ_TOKEN` remains mandatory for API verification.

Create these repository **Secrets**:
- `CLOUDFLARE_PAGES_READ_TOKEN` = the separate account-scoped Pages Read API token.
- `CF_ACCESS_CLIENT_ID` = Access Service Token Client ID.
- `CF_ACCESS_CLIENT_SECRET` = Access Service Token Client Secret.

Do not paste any token/secret value into chat, issues, commits, screenshots or workflow logs. Do not put secrets in plain variables or source files. GitHub documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

## 5. Run the Preview capture workflow

Open **Actions → Liquid Glass isolated visual preview → Run workflow** and choose:

- Branch: `fix/liquid-glass-audit-2026-10-19`
- `confirm_preview_only`: `true`
- `capture_source`: `cloudflare-preview`
- `preview_url`: `https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/`

Choose `start-of-work` only when the deployment commit shown by the verifier is the intended starting checkpoint. The API verifies which revision the alias currently points to; it cannot reconstruct a historical screenshot that was never captured. If the preview already contains the changes and the actual old state cannot be recovered, do not backdate it as the original baseline. Review the verified SHA in the workflow artifact/manifest.

After the baseline checkpoint is established, run the same workflow for `end-of-work`. Before any screenshots are copied into canonical folders, the workflow requires:
- a real, unblocked Cloudflare Preview capture;
- API verification of the exact alias, Preview environment, successful deployment stage, branch and commit SHA;
- 8/8 viewport/theme pairs, complete required section captures, two open-menu captures, four expanded-order captures and four product detail direct-open/reload checks;
- zero hard failures, read-only violations, console/page/HTTP errors or broken image contexts.

The end-of-work workflow then produces a same-name PNG pixel-diff report for human review. Pixel differences are evidence, not an automatic aesthetic pass.

## Current status before configuration — 2026-10-20 04:45 UTC

- Source/test validation: **PASS**, [run 39371075248](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075248), commit `0c5b436c114e094f1ee7ae5a44a4c54b3f79692b`.
- Latest visual audit: [run 39371072049](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049), [artifact 12240964807](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371072049/artifacts/12240964807). The local fixture audit passed with 54 screenshots/235 fixture products/20 responsive cases/93 interaction checks. Its separate live probe was blocked by Cloudflare Access, with zero real screenshots/routes/viewports and `accessServiceTokenConfigured=false`.
- The same artifact contains `deployment-verification.json` with status `BLOCKED_CONFIGURATION` because `CLOUDFLARE_ACCOUNT_ID` is not configured. The verifier also needs `CLOUDFLARE_PAGES_READ_TOKEN` before it can confirm the alias's actual Preview deployment, branch and commit.
- The separate Admin Preview Playwright [run 39371075239](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39371075239) still fails to find `#loginView`/`#loginForm`; it has not authenticated through Cloudflare Access.
- Production remains untouched. If the Access policy cannot be safely scoped to Preview only, stop and do not widen permissions.


## Current status update — 2026-10-20 11:06 UTC

Supersedes the earlier “before configuration” status above:
- Cloudflare Access Service Token is now being sent by the live Playwright workflow. Run [39411977810](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977810) captured 46 real Preview diagnostic screenshots with 8/8 viewport/theme pairs and all seven required sections. Access is no longer the blocker.
- [Source/test validation 39411977732](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39411977732) passed on commit `5f181d994bf0edb7a4e553c64ba97cddf55e31c4` including `npm run check` and `npm test`.
- Cloudflare Pages deployment API still returns `API_AUTHENTICATION_REJECTED` / HTTP 401 even though the secret is supplied. Replace `CLOUDFLARE_PAGES_READ_TOKEN` with a valid account-scoped custom API token granting only Account / Cloudflare Pages / Read, and set `CLOUDFLARE_ACCOUNT_ID` as an explicit repository variable. Do not send token values in chat.
- Four live card navigation checks currently resolve to legacy `/san-pham/sneakers-26-41-a`, rather than the source branch's expected `/sanpham/{category-slug}/{product-key}`. Because the Preview deployment SHA/branch remains unverified, do not modify storefront runtime to accommodate this observation yet.
- Canonical `start-of-work` and `end-of-work` folders remain empty; the latest 46 live images remain diagnostic-only inside the Actions artifact. Do not copy them into canonical folders.
- Production remains untouched; do not merge PR #108.
