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


## 8. Storefront API payload contract — added 2026-10-21

The public GET /api/products response exposes `fulfillmentType` with exactly one of `in_stock`, `made_to_order`, or `unclassified`. Missing, unknown, or invalid values are treated as `unclassified`; stock is never used to infer the type. The serializer now exposes a conservative default, but the current schema has no `fulfillment_type` column, so existing rows remain unclassified until an approved Admin/backend change adds the field and a human classifies products. Do not bulk-backfill from stock.

The storefront renders an actual QR only when the server returns `status: confirmed`, `priceConfirmationRequired: false`, and `paymentInstructions` with `status: ready`, a trusted same-origin or HTTPS `qrImageUrl`, `qrIncludesAmount: false`, non-empty `bankName`, `accountName`, `accountNumber`, `transferContent`, and a positive safe-integer VND `amount`. The amount is displayed outside the QR.

This is a presentation contract, not a claim that the current API supports payment instructions. Current POST /api/orders creates an order in `pending_confirmation`; no public order-status lookup or QR/receiver configuration exists. The storefront therefore shows “Chờ cửa hàng xác nhận” and does not show an invented QR, ask for money, or claim payment success. Backend/Admin work must design a safe post-confirmation delivery path (such as an order-specific access token or other verified customer authorization); never expose order/customer details using order number alone.

The storefront never sets payment_status, never interprets QR display/scan/upload as payment, and does not trust a browser-supplied amount. A server-confirmed QR must have no preset amount; the amount is presented outside the QR for the customer to enter manually.

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
