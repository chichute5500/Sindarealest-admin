# SINDAREALEST — HERO CODE-ONLY OWNER PASS (2026-10-26)

## Owner approval
- **Status: PASS — OWNER-APPROVED UI**.
- Explicit approval received in ChatGPT on **2026-10-26**: "pass".
- Scope: static storefront HERO in **desktop/mobile × light/dark**.
- Branch: `fix/liquid-glass-audit-2026-10-19`.
- Approved implementation SHA: `9f7adc5e42f89cc37b4dc684af3cc8b3567e5bbd`.
- Approved scope covers the currently deployed **code-only Liquid Glass HERO**, not any previous shoe/photo HERO.
- **Do not redesign/rebuild/re-tune this approved HERO without a new user request.** Future work should preserve its look and interaction.

## Locked design and implementation
- Hero HTML in `public/index.html`, using `#home.sd-code-hero` and `.sdh-*` components.
- Styles in `public/code-hero.css` with light and `html.dark` variants; avoid old `#home.hero` and `.hero-visual` selectors.
- Real HTML text: “Phong cách / Đẳng cấp / từ da cá sấu” with correctly rendered Vietnamese, real anchor “Khám phá ngay” to `#products`.
- Site fonts: **SD Serif (Noto Serif)** and **SD Sans (Noto Sans)**.
- HERO contains no rendered mockup image, product picture, raster background, or hidden click overlay.
- Approximate frame constraints: desktop 420px height; mobile `clamp(236px,66vw,270px)`, **not fullscreen or long vertical mobile hero**.
- Keep all surrounding approved layout, header/navigation, services, catalog, cart, Admin and other features unchanged.
- No production or `main` merge was requested.

## Verification at approval
- Commit `9f7adc5e42f89cc37b4dc684af3cc8b3567e5bbd`: source tests **PASS**, Preview deployment **PASS**.
- Browser HERO audit: **14/14 technical viewport/theme contracts PASS** after a retry caused by transient Preview HTTP 500.
- Fullscreen gallery, fly-to-cart, and scroll-reveal Preview audits also passed on retry.
- Browser QA screenshots: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40267648699
- Preview: https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
- Important: passing automated layout/contracts is **not** an independently measured >95% pixel similarity to the AI render. No such measured percentage was established. This record captures explicit **owner visual approval**, not a fabricated pixel score.

## Handoff rule
Treat these four HERO presentations (desktop/light, desktop/dark, mobile/light, mobile/dark) as **owner PASS**, and avoid unnecessary repeats. Preserve the source SHA above as the approved design reference. Any further visual change needs explicit new owner instruction.
