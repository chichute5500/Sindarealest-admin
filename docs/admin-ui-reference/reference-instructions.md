# Instructions for AI: use the ADMIN UI reference

## Goal
Redesign and audit the SinDarealest ADMIN interface to align with the approved mobile visual reference while preserving existing business logic, API contracts, authentication and backend behavior. The public/static website is being developed by a separate AI and must not be overwritten.

## Repository and branch isolation — mandatory
- Repository: `chichute5500/Sindarealest-admin`.
- Protected static website branch: `fix/liquid-glass-audit-2026-10-19`.
- ADMIN work branch: `feature/admin-isolated-handoff-2026-10-20`.
- Before any edit, verify the current branch, HEAD SHA, `git status`, remote and uncommitted changes. Edit/commit only on the ADMIN branch.
- The ADMIN branch was created from the static branch at the time of separation. This is a starting point only; it is not permission to edit static-site files.
- Do not commit to the static branch or `main`; do not force-push, auto-merge, cherry-pick or deploy.
- Do not automatically sync new static-site commits into the ADMIN branch. Compare SHAs/diffs and request explicit direction before syncing.
- If the current branch is wrong or uncommitted changes could be overwritten, stop risky Git operations and report the blocker. Never reset, stash, revert or discard someone else's work blindly.

## Protected scope
- Work on ADMIN routes/components/styles and ADMIN-specific tests.
- Do not redesign or change the public storefront, homepage, public product cards/detail, cart/checkout, public navbar/footer, Liquid Glass background/effects, public theme system, typography or public responsive layout.
- If a file is shared between ADMIN and the public site, document the dependency and impact before changing it. Prefer an ADMIN-only adapter/component. If safe isolation is not possible, mark the task BLOCKED and continue independent work.
- Shared API/auth/D1/R2/Workers code may be changed only when necessary, after recording rationale, expected impact, test plan and rollback approach. Do not change schema, secrets, bindings, production data or Cloudflare configuration without separate explicit authorization.

## Required workflow
1. Open `admin-mobile-reference.png` first. The standalone `admin-mobile-reference.html` is an alternate viewer.
2. Inspect the current ADMIN implementation and identify framework, routes, components, styles, API calls, authentication, and D1/R2/Workers integrations before editing.
3. Preserve all existing functions and backend contracts. UI changes must not silently remove features, alter schemas, weaken authentication, or change API semantics.
4. Follow the reference's luxury-minimalist liquid-glass direction and pale ice-blue/pearl palette. Suggested starting colors: background `#eaf3fb`, navy text `#142a3c`, blue accent `#5c91b9`. Treat these as design guidance, not permission to replace brand assets arbitrarily.
5. Prioritize Android/mobile layouts, responsive behavior, Vietnamese diacritics, readable contrast, rounded surfaces, consistent spacing, clear pressed/focus states, and both light/dark modes.
6. Test actual working flows, including login/logout, product CRUD, price visibility, image handling, orders, customers, warranty/support, settings, backup/restore, and logs wherever these features exist. Do not invent missing features or data.
7. Capture real screenshots of the running test ADMIN at matching viewport sizes. Compare them against the reference, fix meaningful differences, and repeat.
8. Run available lint, type-check, build, and automated tests. Report exact commands and results; never mark unrun tests as passing.
9. After every complete edit-test-screenshot-comparison iteration, update status, JSON results and history on the ADMIN branch, then verify the commit.
10. Before final report, inspect the full diff and ensure no accidental public-site or unrelated changes are included.

## Completion report
For every task, mark PASS, FAIL, BLOCKED, or NOT TESTED; include evidence, file paths, test results, known limitations, and exact commit SHA. Clearly state that no merge to the static website branch/main and no Cloudflare production deployment occurred.
