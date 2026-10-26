# Hợp đồng tích hợp — QR chuyển khoản và phân loại sản phẩm SinDarealest

**Ngày lập:** 2026-10-21  
**Trạng thái:** Yêu cầu đã được chủ dự án duyệt để nghiên cứu/triển khai trên hai nhánh riêng; đây là hợp đồng tích hợp, không phải bằng chứng tính năng đã được triển khai.  
**Repository:** `chichute5500/Sindarealest-admin`

## 1. Mục tiêu và hàng rào nhánh

Hai phần được phát triển độc lập và phải cùng tuân thủ tài liệu này:

- **Website tĩnh:** `fix/liquid-glass-audit-2026-10-19`, PR #108 — giao diện khách hàng, nhãn/bộ lọc tình trạng sản phẩm và giao diện hướng dẫn chuyển khoản QR.
- **Admin:** `feature/admin-isolated-handoff-2026-10-20`, PR #111 — giao diện quản lý phân loại hàng, xác nhận giá/điều kiện đơn hàng, quản lý tiền đặt cọc/thanh toán và xác nhận giao dịch.
- **Tích hợp/backend:** chỉ thực hiện sau khi kiểm tra code và hợp đồng API hiện hành. Không tự tạo endpoint giả, không giả định hai nhánh có cùng schema, không sao chép/merge/cherry-pick hai nhánh vào nhau chỉ để đồng bộ tài liệu.

Giữ PR #108 và #111 mở. Không sửa `main`, không merge PR, không deploy Production, không chạy migration lên D1 thật và không thay đổi D1/R2/secret/cấu hình Cloudflare thật khi chưa được phê duyệt riêng.

## 2. Cơ sở hiện trạng đã kiểm tra

Trên code của nhánh Admin tại thời điểm kiểm tra, schema `products` có các trường như `sku`, `title`, `price`, `stock`, `published`, `images_json` và `source_price_confirmed`; chưa thấy trường phân loại `Hàng có sẵn/Hàng đặt riêng` trong migration nền tảng đã đọc.

Schema `orders` có `status`, `payment_status`, `subtotal`, `total` và `price_confirmation_required`. `payment_status` hiện giới hạn ở `unpaid`, `pending`, `paid`, `refunded`. Trong các migration được kiểm tra, chưa thấy ledger thanh toán riêng để theo dõi nhiều lần chuyển khoản/đặt cọc, hay các trường chuyên biệt để lưu số tiền đặt cọc và số dư còn lại.

Các route đang thấy gồm `GET /api/products` và `POST /api/orders`; Admin có nhóm route riêng dưới `/api/admin`. Đây **không** phải danh sách API thanh toán đã có. Mỗi nhánh phải đọc lại code ở HEAD mới nhất trước khi sửa vì hai nhánh đang phân kỳ.

## 3. Hợp đồng phân loại sản phẩm

### Giá trị nghiệp vụ

- `in_stock` → nhãn khách hàng: **Hàng có sẵn**.
- `made_to_order` → nhãn khách hàng: **Hàng đặt riêng**.
- `unclassified` → trạng thái nội bộ để rà soát dữ liệu cũ; **không** tự suy diễn thành một trong hai loại ở trên. Admin cần lọc và phân loại thủ công trước khi cam kết tình trạng với khách.

Tên trường API/DB đề xuất thống nhất: `fulfillment_type`. Trước khi triển khai phải kiểm tra quy ước hiện tại và migration thật ở cả hai nhánh; nếu thấy đã có trường tương đương thì tái sử dụng thay vì tạo trường trùng.

### Quy tắc bắt buộc

- Loại sản phẩm và số lượng tồn kho là hai khái niệm khác nhau. Không suy ra `in_stock` chỉ vì `stock > 0`, hoặc suy ra `made_to_order` vì `stock` null/0.
- Sản phẩm cũ chưa xác định phải được đánh dấu `unclassified` hoặc trạng thái rà soát tương đương; không tự phân loại hàng loạt.
- Lưu snapshot loại hàng trong từng dòng đơn hàng khi tạo đơn, nếu kiến trúc cho phép, để thay đổi sản phẩm về sau không làm sai lịch sử đơn.
- Admin cần chỉnh sửa loại hàng và lọc theo cả ba trạng thái; website chỉ hiển thị nhãn đã xác nhận, với sản phẩm chưa phân loại thì không cam kết còn hàng/đặt riêng và hướng dẫn khách liên hệ xác nhận.
- Không thay đổi SKU/ID/tên/giá/ảnh/danh mục hiện có chỉ để bổ sung phân loại.

## 4. Hợp đồng QR chuyển khoản

### Trải nghiệm khách hàng

- Mặc định dùng QR chuyển khoản ngân hàng theo mẫu người dùng cung cấp; có thể tạo QR/ nội dung tham chiếu riêng theo đơn nếu kiểm thử xác nhận ngân hàng chấp nhận. QR chỉ mang thông tin tài khoản và tối đa mã/nội dung chuyển khoản để đối chiếu.
- Có thể giữ QR cố định do chủ dự án cung cấp làm phương án dự phòng sau khi xác minh mã QR, ngân hàng, chủ tài khoản và thông tin nhận tiền. Ảnh QR được cung cấp là tài liệu tham chiếu; chưa coi là đã giải mã/kiểm thử thành công.
- Nếu tổng tiền, giá, tiền đặt cọc hoặc điều kiện đơn chưa được xác nhận, website phải hiển thị trạng thái chờ tư vấn/xác nhận; không yêu cầu khách chuyển tiền trước.
- Theo yêu cầu chủ dự án, **QR tuyệt đối không nhúng hoặc điền sẵn số tiền**. Sau khi giá/đợt thanh toán được xác nhận, website hiển thị số tiền cần chuyển bên ngoài QR; khách tự nhập số tiền trong ứng dụng ngân hàng. Không tạo QR có trường số tiền, kể cả khi số tiền đã xác nhận.
- Không tích hợp cổng thanh toán và không tuyên bố đã thanh toán tự động. QR chỉ khởi tạo hướng dẫn chuyển khoản ngân hàng.

