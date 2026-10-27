# Six-step order lookup + completed-only warranty — technical checkpoint 27/10/2026

**OWNER PASS / NO PENDING CODE WORK:** code SHA 89657feb0b5bba186ff50b672a3af72687463741 on feat/warranty-short-code-2026-10-27; PR #122 OPEN/DRAFT. Isolated Preview https://order-six-review-1027.sindarealest-admin-preview.pages.dev/ deployed by successful workflow #40451693014 and same SHA, plus successful CI #40451693023 / #40451697405, Admin smoke #40451697430. main f50ec34910bbfc431b01d6603d7973f2b0e426f1 unchanged; no Production deployment.

**Public lookup:** immediately below Đặt hàng an tâm and before Sản phẩm nổi bật; visible outside collapsed order-guide panel. Six stages: (1) Đã gửi đơn, always done at order created_at; (2) Xác nhận đơn at confirmed audit; (3) Đã nhận cọc (full-pay: Đã nhận thanh toán) after verified ledger threshold, excluding auto COD; (4) Đang làm sản phẩm, current during processing, done at shipment; (5) Đã gửi hàng, done at shipped audit; (6) Hoàn thành at completed audit. Dates only when step is done. Uses same-origin POST /api/order-tracking; server returns status and sanitized/masked order numbers only; phone lookup caps at 10 recent orders, 5 requests per 15 minutes per IP. No PII or financial information.

**Just-passed compact UI:** delete the texts “Nhập mã đơn hoặc số điện thoại đã đặt để xem 6 bước xử lý của Shop.” and “Chỉ hiển thị tiến trình đơn, không công khai thông tin cá nhân hoặc thanh toán. Liên hệ Shop nếu cần hỗ trợ.” and their unused styles. Keep compact PC/mobile gap and padding; selectors are scoped .sd-track and sdTrackForm/Results. These texts MUST NOT return.

**Warranty:** new issuance only on first noncompleted -> completed status, not confirmation. Atomic transaction alongside COD where relevant, starts Vietnam completion day. One SDW-XXXX per order item; retry unique collisions; legacy SDW-24 still accepted; 6 months for total under VND 2,000,000, else 12 months. No migration/backfill of already-issued warranties or historical financial data. Admin five-step progress remains separate from public six-step tracking.

**Code:** public/index.html, public/admin/index.html, functions/api/order-tracking.js, functions/api/admin/orders.js, functions/_warranty-policy.js, tests/order-tracking-public.test.mjs, tests/warranty-auto-confirmation.test.mjs.

**Operational:** do not merge PR #122 until explicit Owner instruction; do not treat old PR #118 handoff as current. Read HANDOFF-LATEST-2026-10-27-OWNER-PASS-ORDER-TRACKING-WARRANTY.md and PROMPT-NEXT-CHAT-2026-10-27-ORDER-TRACKING-WARRANTY.md.
