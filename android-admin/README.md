# SinDarealest Admin — APK Android

Ứng dụng Android chính thức dành cho Owner: **tải Admin thật qua HTTPS**, không thay thế backend, không chép D1/R2 hoặc tạo cơ sở dữ liệu riêng. Giao diện và nghiệp vụ đã PASS trên Storefront/Admin vẫn do website phục vụ.

## Hành vi
- Mở https://sindarealest2.pages.dev/admin/; JavaScript, DOM storage, cookie phiên đăng nhập bên thứ nhất.
- Ảnh/logo lấy đúng \`public/images/brand-emblem.png\` trong repo.
- Chọn nhiều ảnh/tệp bằng Android Files/Photos; chụp ảnh bằng Camera và FileProvider.
- Giữ touch/zoom/drag của WebView; không thêm gesture refresh ghi đè kéo ảnh ở Admin.
- Tải URL HTTPS dùng DownloadManager; Blob export từ trang Admin chính hãng bằng origin-restricted AndroidX WebMessage và MediaStore Downloads (tối đa 18 MB).
- Link ngoài mở Android app/browser; không cho WebView điều hướng sang tên miền khác.
- Cấm cleartext, mixed content, không bỏ qua lỗi SSL, không bật WebView debugging; không cho đọc file://.
- Hỗ trợ dark/light từ Android và site CSS, không tự ép đảo màu.
- Menu Android: tải lại hoặc mở trong Chrome.
- Mất mạng có thông báo thử lại; WebView state giữ lại khi Activity khởi tạo lại.
- Quyền: INTERNET, ACCESS_NETWORK_STATE, không yêu cầu quyền đọc toàn bộ thư viện ảnh/bộ nhớ.
- minSdk 29 (Android 10+); targetSdk 34; package com.sindarealest.admin.

## Build debug APK (cài thử)

Yêu cầu JDK 17, Android SDK Platform 35 / Build Tools 35, Gradle 8.9. Từ thư mục android-admin:

\`\`\`bash
gradle --no-daemon :app:assembleDebug
\`\`\`

Hoặc chạy GitHub Actions workflow **Admin Android APK — signed installable test build**, rồi tải artifact \`SinDarealest-Admin-Android-APK\`. Workflow build APK **debug-signed** Android tự nhận cài, không phải release ký phân phối lên Play Store. Để nâng cấp lâu dài, cần keystore release riêng do Owner quản lý; không đưa khóa ký vào repository.

## Lưu ý bảo mật

- Đăng nhập phải dùng mật khẩu Owner trên HTTPS, không lưu mật khẩu trong APK.
- Bản debug APK chỉ dùng để nghiệm thu nội bộ. Trước khi phát hành lâu dài cần cấu hình release keystore bảo mật và kiểm tra login/đăng xuất, upload ảnh, kéo ảnh, sao lưu/khôi phục, dark mode trên Xiaomi 15 Ultra.
- Nếu Admin production đổi tên miền, cần cập nhật allowlist và ADMIN_URL, rebuild và kiểm thử.

## Android thông báo đẩy và phiên Owner (v1.1)
- Notification channel **Đơn hàng và hoạt động Admin**, xin quyền POST_NOTIFICATIONS trên Android 13+.
- Native FCM SDK nhận data message khi app ở nền/đóng, rồi hiển thị thông báo hệ thống; bấm mở đúng Admin HTTPS.
- Không gửi số điện thoại, địa chỉ hoặc tiền vào nội dung push trên màn hình khóa.
- Nếu chưa có cấu hình Firebase thì APK vẫn mở được Admin nhưng **CHƯA CÓ THÔNG BÁO ĐẨY**; không đánh đồng CI build PASS với FCM delivery PASS.
- Admin website vẫn logout sau 10 phút. APK được nhận cookie HttpOnly riêng và quyền thiết bị 30 ngày dạng sliding, lưu hash tại D1, hủy khi Đăng xuất; không lưu mật khẩu trong app.
- Cần migration `migrations/0010_admin_android_devices.sql` trên D1 đúng môi trường, deploy Pages Functions mới, và cấu hình Cloudflare secret `FCM_SERVICE_ACCOUNT_JSON` (service account chỉ phía server).
- Tạo Firebase Android app với package `com.sindarealest.admin`; trên GitHub repo Secrets điền `SD_FIREBASE_APP_ID`, `SD_FIREBASE_SENDER_ID`, `SD_FIREBASE_PROJECT_ID`, `SD_FIREBASE_API_KEY` (Firebase client configuration, không phải service-account private key).
- Bật Cloud Messaging API v1 trong Firebase/Google Cloud cho project tương ứng, cấu hình quyền cho service account.
- Test thực tế trên Xiaomi 15 Ultra: đăng nhập một lần; cấp quyền thông báo; gửi đơn thử và bảo hành thử; khóa màn hình/thoát app; kiểm tra push; thử đăng xuất để đảm bảo thiết bị bị thu hồi; sau 10 phút mở lại vẫn còn phiên APK; Chrome vẫn timeout 10 phút.
- GitHub Actions debug key thay đổi giữa các runner; nếu không cài đè được v1.0.0 thì gỡ bản test cũ trước khi cài v1.1.0. Trước release cần keystore Owner cố định để nâng cấp giữ dữ liệu ứng dụng.
