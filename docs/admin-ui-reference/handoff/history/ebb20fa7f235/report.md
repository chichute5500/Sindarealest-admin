# ADMIN Playwright evidence

- Tested source commit: `ebb20fa7f2359b19ae91a9c62b3006a16b8db148`
- GitHub Actions run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39592097224
- Captured at (UTC): 2026-10-21T11:30:24Z
- Project checks: `success`
- Automated tests: `success`
- Local source screenshots: `success`
- Deployed Preview check: `failure`
- Full screenshot/metadata artifact: `admin-preview-evidence-144` (raw PNGs are not committed to Git).
- Route: `/admin/`
- Local screenshots only exercise the real source HTML/CSS with a mocked unauthenticated session response; they do not write or read business data.
- Screenshots are captured in light and dark themes for 320x640, 360x800, 375x812, 390x844, 412x915, 768x1024, 1280x800 and 1440x900.
- If preview-diagnostics.json reports Cloudflare Access, the deployed app itself was not reached and its authenticated modules remain untested.
- Cloudflare production deployment: `NOT PERFORMED`.
