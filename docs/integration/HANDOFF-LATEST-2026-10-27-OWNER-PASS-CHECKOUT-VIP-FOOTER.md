# SINDAREALEST — CHECKPOINT BÀN GIAO MỚI NHẤT 27/10/2026 — OWNER PASS CHECKOUT, VIP & FOOTER

> **SOURCE OF TRUTH MỚI NHẤT cho chat sau (sau OWNER PASS cuối cùng trên điện thoại).** Tất cả tệp bàn giao trước ngày 27/10 hoặc checkpoint 27/10 có chữ PRODUCT-DETAIL trong tên chỉ còn là lịch sử. Không làm lại phần Owner PASS. Owner đã yêu cầu **cập nhật file + prompt để chuyển chat**, KHÔNG giao nhiệm vụ sửa code mới.

## 1. GitHub và bằng chứng đã xác minh tại thời điểm bàn giao

| Trường | Giá trị xác minh |
|---|---|
| Repository | `chichute5500/Sindarealest-admin` |
| Nhánh duy nhất được phép sửa khi Owner giao việc mới | `integration/storefront-locked-on-main-2026-10-26` |
| **CODE SHA MỚI NHẤT OWNER PASS** | **`72b3bbec1a3ef822e6c20df1a8bd06818e73428a`** |
| GitHub Actions cho code SHA này | [#40429890684](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40429890684) — **SUCCESS, 3/3 jobs, attempt 1** |
| Bằng chứng Chromium UI | [Artifact #12701707039](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40429890684/artifacts/12701707039) (PC 1280/1440, mobile 360/390, light/dark) |
| Bằng chứng remote Preview D1 QA | [Artifact #12701642093](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40429890684/artifacts/12701642093) |
| PR #118 | [OPEN, DRAFT, CHƯA MERGE](https://github.com/chichute5500/Sindarealest-admin/pull/118) |
| Preview riêng biệt | https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/ |
| `main` tại lúc kiểm tra | `31f395a0ac5bdbee94b398ad559414bce607dec0` — chỉ để tham chiếu; **không sửa/merge main** |

**SHA phân biệt:** `72b3...` là checkpoint **code đã chạy QA và Owner PASS**. HEAD sau khi tạo tài liệu này có thể cao hơn chỉ do cập nhật docs; phải fetch HEAD, PR và đối chiếu diff. Không được tuyên bố các commit tài liệu là code cần Owner duyệt lại, cũng không gắn PASS #40429890684 cho code phát sinh sau mốc đó.

### Ba jobs QA cuối đều SUCCESS
1. Kiểm tra repo / dependencies / source + bảo vệ identity Preview D1/R2 và deploy đúng SHA lên Pages branch cách ly.
2. Chromium PC/Mobile sáng/tối: Welcome, HERO, catalog, API read-only, checkout local SQLite disposable, footer có logo trái + hai dòng bên phải, không tràn.
3. E2E đặt hàng/Admin chỉ trên D1 Preview cách ly, test fixture do QA tạo và cleanup. **Không chuyển khoản thật, không tự đánh dấu đã thanh toán.**

## 2. Phạm vi OWNER PASS — KHÓA, không tự làm lại

### A. Trang sản phẩm, danh mục, giỏ và giao diện cơ bản
- Chi tiết sản phẩm: không nhãn danh mục trên tên; title-case từ; giá chỉ `Giá: ...` (không ô), SKU trái/trạng thái phải một hàng; trạng thái Liquid Glass vàng champagne, giữ nguyên **Hàng đặt riêng**.
- Hai nút purchase ngang hàng: **Thêm vào giỏ hàng** Liquid Glass xanh + icon giữ animation thêm giỏ; **Đặt hàng ngay** Liquid Glass cam + icon, thêm vào giỏ hiện có rồi vào checkout (không gửi đơn tự động). Contact, bốn lợi ích và Zalo nằm dưới khối mua. Placeholder phân loại/biến thể vẫn chưa triển khai.
- Catalog: Owner PASS nhóm **Giày thể thao** trước; random bên trong mỗi nhóm và giữ thứ tự ổn định khi phân trang; 4 featured random. Baseline đã nghiệm thu 218 sản phẩm mới/15 danh mục và 235 hàng cũ ẩn, nhưng Preview có thể được bổ sung danh mục/sản phẩm sau đó. **Không coi 218/15 là số lượng tuyệt đối hiện thời; đọc API thực tế và tuyệt đối không tự sửa/xóa/ẩn dữ liệu.**
- Các phần khác đã Owner PASS: HERO, Welcome, hiệu ứng đổi theme, Liquid Glass, gallery/fullscreen, watermark, bay sản phẩm vào giỏ, Admin, bảo hành và bố cục duyệt trước đây.

### B. Checkout mobile-first và thanh toán qua QR — đã xây dựng và nghiệm thu
- Luồng: **Đặt hàng ngay → Form người nhận/địa chỉ → Chọn thanh toán + QR → Kiểm tra và gửi đơn → Shop đối chiếu/xác nhận**. QR hiển thị TRƯỚC khi gửi đơn, không phải đợi Shop tạo QR. Checkout nằm trong drawer Liquid Glass thực của website, nút điều hướng có vùng cố định dưới drawer.
- **Hàng có sẵn**: cọc **100.000đ** hoặc thanh toán hết. **Hàng đặt riêng**: cọc **30% tổng đơn làm tròn LÊN bội số 100.000đ** (ví dụ 1.670.000đ → 1.700.000đ) hoặc thanh toán hết.
- **Thanh toán đủ:** giảm **5% tổng giá trị được xác minh** và **Freeship**. Khối thanh toán hiển thị khoản phải chuyển, giảm giá, **số tiền còn lại thanh toán khi nhận hàng** (0đ khi thanh toán đủ). Server làm lại phép tính ở API đặt đơn và Admin payment request/ledger; không tin số tiền tự gửi từ frontend.
- Đơn trộn nhiều tình trạng hàng, trạng thái chưa phân loại, giá chưa xác nhận hoặc cọc vượt giá: fail-closed/chờ Shop tư vấn, không tự tính sai hoặc tự xác minh thanh toán.
- QR sử dụng file ngân hàng được **Shop kích hoạt** và đã xác minh trong Preview; **QR không nhúng tiền** nên cảnh báo màu **đỏ**, khách nhập số tiền/nội dung chính xác. QR lớn, **vuông 1:1**, hiển thị toàn bộ ảnh gốc KHÔNG crop, nằm riêng trên các ô thông tin (không chia QR thành cột nhỏ). Layout QR đã được Owner trực tiếp PASS.
- Nội dung chuyển khoản: **4 số cuối SĐT + SKU (nếu nhiều sản phẩm có hậu tố số lượng) + 4 chữ Latin ngẫu nhiên**, phân cách bằng dấu `-` theo implementation. Có ô riêng để nhấn sao chép ngân hàng, tên chủ tài khoản, STK, số tiền, nội dung chuyển khoản; nút lưu QR; mở bảng Share của hệ điều hành để chọn app ngân hàng nếu được hỗ trợ (không thể cam kết deep-link mọi app). Dùng chữ **Shop** thay vì Admin trong UI khách thấy.
- Sau nhấn gửi đơn, Shop nhận lựa chọn thanh toán và số tiền tính bởi server, **không tự đánh dấu đã thanh toán**. Shop chỉ xác nhận khi đã đối chiếu thực nhận. Không dùng fixture bank thật; R2/D1 Production tuyệt đối không đụng.
- Mã chính: `functions/_payments.js`, `functions/api/checkout-quote.js`, `functions/api/orders.js`, `functions/api/admin/payment-requests.js`, `functions/api/admin/payment-transactions.js`, `functions/api/admin/orders.js`, `functions/api/order-payment.js`, `public/index.html`, `public/admin/index.html`. Regression: `tests/checkout-preorder-contract.test.mjs`, `tests/payment-ledger-route.test.mjs`, `tests/fulfillment-payment-contract.test.mjs`, `scripts/audit-storefront-checkout-disposable-browser.mjs`.

### C. VIP đỏ, chữ đứng — Owner PASS
- Tên sản phẩm có **từ VIP độc lập** (không tô lẫn `VVIP`, `VIP1`, `SuperVIP`) hiển thị **VIP đỏ, font SD Sans/Noto Sans Bold hiện có của web, chữ ĐỨNG, không nghiêng**, đậm 900, giãn chữ vừa; đỏ đậm theme sáng, đỏ sáng theme tối.
- Chỉ thay **display** trong thẻ sản phẩm, featured, chi tiết, giỏ, yêu thích, form checkout/lịch sử liên quan; **không đổi tên gốc/SKU, dữ liệu, URL, SEO, accessibility**. Helper escape HTML chống injection: `productTitleWithVip` trong `public/index.html`; CSS `#sd-vip-product-title-2026-10-27`; test `tests/storefront-vip-title.test.mjs`.

### D. Footer / section giới thiệu — OWNER PASS CUỐI CÙNG (quan trọng nhất)
- Owner đã phản hồi nhiều lần vì việc dàn sai. **BỐ CỤC PHẢI GIỮ NGUYÊN:** Logo SinDarealest **bên TRÁI, đầu hàng**; **đúng HAI DÒNG thuộc CÙNG MỘT CỘT BÊN PHẢI LOGO**: (1) `PREMIUM CROCODILE LEATHER FASHION` ở trên, (2) `Giá trị nằm trong từng chi tiết.` ở dưới. **Không đưa dòng tiếng Việt xuống một hàng toàn chiều rộng BÊN DƯỚI logo.**
- Trên mobile cả hai dòng **mỗi dòng chỉ một hàng**, font tiếng Anh được làm to, tiếng Việt cỡ vừa, dễ đọc; logo lớn hơn trước nhưng không chiếm hết cột, không có nền/card/viền/bóng riêng. Phần mô tả giới thiệu và kết nối bên dưới giữ nguyên.
- Source: `public/index.html` phần `#siteFooter .footer-story-heading` và CSS `<style id="sd-footer-story-heading-2026-10-27">`; có nhánh responsive `@media(max-width:760px)`, cột logo `clamp(76px,22vw,88px)`, bên phải `.footer-story-heading-copy{display:flex;flex-direction:column}`; English `clamp(11.5px,3.2vw,12.8px)`, Vietnamese `clamp(16px,4.55vw,18.2px)`.
- Audit: `scripts/audit-storefront-main-preview.mjs` đã có regression đo logo bên trái, 2 dòng đều bên phải, vừa một hàng không tràn ở mobile 360/390, theme sáng/tối; **Actions #40429890684 PASS 3/3 tại đúng code SHA**. Owner xem ảnh thực tế rồi nói **PASS**. Tuyệt đối không tự thiết kế lại footer.

## 3. Lịch sử cần phân biệt (không dùng checkpoint cũ thay bản mới)
- Nghiệm thu trước đây cho chi tiết/nút mua: code `5f991ff3339848efc036a30bcc1c7e66fd224cd0`, Actions #40383014004 attempt 2 PASS 3/3. Đã bị thay thế bởi checkpoint này, không phải code HEAD mới.
- QR 1:1 lớn đã PASS: #40422789088, code `d44f475d9924e0363df525604e6846ef2ba45072`.
- Chữ VIP đứng (sau khi Owner yêu cầu bỏ nghiêng): #40424460349 attempt 3 PASS 3/3, code `f4c43239c01d13050256bb5a95b30ff3504062a3`.
- Các thử CSS footer trung gian / bài audit không tương thích từng có FAIL trên các SHA `339b...`, `86e3...`, v.v.; **bản cuối** `72b3...` đã PASS đầy đủ. Không quay lại các thiết kế/ảnh Owner đã bác.

## 4. Quy tắc và việc còn mở
- **KHÔNG CÓ YÊU CẦU SỬA CODE MỚI ĐANG DỞ.** Owner vừa xác nhận PASS footer và yêu cầu bàn giao chat. Chat kế tiếp đọc tài liệu này, xác minh HEAD/PR/Actions rồi sẵn sàng làm đúng yêu cầu tiếp theo; **không chủ động sửa đã PASS, không hỏi lại lịch sử**.
- Nếu có yêu cầu mới, chỉ commit trên `integration/storefront-locked-on-main-2026-10-26` theo scope; kiểm CSS trùng/chồng lớp và tương thích với Liquid Glass nguồn thật; test PC/Mobile, theme sáng/tối, checkout liên quan. Chụp ảnh trình duyệt từ mã nguồn thật, không coi ảnh AI là ảnh render thực; Owner cần nghiệm thu phần mới.
- Có thể chạy các luồng đọc/QA độc lập song song; chỉ ghi một file theo thứ tự để không mất thay đổi. Trên thay đổi source mới, CI đúng SHA; không báo PASS khi Actions chưa xanh.
- **CẤM khi chưa được Owner cho phép rõ ràng:** merge PR #118, deploy Production, chỉnh/xóa dữ liệu sản phẩm/giá/SKU, tự chạy migration/ghi D1/R2 Production, sử dụng thanh toán thật/giả mạo đã thu tiền, mở tính năng biến thể không được yêu cầu.
- `Preview PASS + Owner PASS` **KHÔNG** đồng nghĩa Production đã phát hành. Phải chờ lệnh merge/release riêng.

## 5. Đọc tiếp khi có việc mới
1. [Prompt đi kèm](./PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-CHECKOUT-VIP-FOOTER.md).
2. `public/index.html`; `scripts/audit-storefront-main-preview.mjs`; `.github/workflows/integration-storefront-isolated-preview.yml`.
3. Backend checkout/QR và tests ở §2.B; `tests/storefront-vip-title.test.mjs` nếu sửa tên; phần footer CSS và audit §2.D nếu sửa giới thiệu.
4. Các hồ sơ lịch sử [product detail 27/10](./HANDOFF-LATEST-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md), [QA 26/10](./QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md), [Storefront + Admin 26/10](./STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md) chỉ đọc khi cần đối chiếu. Tình trạng chưa hoàn thành trong đó có thể lỗi thời.

**KẾT LUẬN:** Code `72b3bbec1a3ef822e6c20df1a8bd06818e73428a` **Actions #40429890684 PASS 3/3 và OWNER PASS**. PR #118 còn OPEN/DRAFT; không merge Production. Sau commit cập nhật tài liệu: HEAD sẽ mới hơn do DOCS-ONLY, phải đọc HEAD thực tế.
