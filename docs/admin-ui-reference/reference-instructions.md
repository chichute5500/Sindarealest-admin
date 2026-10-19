# Instructions for AI: use the ADMIN UI reference

## Goal
Redesign the SinDarealest ADMIN interface to align with the approved mobile visual reference while preserving the existing static website and all working backend behavior.

## Required workflow
1. Open `admin-mobile-reference.png` first. The standalone `admin-mobile-reference.html` is an alternate viewer.
2. Inspect the current ADMIN implementation and identify the existing framework, routes, components, styles, API calls, authentication, and D1/R2/Workers integrations before editing.
3. Keep all work on `fix/liquid-glass-audit-2026-10-19`. Do not merge to `main`, deploy to Cloudflare, or alter production resources.
4. Preserve all existing functions and backend contracts. UI changes must not silently remove features, alter data schemas, weaken authentication, or change API semantics.
5. Follow the reference's luxury-minimalist liquid-glass direction and pale ice-blue/pearl palette. Suggested starting colors: background `#eaf3fb`, navy text `#142a3c`, blue accent `#5c91b9`. Treat these as design guidance, not permission to replace brand assets arbitrarily.
6. Prioritize Android/mobile layouts, responsive behavior, Vietnamese diacritics, readable contrast, rounded surfaces, consistent spacing, clear pressed/focus states, and both light/dark modes.
7. Test actual working flows, including login/logout, product CRUD, price visibility, image handling, orders, customers, warranty/support, settings, backup/restore, and logs wherever these features exist. Do not invent missing features or data.
8. Capture real screenshots of the running test ADMIN at matching viewport sizes. Compare them against the reference, fix meaningful differences, and repeat.
9. Run available lint, type-check, build, and automated tests. Report exact commands and results; never mark unrun tests as passing.
10. Keep reference assets separate from production runtime. Do not import the reference HTML or screenshot into the customer-facing website unless explicitly required.

## Completion report
For every task, mark PASS, FAIL, BLOCKED, or NOT TESTED; include evidence, file paths, test results, known limitations, and the exact commit SHA. State clearly that Cloudflare deployment was not performed.