### Luồng thanh toán

1. Khách gửi yêu cầu đặt hàng.
2. Đơn ở trạng thái chờ xác nhận; nhân viên xác nhận giá, tình trạng hàng, thời gian thực hiện/giao hàng và mọi điều kiện liên quan.
3. Chỉ sau khi xác nhận, hệ thống mới trình bày số tiền phải chuyển cho đợt đó và tạo/hiển thị QR tương ứng.
4. Khách tự chuyển khoản ngoài hệ thống.
5. Admin kiểm tra giao dịch thực tế và xác nhận thủ công; lưu người xác nhận, thời điểm, số tiền và mã tham chiếu phù hợp.
6. Trạng thái đơn/thanh toán chỉ cập nhật theo số tiền đã xác minh. Quét/mở/tải QR, ảnh chụp biên lai hoặc lời báo của khách không tự nó chứng minh tiền đã vào tài khoản.

### Dữ liệu và bảo mật

- Thiết kế phải theo dõi riêng ít nhất: tổng tiền đã được xác nhận, số tiền phải thu của từng đợt, số tiền thực nhận đã xác minh và số dư còn lại. Ưu tiên ledger/record giao dịch để hỗ trợ đặt cọc, thanh toán tiếp và kiểm toán; không chỉ ghi đè một cờ `paid`.
- Tách trạng thái “đã tạo QR/đang chờ chuyển khoản” khỏi “đã xác nhận nhận tiền”. Cần xử lý xác nhận lặp, chuyển thiếu/thừa, đơn bị hủy và thanh toán nhiều đợt.
- QR/receiver config phải lấy từ cấu hình được quản lý có kiểm soát. Không đưa secret/API key vào frontend. Chỉ công khai đúng các trường cần để khách chuyển khoản.
- Endpoint/logic tạo QR (nếu cần) chỉ lấy tài khoản nhận và nội dung tham chiếu từ cấu hình/order đã xác thực; loại bỏ trường số tiền khỏi payload QR. Số tiền hiển thị ngoài QR phải được đọc từ dữ liệu đơn đã xác nhận, không tin số tiền do trình duyệt gửi lên.
- Ghi audit log cho hành động xác nhận/thay đổi thanh toán. Không bao giờ tự động đánh dấu `paid` do QR đã được hiển thị.

## 5. Trách nhiệm theo nhánh

### Website tĩnh — PR #108

- Thiết kế nhãn/bộ lọc sản phẩm và vùng thanh toán QR theo đúng phong cách giao diện hiện tại.
- Chỉ dùng dữ liệu/API thực tế. Nếu API chưa sẵn sàng, ghi rõ trạng thái BLOCKED/contract dependency; không giả lập thành công hoặc dựng endpoint giả.
- Hiển thị mã đơn, số tiền và nội dung chuyển khoản chỉ khi server cung cấp thông tin phù hợp; có trạng thái chờ xác nhận và hướng dẫn liên hệ.
- Không đánh dấu đơn đã trả tiền ở frontend.

### Admin — PR #111

- Thêm UI quản lý loại hàng, lọc sản phẩm chưa phân loại và xem trạng thái trong chi tiết đơn.
- Thiết kế phần cấu hình tài khoản/QR và quy trình xác nhận thanh toán thủ công.
- Kiểm tra API/schema hiện hành; đề xuất migration/API cần thiết và bài test. Migration/schema/API dùng chung chỉ được sửa trên nhánh được phép sau khi ghi rõ tác động, bảo vệ tương thích và thêm test; không chạy migration trên D1 Production.
- Ghi nhận phạm vi PR #111 đang rộng hơn Admin thuần; audit/tách scope trước khi nghiệm thu, không merge PR chỉ vì kiểm thử một phần PASS.

### Hợp tác

- Cả hai bên cùng ghi rõ endpoint, request/response, enum, lỗi và test contract trước khi kết nối.
- Contract chỉ được xem là hoàn tất sau khi hai bên đối chiếu API thật và CI/test trên đúng commit.
- Nếu phát hiện cần thay đổi backend hoặc migration để tính năng hoạt động, trình bày rõ file, rủi ro, phương án rollback và test; không thao tác dữ liệu thật.

## 6. Tiêu chí nghiệm thu

- [ ] Phân loại ba trạng thái được lưu bền vững, hiển thị chính xác; không đoán loại cho dữ liệu cũ.
- [ ] Số lượng tồn kho không bị đồng nhất với loại hàng.
- [ ] Đơn chưa xác nhận giá/điều kiện không đưa ra yêu cầu thanh toán.
- [ ] QR chứa đúng tài khoản nhận/nội dung tham chiếu và **không chứa số tiền**; website hiển thị riêng số tiền đã xác nhận để khách tự nhập.
- [ ] Quét/mở QR không chuyển trạng thái thanh toán thành `paid`.
- [ ] Admin xác nhận thủ công có audit, chống cập nhật lặp và theo dõi được đặt cọc/số dư.
- [ ] Kiểm thử các tình huống chuyển thiếu/thừa, nhiều lần chuyển, hủy đơn, QR thiếu/sai cấu hình và sản phẩm chưa phân loại.
- [ ] Website/Admin không làm rò rỉ secret; API kiểm soát dữ liệu có thẩm quyền phía máy chủ.
- [ ] Kiểm thử được gắn với source SHA thực tế; báo cáo PASS/FAIL/BLOCKED/SKIPPED rõ ràng.
- [ ] Không merge, không Production deploy và không thay đổi dữ liệu Cloudflare thật trong đợt này.

