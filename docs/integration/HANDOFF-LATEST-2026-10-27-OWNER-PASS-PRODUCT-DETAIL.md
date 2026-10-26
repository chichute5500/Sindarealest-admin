# SINDAREALEST — CHECKPOINT MỚI NHẤT 27/10/2026 — OWNER PASS PRODUCT DETAIL + CHECKOUT CTA

> **SOURCE OF TRUTH — ưu tiên tài liệu này trước tất cả checkpoint 26/10/2026.** Người dùng đã trực tiếp trả lời **“Pass”** sau khi xem bản chi tiết sản phẩm với hai nút kính lỏng XANH/CAM và các chỉnh sửa giao diện. Ghi nhận nghiệm thu, không làm lại. Đây là **Owner PASS Preview UX**, **không phải quyền merge/deploy Production**.

## 1. Trạng thái GitHub đã xác minh khi bàn giao

| Mục | Giá trị |
|---|---|
| Repository | `chichute5500/Sindarealest-admin` |
| Nhánh DUY NHẤT được tiếp tục sửa khi Owner yêu cầu | `integration/storefront-locked-on-main-2026-10-26` |
| PR | [#118](https://github.com/chichute5500/Sindarealest-admin/pull/118) — OPEN, DRAFT, NOT MERGED |
| **Commit ứng dụng đã Owner PASS** | `5f991ff3339848efc036a30bcc1c7e66fd224cd0` |
| **Isolated Preview QA** | [Actions #40383014004](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40383014004), **attempt 2 — SUCCESS 3/3 jobs** |
| Preview URL | https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/ |
| Production/main | **KHÔNG MERGE, KHÔNG TRIỂN KHAI, KHÔNG GHI D1/R2 Production** trong đợt sửa này |

**Cực kỳ quan trọng:** Đọc HEAD/PR/Actions mới ở chat tiếp theo. Sau khi tạo tài liệu này, HEAD có thêm **documentation-only commit** so với source app SHA `5f991ff3339848efc036a30bcc1c7e66fd224cd0`. Không lầm HEAD tài liệu là code mới chưa kiểm thử. Không force-push, rebase hoặc chạm main. Lượt Action #40383014004 attempt 1 đã FAIL tại một bài đo thời điểm đổi theme do trễ ngẫu nhiên trên Chromium tải nặng; **attempt 2 đã PASS đúng cùng code SHA và không sửa theme**. Chỉ dùng kết quả attempt 2 để ghi nhận PASS.

## 2. Các phần Owner vừa duyệt — ĐÃ KHÓA, KHÔNG TỰ THIẾT KẾ LẠI

### Giao diện chi tiết sản phẩm (PC + điện thoại, theme sáng/tối)

1. **Bỏ nhãn danh mục** phía trên tiêu đề sản phẩm trong modal chi tiết (không xóa danh mục của catalog hoặc D1).
2. **Tên sản phẩm in đậm, viết hoa chữ cái đầu mỗi từ**, giữ cách viết có sẵn trong các từ sau, ví dụ `mũ vip gù 6 đinh da cá sấu` -> hiển thị `Mũ Vip Gù 6 Đinh Da Cá Sấu`; chữ `VIP` gốc vẫn không bị xóa. Danh mục phân loại ở bộ lọc/thẻ sản phẩm cũng được title-case: `Giày Tây`, `Giày Lười`, `Ví Cầm Tay`. Chỉ chỉnh display, **không sửa title/category Admin/D1**.
3. **Giá dạng chữ trực tiếp**, ví dụ `Giá: 4.500.000đ`; không viền, không khung, không nền, không label giả lặp lại. Chỉ hiện giá hợp lệ/đã xác nhận theo công tắc hiển thị giá mà Owner đã tự bật; **không thay giá, không ép hiển thị giá chưa xác thực**.
4. **SKU trái – trạng thái phải, cùng một hàng**. SKU là chữ thường; trạng thái nằm trong **Liquid Glass bo viên thuốc** màu **vàng champagne nhẹ** thay cho xanh. Trạng thái **chỉ có nội dung**, không có chữ `Tình trạng:`: `Có sẵn`, `Hàng đặt riêng`, hoặc `Cần xác nhận` nếu dữ liệu chưa xác minh. Đặc biệt KHÔNG rút gọn `Hàng đặt riêng` thành `Hàng đặt`.
5. **Hai nút mua hàng song song cùng kích thước/ngôn ngữ thiết kế** (kể cả điện thoại hẹp), cùng công thức viền/bóng/kính lỏng/icon:
   - **Trái XANH:** icon túi + `Thêm vào giỏ hàng`, giữ chức năng thêm giỏ hiện có (animation bay ô sản phẩm đã Owner PASS).
   - **Phải CAM:** icon tia chớp + `Đặt hàng ngay`, cùng glass, cùng opacity, bóng, viền, hiệu ứng nhấn, **chỉ khác màu**. Khi nhấn: `addToCart(productId)`, đóng modal chi tiết, mở `openCheckout()` trực tiếp; KHÔNG tự gửi đơn, KHÔNG giao dịch/thanh toán ngân hàng. **Giỏ hiện có vẫn được giữ**, sản phẩm vừa chọn được thêm vào giỏ rồi hiện form đặt hàng. Không tạo luồng thanh toán mới.
6. **Dời phần liên hệ/mô tả, 4 ô lợi ích và nút Zalo** xuống **cuối khu vực chi tiết**, nằm SAU các nút mua hàng và link quy trình. Vùng trống phía trên dành cho **phân loại/biến thể sản phẩm sau này**; hiện chỉ có `#detailVariants[hidden]` là placeholder, **chưa làm tính năng chọn biến thể**; đừng tự mở hoặc phát triển nếu chưa có yêu cầu.
7. Giữ nguyên gallery, thumbnail, fullscreen, watermark, favorite, copy/link route, phần giao diện sáng/tối, welcome, HERO và tất cả UI đã Owner PASS trước đó.

### Catalog và danh mục đã hoàn tất trước đó — không làm lại

- Isolated Preview đang hiển thị **218 sản phẩm mới / 15 danh mục**, **235 sản phẩm cũ ẩn**; dữ liệu Preview khác Production. Lượt chuyển Preview-only đã PASS: [#40362020765](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40362020765). Không chạy lại script chuyển published/hidden, không xóa bản ghi.
- `Sản phẩm nổi bật`: **4 sản phẩm thật**, chọn ngẫu nhiên mỗi lần tải trang, ưu tiên 4 danh mục khác nhau khi có đủ. Không còn chỉ 3 ô.
- `Tất cả sản phẩm`: lần lượt **hiển thị hết nhóm Giày thể thao trước**, sau mới đến nhóm tiếp theo; **random thứ tự sản phẩm trong mỗi nhóm một lần mỗi lần tải trang**, phân trang/tìm kiếm không làm sản phẩm nhảy vị trí. Không xen kẽ 1 sản phẩm của mỗi danh mục.
- Bộ lọc danh mục tự lấy từ API, có tên hiển thị viết hoa đầu từ, không hard-code thiếu nhóm mới.
- Giá hiển thị do Owner đã bật thiết lập trong Admin. Bảo toàn `show_prices`, `sourcePriceConfirmed`/gate và giá thực. Không đổi trạng thái đơn/kho/sản phẩm chỉ để làm đẹp UI.

## 3. Mã nguồn, kiểm thử và bằng chứng

**Mã ứng dụng checkpoint Owner PASS:** `5f991ff3339848efc036a30bcc1c7e66fd224cd0`.

Các file đổi trong lượt giao diện mới:
- `public/index.html`: bố cục chi tiết; status vàng champagne; hai nút purchase glass màu xanh/cam + SVG; event nút `#detailBuyNow` -> add product + checkout, giữ `#detailAdd`; contact/4 benefits/Zalo dưới cùng.
- `tests/dynamic-product-categories.test.mjs`: regression về tên/danh mục, trạng thái nguyên văn, hai nút, CSS palette đồng nhất, thứ tự nội dung, callback checkout.
- `scripts/audit-storefront-main-preview.mjs`: kiểm thử Chromium với sản phẩm thật (GET) mở modal, kiểm DOM + CSS, click nút cam mở form checkout, **chặn remote POST**. Thêm kiểm thử theme/hành trình khác vốn đã có, không được xóa.

**Actions #40383014004, run_attempt=2: 3/3 SUCCESS**, kiểm thử:
1. Validate source, kiểm tra ranh giới Preview D1/R2 với Production, build và deploy đúng branch/SHA: **SUCCESS**.
2. Remote isolated Preview D1 checkout + Admin QA fixture, cleanup: **SUCCESS**.
3. Chromium PC/Mobile × Light/Dark, Welcome/HERO/catalog, click thử `Đặt hàng ngay` tới checkout, CSS và theme: **SUCCESS**.

Link: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40383014004. Không tuyên bố chuyển khoản hay thanh toán online thực đã được thực hiện. Không thay đổi Production.

Các mốc trước đó:
- Đã khắc phục và thử liên kết sản phẩm mở chi tiết, watermark, ảnh R2, 4 featured, random theo nhóm, giá public đã xác nhận; CI trước đó PASS.
- Mốc trạng thái `Hàng đặt riêng` restored: source trước `c5e584595733436674193081cd3b1237065bf64d`, [Actions #40380734789](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40380734789) SUCCESS 3/3.
- Theme mobile đã được Owner PASS riêng. Không lấy một lần flaky test để tự nới ngưỡng/tự thiết kế lại theme.

## 4. Việc còn mở / giới hạn

- **KHÔNG CÓ TASK SỬA UI MỚI ĐANG DỞ từ yêu cầu này.** Owner PASS và đã đề nghị **bàn giao chat mới**. Chat mới phải **chờ yêu cầu tiếp theo** hoặc chỉ xác minh trạng thái nếu Owner hỏi. Không tự triển khai biến thể, không làm lại 2 nút đã PASS.
- Chưa được phép merge PR #118 vào `main`; **chưa deploy Production**. Việc merge/release/đối soát Production cần **Owner ra lệnh rõ ràng**; PASS thiết kế Preview không phải lệnh release.
- Giới hạn dữ liệu: không ghi / xóa / điều chỉnh sản phẩm, giá, SKU, published, đơn hàng hay D1/R2 Production khi không có yêu cầu. Thử remote Preview chỉ khi workflow có guard và cleanup rõ ràng, không tự gửi đơn của khách.
- Chat tiếp theo chủ động dùng GitHub connector, **đọc file bàn giao này trước**, verify live HEAD, PR #118, run gần nhất, rồi xử lý chính xác phạm vi user giao; không yêu cầu dán lịch sử hoặc đưa code bảo owner chạy.
- Nếu sửa frontend sau này: không phá hành vi mua hàng; test PC/Mobile Light/Dark, SKU–status hàng ngang, title-case, giá, gallery, random catalog, 4 featured, nút hai màu. Chạy kiểm thử mã nguồn và Preview QA; yêu cầu Owner duyệt riêng đúng phần mới.
- Không báo `100% Production` khi chỉ là `Preview QA PASS + Owner PASS UI`.

## 5. Tài liệu liên quan

- [PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md](./PROMPT-NEXT-CHAT-2026-10-27-OWNER-PASS-PRODUCT-DETAIL.md) — **prompt chat mới**.
- [HANDOFF-LATEST-2026-10-26-CATALOG-SYNC.md](./HANDOFF-LATEST-2026-10-26-CATALOG-SYNC.md) — nguồn gốc đồng bộ catalog, checkpoint lịch sử.
- [HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md](./HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md) — lịch sử sửa theme; hiện theme mobile Owner PASS.
- [QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md](./QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md) — giới hạn phạm vi kiểm thử D1 và payment.

**Chốt bàn giao:** `OWNER PASS` chi tiết sản phẩm/hai CTA tại **app SHA `5f991ff3339848efc036a30bcc1c7e66fd224cd0`**, isolated Preview Actions **#40383014004 attempt 2 PASS 3/3**. **PR #118 OPEN/DRAFT**, **NO MERGE/NO PRODUCTION CHANGE**. Không làm lại, chờ yêu cầu mới.
