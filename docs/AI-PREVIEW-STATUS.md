# SinDarealest AI image-search Preview

This branch is for isolated Preview validation only. It must not be merged into the configured Production branch until the outstanding checks below pass.

## Cloudflare Preview resources

- Pages project: `sindarealest2`
- Branch: `preview/ai-runtime-hardening-2026-10-15`
- D1 Preview: `sindarealest-ai-preview-db`
- R2 Preview: `sindarealest-images-preview`
- Bindings for Preview only: `DB`, `IMAGES`, `AI`
- AI review schema is present in Preview: `image_ai_reviews` includes `source_url`, `source_image_url`, and `reference_image_ref`.
- `ai_request_limits` is present in Preview.
- Product table is initially empty; no production rows or seed data were copied.
- Cloudflare dashboard checks were inconsistent: one inspection reported six successful Preview deployments under a similar branch label, while another could not find the exact full branch ref. The exact latest deployment URL, deployed commit, and live runtime health remain unverified.

## Remaining before end-to-end validation

1. Resolve the conflicting Cloudflare deployment-list observations; verify the exact Preview URL and that the deployed build serves this branch/commit.
2. Add a non-production admin password and session secret for Preview, without reusing or exposing Production secrets.
3. Verify Workers AI account license/acceptable-use prerequisites before making a model call.
4. Confirm ElimAPI account plan supports image search and set a Preview-only API key. Keep image search disabled until these conditions are verified.
5. Add a clearly identified synthetic test product and verify SKU selection, image analysis/search, private candidate storage, and explicit human approval.
6. Never apply migrations or copy product/order data to Production as part of Preview testing.

## Migration guard

`scripts/apply-ai-image-migrations.mjs` requires an explicit D1 name and `CLOUDFLARE_D1_TARGET`. Production requires an explicit opt-in and an exact database-name confirmation. The setup wizard now requests a separate exact Production database-name confirmation before enabling the guarded migration command. This setup script has not been run against Production.

## Latest code validation

- Commit `05790e52a63264e6cb22d610dc83b1ee18e80159`: CI run #727 passed `npm run check` and `npm test`.
- A regression test now also checks the setup wizard's explicit target and database-confirmation wiring.
- Code-level CI success does not prove Cloudflare/ElimAPI end-to-end readiness.