## 7. Lưu ý khi tiếp tục

Tài liệu này phê duyệt **phạm vi chức năng và nguyên tắc tích hợp**, không tự động phê duyệt thay đổi Production, migration dữ liệu thật, cấu hình/tài khoản ngân hàng, giao dịch tiền thật hoặc merge PR. Hãy kiểm tra lại branch HEAD/API/migrations ngay trước khi sửa và cập nhật tài liệu bàn giao bằng bằng chứng mới nhất.


## Addendum — user-provided fixed bank receiving QR image

The project owner already has an image of the bank-account receiving QR. Treat it as an asset that the owner will upload through the Admin UI when the feature is ready; do not require the owner to commit the image into source code or upload it into this chat as a prerequisite.

### Admin upload/configuration
- Add an authenticated Admin screen/section such as **Cài đặt thanh toán → QR chuyển khoản** with image upload/replace, preview, active/inactive control, and explicit save/publish action.
- Collect only the public receiving details needed by customers (for example bank display name, account holder, account number, transfer instructions/reference policy) and validate them before activation. Never expose API secrets, storage credentials, or private operational configuration to the storefront.
- Inspect the existing storage bindings/routes first and reuse the appropriate configured image storage. Do not assume a bucket name or create/change Cloudflare resources/secrets. Store the asset and persist a stable asset key/URL through the existing backend pattern; do not embed image bytes/base64 in application source or database rows unless the existing architecture explicitly requires it.
- Validate allowed image MIME type and file size, reject invalid uploads, show a preview, and require an explicit Admin save/activation step. Replacing the QR must not silently activate an unverified image.
- Before activation, the owner/Admin must verify the uploaded image scans correctly and points to the intended receiving account. The QR payload/image must not specify a fixed transaction amount. If the image itself embeds an amount or incorrect account, fail closed and request a correct image rather than modifying pixels or claiming it is safe.
- Keep the existing QR available until a replacement is verified and activated; define a safe empty/unconfigured state.

### Storefront consumption
- Web tĩnh reads only the active, public-safe QR configuration through the agreed backend/API and renders the QR image, bank/account details and transfer instructions. Do not hardcode the image path or copy the image into the static branch.
- Display the confirmed amount separately from the QR. Customer manually enters the amount in their banking app. Do not display a final payment amount until the order price and payment installment/terms have been confirmed.
- The public API must never expose Admin-only controls, secrets, storage credentials or private review metadata. If no active valid QR is configured, show a clear unavailable/contact-consultant state and never show a fabricated placeholder as the real QR.
- Uploading, previewing, activating or scanning the QR does not mark any order as paid. Payment confirmation remains a separately authorized, auditable Admin action after checking the actual bank transaction.

### Acceptance tests
- Authenticated Admin can upload, preview, replace, deactivate and activate an image; unauthorized users cannot mutate configuration.
- Invalid type/oversized file is rejected; failed replacement leaves the last verified active QR intact.
- Public API exposes only active customer-safe fields and the correct asset URL; no secrets/private fields leak.
- Storefront renders the active image and handles missing/inactive/broken image gracefully.
- Test that the QR does not encode a fixed amount, and that displayed order/installment amount comes from the confirmed server-side order state, not from the QR image or client-supplied amount.

## Admin API contract — endpoint shapes and rollout state (2026-10-21)

Implementation files are developed only on `feature/admin-isolated-handoff-2026-10-20`; the static-site branch has not been modified by this work.

| Purpose | Method and path | Contract |
|---|---|---|
| Public QR configuration | `GET /api/payment-settings` | `{ configured, qrImageUrl, bankName, accountNumber, accountName, instructions }`. Returns `configured:false` and empty public values until a verified QR is active. |
| Public QR image | `GET /payment-qr/:key` | Serves only the currently active key. Pending, inactive, replaced or unconfigured keys return 404. |
| Upload bank QR | `POST /api/admin/payment-qr-upload` | Authenticated multipart `file`, PNG/JPEG/WebP, max 5 MiB with signature validation. Stores a pending object using the existing `IMAGES` binding, preserves original pixels and never activates automatically. |
| Read/update QR configuration | `GET/PUT /api/admin/payment-qr` | `PUT` action `save-draft` with bank/account/instructions; `activate` with `verified:true`; or `deactivate`. Activation needs a pending object, valid account details and explicit human confirmation; changes are audited. |
| Create order | `POST /api/orders` | Response adds one-time `orderAccessToken`; D1 stores only its SHA-256 in `orders.public_access_token_hash`. Treat the token as a bearer capability; do not log it. |
| Read payment details | `GET /api/order-payment?orderNumber=…&token=…` | Token must hash-match the order. Amount is exposed only after server-side price and terms confirmation and when a pending payment request exists; otherwise returns `paymentReady:false`. Response disables referrer leakage and search indexing. |
| Create/cancel installment | `POST/PATCH /api/admin/payment-requests` | POST `{ orderId, paymentOption:'deposit'|'balance'|'full' }`—the client must not send `amount`. Server verifies confirmed total against order-item line totals and derives: `made_to_order` deposit = `ceil(total × 30%)`; `in_stock` deposit = fixed 100,000 VND; `balance` = confirmed remaining balance only after a verified receipt; `full` = full confirmed total. Full payment sets `shippingBenefit:'free_shipping'`; deposit/balance use `standard_shipping`. Mixed or `unclassified` order items are blocked for manual consultation. PATCH cancels only a pending request. Unique transfer reference and receiver/QR snapshot are stored. |
| Read ledger/history | `GET /api/admin/payment-requests?orderId=…` | Returns payment requests, verified transactions, received/refunded sums, remaining balance and overpayment summary. |
| Verify bank transaction | `POST /api/admin/payment-transactions` | Authenticated `{ orderId, paymentRequestId?, direction:'received'|'refunded', amount, transactionReference, note? }`. Duplicate bank references conflict; refunds cannot exceed previously verified net receipts. This is the only new API that derives `orders.payment_status` from ledger records. |
| Product fulfillment | Admin product API uses `fulfillmentType`; DB column is `fulfillment_type`. Public catalog supports `GET /api/products?fulfillmentType=in_stock|made_to_order|unclassified`. New order items snapshot the type at checkout. |


