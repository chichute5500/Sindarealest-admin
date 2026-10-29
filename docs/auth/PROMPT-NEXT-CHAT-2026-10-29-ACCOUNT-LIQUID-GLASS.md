# PROMPT NEXT CHAT — SINDAREALEST ACCOUNT: GOOGLE-ONLY & LIQUID GLASS

Tiếp tục trực tiếp dự án SinDarealest, **không bắt đầu lại** và không hỏi lại lịch sử.

- Repository: `chichute5500/Sindarealest-admin`
- **Chỉ sửa:** `feat/zalo-customer-login-2026-10-29`
- PR #150: DRAFT, chưa merge Main.
- Checkpoint code đã xác minh trước khi commit bàn giao: `0a77b0c50543ab8d4712de72cf3310355ef0123a`. **Bắt buộc kiểm tra GitHub HEAD hiện tại** vì commit docs mới sẽ tiếp theo.
- Preview: https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev

**BẮT BUỘC đọc:**
1. `docs/auth/HANDOFF-LATEST-2026-10-29-ACCOUNT-LIQUID-GLASS.md`
2. `docs/auth/PROMPT-NEXT-CHAT-2026-10-29-ACCOUNT-LIQUID-GLASS.md`
3. `docs/auth/CUSTOMER-LOGIN-RELEASE-GATES-2026-10-29.md`

**Owner chưa PASS giao diện Tài khoản.** Hai ảnh cuối chat trước chỉ ra:
- Guest: bỏ tiêu đề lớn “Tài khoản” và khoảng trống, đưa nội dung lên trên, giữ nút X. Nút “Tiếp tục với Google” phải có một khung Liquid Glass nổi rõ, không chìm vào nền.
- Signed-in: chỉ toast thông báo login thành công trong vài giây, không giữ khối thông báo; **một thẻ duy nhất** “Chào mừng [tên Google]”, kèm “Đã đăng nhập qua Google” và nút Đăng xuất trong cùng thẻ. Không lặp thông tin tài khoản.
- Toàn bộ thẻ trong drawer (Địa chỉ, Đơn hàng, Yêu thích, Chế độ hiển thị, Liên hệ...) phải có viền, ánh sáng và chiều sâu Liquid Glass phân tầng rõ ràng, tông xanh nhạt; không hòa chung với nền. Đồng bộ PC/mobile + light/dark.

**Đã có commit sửa ban đầu**: `1dba51f` layout/CSS/toast, `0a77b0c` fix listener/logout; CI + Cloudflare Preview deploy tại checkpoint `0a77b0c50543ab8d4712de72cf3310355ef0123a` đã PASS. **Đừng lặp công việc đã có**, nhưng cũng **đừng coi UI đã nghiệm thu**. Trước tiên mở code và Preview, screenshot/test độc lập để xác định điều gì còn sai; sau đó chỉ sửa lỗi thật.

**Tệp chính:** `public/index.html`, `public/customer-auth-ui.js`, `public/customer-auth.css`, `tests/customer-auth-cloud-ui.test.mjs`. Kiểm tra `#accountDrawer`, `#sdCustomerAuth`, `#sdAccountToast`, `.account-guest`, `.account-action`, `data-auth-signed`, `[data-auth-logout]` và các quy tắc CSS chồng chéo.

**Acceptance bắt buộc:** Guest/Google signed-in/logout + refresh/OAuth callback, 4 tổ hợp mobile/desktop x sáng/tối, không nhấp nháy, không mất khung kính, không có title thừa, không bị bottom nav đè, logout hoạt động, toast tự ẩn, không hồi quy các tính năng Owner PASS. Chạy source CI, browser tests, Preview isolation & deploy, đối chiếu ảnh chụp trước/sau.

**Giới hạn:** Chỉ Google hiển thị; Zalo (lỗi -501), FB, Email tạm ẩn. Không động Main, Production D1/R2, checkout, Admin, catalog, HERO, Welcome hay những phần đã PASS. PR #150 giữ DRAFT. **Chỉ báo Owner PASS khi Owner thực sự xác nhận.**

Bắt tay kiểm tra và hoàn thiện phần chưa đạt trên Preview, không hứa làm nền hoặc yêu cầu gửi lại thông tin đã có. Gửi link Preview, SHA, CI và bằng chứng QA khi xong.
