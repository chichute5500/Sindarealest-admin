# PROMPT NEXT CHAT — SINDAREALEST · 27/10/2026 · 6 BƯỚC TRA CỨU / BẢO HÀNH

Tiếp tục trực tiếp dự án **SinDarealest** trên GitHub. **Đây không phải dự án mới; không hỏi lại lịch sử và tuyệt đối không làm lại những phần Owner đã PASS.**

## 1. Nguồn sự thật phải kiểm tra trước

- Repository: **chichute5500/Sindarealest-admin**
- **Nhánh hiện tại:** feat/warranty-short-code-2026-10-27
- **Code SHA mới nhất Owner PASS:** **89657feb0b5bba186ff50b672a3af72687463741**
- **PR #122:** https://github.com/chichute5500/Sindarealest-admin/pull/122 — OPEN, DRAFT, chưa merge tại thời điểm bàn giao.
- **main Production:** f50ec34910bbfc431b01d6603d7973f2b0e426f1 (PR #118 đã merge); CHƯA chứa PR #122.
- **Preview đã deploy và Owner PASS:** https://order-six-review-1027.sindarealest-admin-preview.pages.dev/
- **Workflow deploy Preview:** https://github.com/chichute5500/Sindarealest-admin/actions/runs/40451693014 — SUCCESS, Cloudflare log trỏ chính xác tới code SHA 89657feb.
- **CI:** #40451693023 và #40451697405 SUCCESS; Admin Playwright #40451697430 SUCCESS.
- **BẮT BUỘC ĐỌC KỸ file mới nhất:** docs/integration/HANDOFF-LATEST-2026-10-27-OWNER-PASS-ORDER-TRACKING-WARRANTY.md; đây là nguồn sự thật thay cho các prompt bàn giao cũ. File này và prompt mới có thể làm HEAD tăng do **commit docs-only**, phải phân biệt với code SHA 89657feb.

## 2. Phần Owner vừa PASS — KHÓA

**Web khách hàng**: ngay bên dưới **Đặt hàng an tâm**, trước Sản phẩm nổi bật có ô **Tra cứu đơn hàng** bằng mã đơn hoặc SĐT; kết quả 6 bước: (1) Đã gửi đơn, (2) Xác nhận đơn, (3) Đã nhận cọc (hoặc Đã nhận thanh toán), (4) Đang làm sản phẩm, (5) Đã gửi hàng, (6) Hoàn thành. Chỉ hiện ngày/tháng/năm khi bước đó đã xong. Bước đang làm không hiện ngày hoàn tất. Dữ liệu thực lấy từ D1 order/audit/ledger. API giới hạn 5 lần/15 phút/IP, che mã đơn khi tra bằng SĐT, không tiết lộ PII/tiền thanh toán. CSS riêng sd-track.

**Đặc biệt vừa PASS bố cục tối giản**: đã XÓA 2 mô tả “Nhập mã đơn hoặc số điện thoại đã đặt để xem 6 bước xử lý của Shop.” và “Chỉ hiển thị tiến trình đơn, không công khai thông tin cá nhân hoặc thanh toán. Liên hệ Shop nếu cần hỗ trợ.”; đã thu gọn padding/gap của ô PC/Mobile. **Không thêm lại hai câu này, không tăng kích thước dư thừa, không thay giao diện đã duyệt**.

**Bảo hành**: không phát hành khi xác nhận đơn; chỉ kích hoạt tự động tại lần đầu hoàn tất đơn, cùng transaction D1/COD. Mỗi dòng order_item một mã **SDW-XXXX** bốn ký tự, chống trùng; mã dài cũ còn tra cứu; dưới 2 triệu bảo hành 6 tháng, từ 2 triệu 12 tháng; bắt đầu ngày hoàn tất giờ Việt Nam. Không hồi tố thay mã/bảo hành lịch sử. UI **Admin giữ 5 bước** được Owner PASS; web khách **6 bước**.

**Thanh toán**: cọc chỉ đối soát nhập một lần; lúc hoàn tất xác nhận Shop thực thu số dư COD, ghi nhận riêng, không tự coi quét QR là đã trả. QR, checkout, footer, VIP đỏ chữ đứng, HERO, Welcome, theme, catalog, Liquid Glass, giỏ, gallery và các tính năng Owner PASS trước đó phải giữ nguyên.

## 3. Công việc và quy tắc tiếp theo

Hiện **không có task code dở dang**; Owner chỉ yêu cầu bàn giao chat mới. Fetch lại GitHub HEAD, PR, workflow trước khi xử lý yêu cầu MỚI. Dùng công cụ GitHub trực tiếp; giới hạn phạm vi sửa, chống CSS chồng, CI và PC/Mobile sáng/tối trên Preview. Báo SHA, workflow, link Preview xác thực. Không tự merge PR #122, không deploy Production, không ghi/xóa D1/R2 Production, không tự sửa tài chính/danh mục/bảo hành cũ. **Chỉ merge khi Owner ra lệnh riêng, không coi PASS là quyền release.**

Files chính: public/index.html; public/admin/index.html; functions/api/order-tracking.js; functions/api/admin/orders.js; functions/_warranty-policy.js; tests/order-tracking-public.test.mjs; tests/warranty-auto-confirmation.test.mjs; .github/workflows/deploy-order-six-review-preview.yml.

**Trạng thái chốt:** Owner đã PASS bản code **89657feb** trên isolated Preview. Chờ yêu cầu tiếp theo.
