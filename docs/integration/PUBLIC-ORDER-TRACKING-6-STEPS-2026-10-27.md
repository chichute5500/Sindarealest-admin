# SINDAREALEST — Six-step public tracking and warranty activation on completion

Date: 2026-10-27. Branch: `feat/warranty-short-code-2026-10-27`. PR #122 remains DRAFT for Owner acceptance.

## Customer-facing six stages

1. **Đã gửi đơn** — created_at, automatically complete as soon as the customer places an order
2. **Xác nhận đơn** — order update audit event `confirmed`
3. **Đã nhận cọc** (or Đã nhận thanh toán for full-pay orders) — first bank ledger receipt crossing the checkout requested amount, excluding COD auto-collection
4. **Đang làm sản phẩm** — current during processing; only considered finished with the shipping milestone
5. **Đã gửi hàng** — shipped event
6. **Hoàn thành** — completed event

Dates display only on fully recorded stages. Customer sees only progress and a code (masked to last 4 for phone lookups), not customer name, addresses, amounts, transfer references, SKUs or admin actions. Public lookup is capped at 5 attempts / 15 min / IP and requests must be same-origin. The tracking API requires Cloudflare D1.

## Warranty activation correction

All **new** automatic warranties are issued on `shipped → completed`, in the same atomic order transition (with COD balance recognition where applicable), not on `pending_confirmation → confirmed`. Start date is the local Vietnam date when Shop completes. Terms remain 6 months under VND 2M and 12 months from VND 2M, with collision-resilient `SDW-XXXX` codes. Completed items with pre-existing warranty records are never overwritten or reissued. Existing previously issued warranties are intentionally not batch-mutated in production by this feature; any historical correction must be separately authorized.

Admin progress confirmation copy now says prices and conditions, and completion copy says warranty activation. The Admin remains five steps, as Owner approved; only public tracking has six.

## Delivery scope and QA

The public tracking card is below the **Đặt hàng an tâm** section, outside its collapsible details. New scoped `sd-track` CSS lives in the existing Storefront style, with a responsive input and six-stage timeline. `tests/order-tracking-public.test.mjs` simulates the production schema in disposable SQLite and checks stage dates, phone/masked code search, privacy, rate limit and validation. The automatic warranty regression suite now checks no issuance before completion, atomic per-item issue at completion and anti-duplicate retries.

No changes to production or main without Owner PASS and an explicit merge request.
