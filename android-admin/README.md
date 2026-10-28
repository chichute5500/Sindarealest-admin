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
