# SINDAREALEST — BÀN GIAO MỚI NHẤT: TÀI KHOẢN GOOGLE & LIQUID GLASS
**Ngày:** 2026-10-29 (Asia/Ho_Chi_Minh)  
**Trạng thái:** CHƯA OWNER PASS. **DỪNG CHỈNH SỬA GIAO DIỆN theo yêu cầu bàn giao chat mới.**  
**Repo:** `chichute5500/Sindarealest-admin`  
**Chỉ sửa nhánh:** `feat/zalo-customer-login-2026-10-29`  
**PR:** [#150](https://github.com/chichute5500/Sindarealest-admin/pull/150) — OPEN, DRAFT, CHƯA MERGE.  
**HEAD code đã kiểm tra trước khi viết tài liệu này:** `0a77b0c50543ab8d4712de72cf3310355ef0123a`  
**Preview duy nhất dùng để Owner kiểm tra:** https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev  
**Lưu ý:** Sau commit tài liệu này, HEAD sẽ khác SHA code trên; chat mới phải lấy HEAD thực tế từ GitHub và đối chiếu diff trước khi sửa.

## 1. Chỉ đạo cuối cùng của Owner
Owner gửi hai ảnh cùng chụp trên điện thoại sau khi cập nhật Google sign-in, nêu vấn đề và yêu cầu:
1. **Khi chưa đăng nhập:** bỏ tiêu đề lớn “Tài khoản”, bỏ khoảng trống đầu drawer và kéo phần nội dung lên gần trên cùng, giữ nút X đóng; nút “Tiếp tục với Google” có KHUNG/viền và lớp kính rõ rệt (không hòa nền); mọi ô Địa chỉ giao hàng, Đơn hàng của tôi, Sản phẩm yêu thích, Chế độ hiển thị v.v. phải tách lớp Liquid Glass.
2. **Khi đăng nhập:** không giữ khối “Đăng nhập thành công...” cố định — chỉ thông báo nổi tạm thời rồi tự biến mất; chỉ **một** thẻ “Chào mừng [tên Google]” chứa nhà cung cấp đăng nhập Google và nút Đăng xuất (không có thêm thẻ tên tài khoản trùng).
3. **Đồng nhất UI:** cả desktop/mobile, sáng/tối, vẫn đúng chủ đề xanh nhạt và hiệu ứng Liquid Glass gốc SinDarealest. Không giải quyết bằng thêm hàng loạt CSS chồng chéo hoặc làm lại thiết kế đã Owner PASS.
4. **Khi đăng xuất:** thẻ chào mừng ẩn hoàn toàn; giao diện guest chỉ có đăng nhập Google.
5. Owner nói rõ: “Chưa xong. Viết pompt và cập nhật file bàn giao chat mới để tôi tiếp tục sửa”. **Không diễn giải thành PASS.**

## 2. Trạng thái thực tế mới nhất theo GitHub
- Google login đã được Owner tự thử thành công trong ảnh của cuộc chat (tên hiển thị mẫu từ tài khoản Google). Đây là xác nhận **Google OAuth hoạt động ở thời điểm Owner thử**, không phải Owner PASS cho bố cục mới.
- Google là lựa chọn đăng nhập **duy nhất hiển thị** cho khách trên PC và mobile. Zalo lỗi -501, Facebook/Email chưa mở cho khách; đừng tự bật lại.
- Mã đã sửa sau hai ảnh của Owner, **NHƯNG chưa có ảnh đối chiếu Owner hoặc nghiệm thu mới cho bản code này:**
  - Commit `087b1b8`: welcome chỉ hiện sau session và có tên khách.
  - Commit `1dba51f`: ẩn tiêu đề Tài khoản về mặt thị giác (vẫn giữ screen-reader heading), compact header, gộp provider/logout vào welcome; success toast tự ẩn 3800ms; scoped Liquid Glass cho drawer, thẻ con và nút Google; cache-bust assets.
  - Commit `0a77b0c`: sửa event listener Đăng xuất do nút đã được di chuyển vào welcome, sửa thuộc tính CSS font cho nút.
- Theo GitHub Actions tại HEAD code `0a77b0c50543ab8d4712de72cf3310355ef0123a`:
  - [Source CI PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40902703653)
  - [Admin Preview Playwright PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40902703778)
  - [Cloudflare Preview deploy & backend smoke PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40902692219)
  - Không đồng nhất CI source/backend smoke với UI screenshot/real-device visual PASS.
- PR #150 đang DRAFT; Main/Storefront Production chưa được phê duyệt để nhận các thay đổi auth này.

## 3. Files/phần code trọng tâm cần đọc trước khi sửa
1. `public/index.html` — `#accountDrawer`, `.sd-account-header`, `#accountDrawerTitle`, `#sdAccountToast`, `.account-guest`, `#sdCustomerAuth`, `data-auth-signed`, `.account-action`, `#mobileAccountNav`, `#accountOpen`; logic `setAccountView()` trong inline script. Trang chứa nhiều lớp CSS lịch sử cần kiểm tra computed styles thực tế.
2. `public/customer-auth-ui.js` — `refresh()`, `notify()`, `showToast()`, `guest.hidden`, `root.hidden`, `signed?.querySelector("[data-auth-logout]")`, trường `provider` và cập nhật tên; giữ state OAuth/cookie.
3. `public/customer-auth.css` — CSS riêng account, các tokens `--sd-account-*`, `#accountDrawer`, `#sdCustomerAuth`, `.account-action`, `.sd-auth-google`, sáng/tối và mobile; tránh ghi đè các selector toàn cục ngoài tài khoản.
4. `tests/customer-auth-cloud-ui.test.mjs`, `tests/customer-auth-cloud.test.mjs`, `tests/customer-auth-contract.test.mjs`; toàn bộ source tests và Playwright.
5. `docs/auth/CUSTOMER-LOGIN-RELEASE-GATES-2026-10-29.md` — lịch sử và các giới hạn an toàn, có phần ghi chép lịch sử cũ; ưu tiên trạng thái mới ở tài liệu này và kiểm tra GitHub thực tế.

## 4. Kiểm tra và xử lý còn lại, KHÔNG gắn PASS trước khi hoàn tất
- Đọc HEAD và CI thật; mở Preview đúng branch alias, không dùng trang Production của dự án admin-preview hay `sindarealest2.pages.dev`.
- Tự kiểm tra/chụp màn hình desktop (>= 761px) và mobile (~360, 390, 430px) ở CẢ dark/light. Có guest, Google signed-in, OAuth callback success, refresh, logout và reopen drawer. Không cần Owner gửi lại lịch sử.
- Đối chiếu ảnh thực tế: drawer không để phần header rỗng; nút X không che nội dung; nút Google có viền/độ nổi độc lập; các thẻ action kính có đường biên rõ nhưng tinh tế và bóng phản chiếu, giữ Liquid Glass gốc, không biến thành các mảng nền đặc.
- Thành công đăng nhập chỉ hiện toast nổi 3.8s và tự mất, không đẩy bố cục xuống; trên trang login không hiện thẻ chào mừng; sau login chỉ còn một card welcome chứa tên Google, provider, logout.
- Tránh bug mới: thẻ welcome không nhấp nháy trước response `/api/customer/session`; đóng/mở drawer khi toast đang hiện; login/logout hoạt động sau reload; thông báo lỗi vẫn đọc được; không để `[hidden]` bị CSS `display` ghi đè; không lặp event listeners; nút logout vẫn gọi POST và có trạng thái guest sau thành công.
- Kiểm tra trượt dọc để nhìn tất cả thẻ và tránh đè mobile bottom-nav; keyboard focus/ESC, aria-modal, screen-reader heading vẫn có; tên Google dài không tràn và phải chèn bằng `textContent` để tránh XSS.
- Lưu screenshot đối chứng ít nhất guest/signed x light/dark x PC/mobile; sau khi sửa kiểm lại CSS cascade, không thêm CSS global chồng chéo. Nếu bản code hiện tại thực sự đạt tiêu chuẩn, báo Owner thử Preview rồi **đợi Owner PASS**, không sửa làm lại tùy tiện.
- Đảm bảo Google-only, profile/address/favorites/orders sync, guest checkout, Admin auth riêng, welcome, HERO, theme và toàn bộ phần đã Owner PASS không bị đụng tới.
- Mỗi lần có code mới: npm test và check tương ứng, Playwright PC/mobile, Preview deploy isolation, real Cloudflare smoke; lấy SHA, links CI và screenshot. Nếu kiểm thử không chạy được, ghi rõ giới hạn; không nói 100%.

## 5. Cảnh báo bảo mật và phát hành
- Preview branch alias là https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev. Đừng dùng `sindarealest-admin-preview.pages.dev` root để kiểm thử OAuth, vì đó là Production host của dự án preview.
- Production storefront `sindarealest2.pages.dev` và Production D1/R2 không được thay đổi; kiểm tra isolation của Preview, không log secrets, không dùng dữ liệu khách thật làm fixture.
- KHÔNG merge PR #150 / deploy Main trước khi Owner PASS phiên bản cuối. Zalo vẫn chưa PASS (API -501), Facebook và Email không mở công khai.
- Không hỏi lại các yêu cầu đã nêu. Khi tiếp tục, xác minh HEAD rồi tập trung QA/chỉnh phần chưa đạt.

## 6. Trình tự cho chat mới
1. Đọc 2 file bàn giao mới và release gates; xác minh GitHub HEAD + PR #150 + CI.
2. Mở source, phân tích computed-style/CSS và test browser thật, đối chứng với 2 ảnh Owner đã mô tả.
3. Sửa đúng lỗi chưa đạt, giữ các phần PASS.
4. CI + screenshot trên 4 tổ hợp PC/mobile sáng/tối; Google guest/signed/logout; deploy Preview an toàn.
5. Báo cáo SHA, link Preview, lỗi đã xử lý và bằng chứng. **Chờ Owner nghiệm thu, không tự nhận Owner PASS.**