### Authoritative amount and shipping rules — implemented server-side, test-required

- The amount is computed from the confirmed order and item snapshots, never accepted as an authoritative browser input.
- A single-type `made_to_order` order may request a deposit of 30% of confirmed total (rounded up to the next whole VND), or full payment.
- A single-type `in_stock` order may request a fixed 100,000 VND deposit, or full payment.
- Only `full` payment is assigned `free_shipping`. Deposit and balance requests remain `standard_shipping`; do not grant free shipping just because a deposit or later balance installment was requested.
- If any order item is `unclassified`, item types are mixed, item line totals do not add up exactly to the server-confirmed total, or the fixed deposit exceeds the total, automated payment request creation fails closed and customer must be consulted manually.
- A full/deposit request cannot be duplicated after a transaction exists. A balance request requires previously verified net receipts and uses the server-calculated remaining balance.
- Migration `0009_fulfillment_and_manual_payments.sql` stores `shipping_benefit` on each request so the selected delivery benefit is auditable and survives backups.

### Rollout state

- Admin source/API/schema work: **IN PROGRESS**. This addendum is not proof that the separate static-site branch already consumes the endpoints.
- Migration `0009_fulfillment_and_manual_payments.sql` is authored and tested only through CI's temporary local D1 workflow. It has not been run against D1 Production.
- Historical products/order items default to `unclassified`. Type is never inferred from stock or legacy labels.
- Uploading a QR only creates a pending asset. A human must scan and confirm the receiving account and ensure no fixed amount is embedded before activation.
- An Admin source-CI PASS does not mean the configured live Preview or real D1/R2 has been verified. Track the Preview diagnostic independently.
- Rollback: keep PR #111 open and do not merge/deploy. Any source rollback requires a reviewed forward commit; do not rewrite history. Never run this migration on Production as part of this task.

## Authoritative owner-managed fulfillment and checkout rules — 2026-10-21

### Ownership and data flow
- Fulfillment type is an owner-managed product field in Admin, persisted as `fulfillment_type` and exposed to the public catalog as `fulfillmentType`: `made_to_order`, `in_stock`, or `unclassified`.
- The owner chooses the type for each product. Footwear may be made-to-order, while specific products can be set in-stock by the owner; these are examples, not category-based rules. Do not infer fulfillment type from category, stock quantity, SKU, old labels, images, or guesses. Unknown/historical products remain `unclassified` until a human sets the type.
- The customer never selects fulfillment type at checkout. The storefront reads it from the product/API and displays only the corresponding payment options. Admin/backend owns product classification and authoritative amounts; storefront owns customer-facing presentation only.

### Exact payment rules
- `made_to_order`: deposit 30% of the server-confirmed product/order value to begin production, OR pay 100% of the value. Full payment qualifies for freeship.
- `in_stock`: fixed deposit 100,000 VND, OR pay 100% of the value. For deposit-only orders, dispatch follows store verification of the deposit and order confirmation. Full payment qualifies for freeship.
- Full-payment freeship applies to BOTH fulfillment types. Deposit-only options do not automatically promise freeship.
- If price, type, or order terms are missing/unconfirmed, allow a consultation/order request but do not invent a price, compute a fake deposit, request money, or expose payment-ready QR instructions.
- The server validates payment option and amount against confirmed order values; the browser must not be trusted for price, fulfillment type, or payable amount. Store the selected installment/payment request and fulfillment type snapshot on the order/order item as appropriate.
- QR configuration is managed by authorized Admin. Only a verified, active QR with no embedded fixed amount may be shown. QR scan, receipt upload, or customer claim never marks payment as verified; an authorized person must verify the actual bank transaction.

### Separation of implementation ownership
- Static website AI: customer-facing UI and API consumption only; never implement Admin screens, schema, migrations, or Admin-only endpoints in the static branch.
- Admin AI: product type field, persistence/API, QR settings, payment ledger/verification, and API contract only; never commit storefront UI code in the Admin branch.
- Both AIs must keep their own branch and tests separate. If an endpoint/field is missing, Admin documents the API contract and static consumes only after verifying the real API. Do not claim integration is verified from documentation alone.


## Cross-branch synchronization addendum — checkout payment reference — 2026-10-21

### Canonical visual reference and branch boundary

- The static website branch `fix/liquid-glass-audit-2026-10-19` contains the owner-approved checkout/payment-flow reference image at [`docs/static-web-reference/checkout-payment-flow-reference.png`](https://github.com/chichute5500/Sindarealest-admin/blob/fix/liquid-glass-audit-2026-10-19/docs/static-web-reference/checkout-payment-flow-reference.png). The recorded Git blob SHA is `c89ff843af1c094def9233d27a148e048b191990`.
- This image is a **customer-facing static storefront checkout/payment design reference only**. It is not an Admin UI reference and must not be copied into the Admin design as if it were an Admin screen. Admin continues to use the 12-screen Admin reference set listed in the Admin Master Prompt.
- The Admin AI may read the static checkout reference to understand the customer journey and expected information hierarchy, but must not commit to, cherry-pick from, merge, or edit the static branch. Do not copy storefront HTML/CSS/assets into Admin.
- Keep changes isolated to `feature/admin-isolated-handoff-2026-10-20`. PR #111 remains open and unmerged; do not deploy Production, run remote migrations, change real D1/R2 data, or alter secrets/bindings.

### Single shared business contract

- Admin is authoritative for owner-managed product fulfillment type, confirmed price/order terms, active verified receiving QR configuration, payment requests, and the ledger of manually verified bank transactions.
- Static website is responsible only for the customer-facing checkout/payment presentation and consumption of the public-safe API. It must never infer fulfillment type or payable amounts, create Admin-only functionality, or treat a QR/receipt/customer claim as payment verification.
- Fulfillment values and wire fields must stay consistent: database `fulfillment_type`; Admin/public API field `fulfillmentType`; enum values `made_to_order`, `in_stock`, `unclassified`. Never infer the value from category, stock count, SKU, image, or legacy labels.
- Payment options remain: `made_to_order` = 30% deposit or 100% full payment; `in_stock` = fixed 100,000 VND deposit or 100% full payment. Full payment qualifies for freeship; deposit/balance alone does not. The server calculates amounts from confirmed order snapshots; browser-supplied amounts are never authoritative.
- QR must not encode a fixed amount. Display the confirmed amount separately for the customer to enter manually. If type, price, order terms, or active verified QR are missing, fail closed: allow consultation/request submission where supported, but do not invent an amount or present payment-ready instructions.
- Keep payment-request state separate from verified receipt state. Only an authorized Admin action after checking the actual bank transaction may record receipt/refund in the ledger and derive payment status.

### API compatibility and conflict prevention

- The endpoint table and schemas in this contract are the shared interface proposal/source of truth for cross-branch coordination, **not proof that each endpoint is implemented, deployed, or reachable in Preview**.
- Before the static branch consumes any endpoint, Admin must verify its current implementation and response shape on the Admin branch, add/update contract tests, and document the exact source commit and CI evidence. Static must not invent fallback endpoints or silently assume fields exist.
- If implementation differs from this document, do not independently make incompatible changes in either branch. Record the mismatch here, choose a backward-compatible resolution, update contract tests and both handoff prompts, then implement each side only on its own branch.
- Any API field/enum/path change must be reviewed for both Admin and static consumers before implementation. Prefer additive, backward-compatible changes; document deprecation/removal separately.
- Do not mark cross-branch integration complete from matching documentation alone. Completion requires evidence from the actual source SHA, passing contract tests, and a verified compatible Preview; Preview is currently not verified by this addendum.

## Admin source hardening verified by tests — 2026-10-21

Source commit `cedebd78b2056ae4d0e6f6982793106b586d99b2` passed [source CI 39565547871](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39565547871). Implemented safeguards (source/test evidence only, not deployment evidence):
- The Admin payment-request endpoint requires all order-item line totals to be present, non-empty, valid non-negative safe integers. Missing prices fail closed; they cannot be coerced into zero.
- Payment-request creation requires the active QR object to exist in the configured `IMAGES` binding; missing binding/object prevents creation.
- Public `GET /api/payment-settings` only exposes the QR URL/account details when the active QR object is present; otherwise it returns `configured: false` and suppresses those fields.
- Token-scoped `GET /api/order-payment` sets `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer`; pending installments take precedence over historical settled/cancelled requests.
- Regression coverage verifies those conditions. The current remote Preview [diagnostic run 39565547828](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39565547828) still FAILS the CSS signature; deployed behavior and cross-branch consumer compatibility remain NOT VERIFIED.
- Keep all static-website changes on the protected website branch only; do not modify or merge that branch from Admin work.



## Source implementation and CI checkpoint — 2026-10-21 15:50 +07:00

Source/test SHA `18704cfae445210c20bbe1eaf0f9328b6c90eb87` passed [source CI 39571867003](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39571867003); the automated regression suite includes fulfillment-type and payment-ledger contract coverage. Read-only source inspection confirms Admin code paths for:
- product fulfillment mapping `fulfillmentType` ↔ `fulfillment_type`, with `in_stock`, `made_to_order` and `unclassified`;
- server-derived payment requests that reject browser-supplied `amount`, require confirmed terms and reconciled line totals, and block mixed/unclassified product types;
- active QR-object existence checks before creating a payment request;
- Admin-only transaction recording with unique transfer-reference validation, audit logging and payment-status calculation from the verified transaction ledger;
- private/no-store/no-referrer order-payment responses, with public freeship reported as applied only when the verified order payment status is paid and the request is full-payment eligible.

**Limits:** this is source and automated-test evidence, not successful authenticated Preview or actual D1/R2 runtime. The owner must scan and verify the real bank QR/receiving account before activation. Migration `0009_fulfillment_and_manual_payments.sql` is source/local-test evidence only; no remote migration or schema read was performed. Static branch API consumption remains NOT VERIFIED. Keep PR #111/#108 open and unmerged.



## Source-level cross-branch contract audit — 2026-10-21 15:52 +07:00

**Review type:** read-only GitHub source comparison; no static branch file was written.

- Protected static consumer file: `public/index.html` at static branch ref `fix/liquid-glass-audit-2026-10-19`, blob `e54110861e273fd7509efb1e3fea06bc658ff48c`.
- Admin order API: `functions/api/orders.js`, blob `7a9a8a77211efb6eb269814c5f9bdcdd89f140b9`. Static checkout sends `items: [{id, quantity}]`; Admin route reads those fields and derives product price/fulfillment on the server, snapshots `fulfillment_type` into order items, and returns `orderNumber`, `orderAccessToken`, `priceConfirmationRequired`, and a pending-confirmation status.
- Admin product API: `functions/api/products.js`, blob `416e2802c439829e79a74c3a9c10025fb5a1facb`. Its `fulfillmentType` query and product field use the same three enum values that the static page consumes. Static page maps unknown/missing values to `unclassified`/“Cần xác nhận”, not from stock count. **Source-shape compatibility for fulfillment enum and order-create payload: PASS (source-only).**
- Admin read-payment API: `functions/api/order-payment.js`, blob `0281ead2d5070c1419b8952b01f8f7fc3b92d5d8`. Its top-level `paymentReady`, `paymentTermsConfirmed`, `priceConfirmationRequired`, `amount`, `qrImageUrl`, bank/account fields and `transferReference` are consumed by the static `refreshOrderPayment()`, which adapts them into the existing nested `paymentInstructions` shape and checks payment terms before showing a ready QR. This is source shape only; there was no deployed cross-branch/API test.
- **Confirmed source-consumer gap — FAIL:** Admin response includes `freeShippingEligible` and `freeShipping`, where `freeShipping` becomes true only when the ledger-derived order status is paid and the request is full-payment eligible. The static wrapper at `public/index.html` around `refreshOrderPayment()` currently does not copy either field into its mapped client state, and the payment renderer does not display the eligible/applied distinction. Therefore the customer-facing UI can omit this payment/shipping status even if the Admin API sends it. This belongs to the static website branch owner/agent to fix on its own branch; ADMIN work must not patch or sync that branch.
- **Required next step:** static-site agent should add a backwards-compatible mapping/display for eligibility vs actually applied freeship and a consumer contract test, on `fix/liquid-glass-audit-2026-10-19` only. Then test against the documented response fixtures. Do not claim runtime integration complete until a real authorized Preview proves the deployed source and API response shape.
- Evidence boundary: Admin source/test SHA `18704cfae445210c20bbe1eaf0f9328b6c90eb87` passed [source CI 39571867003](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39571867003); Preview [39571867352](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39571867352) still fails CSS signature. No real authenticated backend QA, remote D1/R2 read/write, migration, secrets, Access bypass or Production deployment occurred.
- Overall integration status: **PARTIAL SOURCE COMPATIBILITY; FAIL for missing freeship display mapping; runtime integration NOT VERIFIED.**


## Admin QR settings UX hardening — 2026-10-21

- Source/test SHA `ad426349d765f9352ad9c1bc1460e577a102bb2f` adds an Admin UI guard before QR activation: the visible normalized bank name, account number, account name and instructions must equal the currently saved QR draft. If any field differs, the UI explains that the draft must be saved and returns before sending the activation request. The backend activation contract remains unchanged.
- The Settings QR file picker now uses the Admin-styled button while keeping the actual file input keyboard-focusable, and shows the selected filename. Regression assertions were added to `tests/fulfillment-payment-contract.test.mjs`.
- Source CI [39582088383](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39582088383) passed on the exact source/test SHA. Preview [39582088374](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39582088374) still fails the deployed CSS signature check; no real bank QR was uploaded, scanned or activated as part of this source change. The local fixture screenshots are not backend verification.
- Per the owner's new priority instruction, product image-save and PRE/PRO D1 migration work is **DEFERRED_BY_OWNER**. Remote schema/ledger remain NOT VERIFIED; no remote SQL or D1/R2 operation occurred.


## Latest mobile UX regression pass — 2026-10-21

- Source/test SHA `47a23ded111d2982383460ba7265b778e2bc6d39` shortens the all-category option to “Tất cả” while preserving its value-all behavior, and shortens the warranty policy example to “Ví dụ: Bảo hành đường may”. The exact-source mobile screenshots at 390×844 show both labels fully visible.
- These changes complement the QR activation saved-draft guard and the Admin-styled QR image picker with selected-filename status, recorded in the prior addendum.
- Source CI [39583053755](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39583053755) passed on the exact SHA. Local screenshot artifact [admin-preview-evidence-129](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39583053648/artifacts/12338960648) contains 59 PNGs. Preview [39583053648](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39583053648) remains failed on the configured deployed CSS signature mismatch; the current source contains the required rule, but the served stylesheet does not.
- Product image-save and PRE/PRO migration work stays **DEFERRED_BY_OWNER**. No remote schema check, migration, product-image backend test, R2/D1 operation or Production deploy was performed.


## Live Admin branch/PR audit addendum — 2026-10-21

- Current Admin branch at audit start: `ef42282f7c0d66f827e3d0181bc3f0eaa00dced7`; exact-head Validate CI [39583615335](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39583615335) passed. App source SHA `47a23ded111d2982383460ba7265b778e2bc6d39` remains the source SHA for the latest Preview failure [39583053648](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39583053648). The docs-only commit did not trigger Preview due to workflow path filters.
- PR #111 is open/unmerged against `main`, with 1,088 files changed (+37,133/−390). The diff has a broad mixture of Admin, public storefront, Functions/API, migrations, scripts, tests and a large history/screenshot evidence set. PR #108 is also open/unmerged against `main`. No merge-readiness conclusion is granted; full diff audit is still open.
- Product image-save and PRE/PRO D1 migration work remains deferred by owner. No remote schema inspection or mutation was performed.


## Latest source-only payment/QR and deployment-readiness audit — 2026-10-21 21:28 ICT

This was a read-only source review of the existing payment contract and route code; nothing was executed against remote services.

### Source-contract observations (not live-backend proof)
- `functions/api/admin/payment-qr-upload.js` (`7a133a490488cf0593ae7cf1165acbc0307fcaa5`) uses `requireAdmin`, a 5 MiB upload limit, generates a pending QR image key, returns an authenticated preview URL, and does not activate the image at upload time.
- `functions/api/admin/payment-qr.js` (`6408ef720dc2b2e518ee7b9ef67e935d5581620b`) preserves draft/activate/deactivate states and emits audit-log rows; activation requires a valid pending image key and an explicit Admin action.
- `functions/api/admin/payment-requests.js` (`66620cb07d9c9d96446576bdbab853f8aa218392`) rejects a client-provided amount, requires server-side price/terms confirmation and a valid active QR, derives deposit/full/balance from fulfillment and ledger state, and exposes shipping eligibility separately from applied free shipping.
- `functions/api/admin/payment-transactions.js` (`bd3fae18ea201bf2676ffa7097f14d2049d5449b`) requires Admin auth, validates transaction references and amounts, records only explicitly verified receipts/refunds, prevents over-refunds in the insertion guard, and gates follow-on status/audit updates on a successful ledger insert.
- `functions/api/order-payment.js` (`0281ead2d5070c1419b8952b01f8f7fc3b92d5d8`) scopes public order payment to a token hash, uses private/no-store and referrer-protection headers, withholds payment amount/QR before price and terms are confirmed, and applies free shipping only once the order is fully paid and eligible.
- Tests `tests/fulfillment-payment-contract.test.mjs` and `tests/payment-ledger-route.test.mjs` passed as part of [Run #158](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39615417216) on exact test SHA `45f630e99cfd1dd047c234f0fb42fa197d9bc978`. They use source assertions/mocked D1; they are not remote D1 or authenticated-production proof.
- Existing integration gap for the protected static branch remains: `public/index.html` does not yet map/display both `freeShippingEligible` and `freeShipping` in its adapted state. Do not patch the website branch from the Admin branch.

### Potential deployment-readiness blocker — NOT EXECUTED
- `migrations/0009_fulfillment_and_manual_payments.sql` adds `fulfillment_type`, payment-terms/access-token fields and the `order_payment_requests` / `order_payment_transactions` tables used by payment routes.
- Read-only inspection found that `scripts/setup-cloudflare.mjs` lists migrations 0001 and 0003–0008 (with conditional SKU-column ALTERs) but does not reference migration 0009. `scripts/deploy-cloudflare.mjs` preflights migration 0007's order-contact snapshot and the two 0008 SKU columns, but does not check the 0009 payment fields/tables. `scripts/check-migrations.mjs` validates 0009 against a temporary local D1, which does not prove any remote deployment has applied it.
- This is a source-level mismatch/risk, **not a claim that the remote schema is missing**. No remote D1 schema/ledger read, SQL, migration, setup script, R2 action or deployment was performed. Current owner restrictions remain in force. Do not execute or change migration/setup/deploy behavior without explicit authorization.
- Current Admin branch at audit start was `cf3dd4f75a37806316970041a00f1b3b6a16b1df`; further handoff-only commits can advance the branch. Latest application/test SHA remains `45f630e99cfd1dd047c234f0fb42fa197d9bc978`; no app/API/migration source changes occurred after that tested SHA.


## Latest handoff update — 2026-10-21 (owner request: update handoff files and prompt)

### Current verified state
- Work is restricted to `feature/admin-isolated-handoff-2026-10-20` in `chichute5500/Sindarealest-admin`. Current application/test SHA remains `45f630e99cfd1dd047c234f0fb42fa197d9bc978`; gallery CSS source commit `1fb56f7b5773876c581847bf44abbef1c5c16a67`; regression test commit `45f630e99cfd1dd047c234f0fb42fa197d9bc978`.
- GitHub Actions run [#157](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39615192697) and [#158](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39615417216) were observed as successful on their exact respective SHAs. Checks: `npm run check`, `npm test`, local Playwright responsive/theme screenshot suite and configured Preview diagnostic. This does not mean authenticated backend flows or all 12 reference-screen groups are accepted.
- Latest UI iteration: mobile product gallery gives the first image a full-row cover treatment; CSS contract tests cover mobile fit, narrow-screen fallback, dark theme and accessible reorder control. Artifact #158 includes 59 source/fixture screenshots (16 login shell, 43 synthetic read-only module views) and 36 fixture metrics. This is fixture/screenshot evidence, not authenticated real-data QA.
- **Overall progress remains 48%.** All-12-screen visual parity: NOT ACCEPTED. Authenticated business/backend flows: NOT TESTED. Real product image upload/save: DEFERRED_BY_OWNER / NOT VERIFIED.
- Read-only PR review: PR [#111](https://github.com/chichute5500/Sindarealest-admin/pull/111) OPEN/UNMERGED, base main, mixed scope including admin UI, storefront `public/index.html`, API Functions, migrations and setup/deploy scripts; not merge-ready. PR [#108](https://github.com/chichute5500/Sindarealest-admin/pull/108) remains OPEN/UNMERGED. Re-fetch live PR metadata and file list before making any scope claim; handoff edits alter PR diff statistics.
- Source-only payment review found a possible deployment-readiness mismatch: `scripts/setup-cloudflare.mjs` does not reference migration 0009, and `scripts/deploy-cloudflare.mjs` does not preflight the 0009 payment fields/tables although payment routes use them. This is a **potential blocker, not proof of a missing remote migration**. No remote D1 schema read/write, SQL, migration, setup script, R2 action or deployment was performed.
- QR/payment source routes were inspected read-only; their source-level contracts include admin auth, pending-only QR upload/explicit activation, server-derived payment amounts, confirmed price/terms and token-scoped public payment. Existing tests use source assertions/mocked D1, not live backend proof. A known static-website integration gap remains documented; do not patch the website branch from this admin branch.
- Product image-save and PRE/PRO migration issues remain explicitly deferred by the owner.

### Immediate next work
1. Re-fetch the live branch HEAD, PR #111/#108 metadata and latest Actions; distinguish code SHA from docs-only handoff commits.
2. Continue the 12-screen visual reference audit, prioritizing mobile product gallery, image controls, accessible names/focus/keyboard, reduced-motion and narrow screens. Mark each screen PASS/FAIL/BLOCKED/NOT TESTED with screenshot evidence.
3. Continue read-only semantic PR #111 review. Identify unrelated website/API/migration/setup/deploy scope and concrete security/behavior risks; do not merge, retarget, split or edit other branches without authorization.
4. For every application-source change, run CI against that exact SHA and verify run conclusion before claiming PASS. Update `LATEST-STATUS.md`, `latest-test-results.json`, `PROMPT-COMPLETENESS-AUDIT.md`, `PROMPT-NEXT-CHAT.md`, `START-HERE.md`, `MASTER-PROMPT-AUTO-HANDOFF.md`, `reference-instructions.md`, and the QR/payment contract when relevant.
5. If any owner action is required, ask only for that exact action. Otherwise continue autonomously.

### Safety boundaries — mandatory
- Only work on `feature/admin-isolated-handoff-2026-10-20`; never edit `main` or the static website branch.
- No merge/cherry-pick/force-push; no Production deploy.
- No secrets/Cloudflare Access changes or bypass; no remote D1/R2 operations; do not execute setup/migration scripts; do not use TinyFish.
- Do not resume product image-save or PRE/PRO migration work unless the owner explicitly reauthorizes it.


## Latest verified checkpoint — 2026-10-21 21:45 ICT

- Mobile product gallery footer alignment was fixed in `public/admin/index.html` (source commit `cc77869873c2f5b4b2d1118dc60c0d88413eb218`), with a Playwright geometry regression test (`a2c6bd4b867c0b23ef5d026a1cff99b3c2e8123e`) and CSS contract assertions (`5f73373094ba71f467374e8b026bbfc3c5059fec`).
- Exact tested tree `a999bfdc529ea38c5309ebfbff33a45c6779c10b`: [Validate #3905](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39618556696) and [Preview diagnostics #162](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39618556737) both PASS. Run #162's evidence artifact is `admin-preview-evidence-162` (ID `12354480678`); review `product-gallery__390x844__light.png` and dark counterpart. Footer now reaches the dialog edge; the final gallery image sits above it.
- Still not accepted: all-12-screen visual parity. The approved product-image screen has a horizontal thumbnail rail and richer image-status controls that the current grid/card layout does not yet match. Continue this comparison rather than marking visual completion from passing CSS tests.
- Authenticated backend QA remains NOT TESTED. Real product image upload/save and PRE/PRO migrations remain DEFERRED_BY_OWNER / NOT VERIFIED. QR/payment source audit is source-only; the public static consumer gap remains the static branch's responsibility. Deployment scripts' migration-0009 coverage risk is documented; do not execute setup/deploy/migration scripts or perform remote D1/R2 operations.
- PR #111 remains OPEN/UNMERGED and mixed-scope (1,112 changed paths); PR #108 remains OPEN/UNMERGED (269). Progress remains 48%. Only ADMIN branch; no merge, Production deploy, main/static branch edits, secrets/Access changes/bypass, remote D1/R2 operations, or TinyFish.


## ADMIN UI guard verification — 2026-10-21 16:18 UTC

This section records browser fixture evidence only; it does not alter the normative payment/fulfillment contract or establish live backend acceptance.

- Exact source/test SHA `4e660a0869dd21d4a688d72823bd08b1795cf2ff`: [Validate Source #39633278598](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278598) PASS; [Admin Preview/Playwright #39633278359](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39633278359) SUCCESS.
- QR Settings guard: changed bank fields cannot activate until the draft is saved, even when the manual verification checkbox is checked. The client UI shows a warning before confirmation/API writes.
- Order readiness: an order whose price requires confirmation and whose terms are unconfirmed has QR request and receipt-recording buttons disabled in the UI fixture.
- Backup/restore view: JSON export control, JSON restore file input and confirmation disclosure are present; tests do not invoke either action.
- Tests use explicit synthetic IDs/data and reject all non-GET API requests. Artifact `admin-preview-evidence-192` ID `12360132558` has 63 PNGs and 39 fixture metrics; no attempted writes or unexpected API paths. Authenticated backend QA and live D1/R2 semantics remain NOT VERIFIED.
- Integration acceptance stays OPEN: static consumer still requires separate verification of `freeShippingEligible` vs `freeShipping`, and no changes are made to the protected static website branch from this ADMIN branch.
