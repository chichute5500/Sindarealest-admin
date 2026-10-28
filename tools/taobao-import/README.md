# SinDarealest × Taobao Import — Android source prototype

**Trạng thái:** mã nguồn mẫu / chưa build APK / chưa triển khai lên GitHub hoặc Cloudflare.

## Tổng quan

- Ứng dụng Android hiển thị hai nút dùng Chrome Custom Tabs: Taobao và khu vực nhập ảnh của SinDarealest.
- Đăng nhập Taobao xảy ra ở browser thật, không có màn hình giả, không thu thập mật khẩu/cookie/sessions, không dùng code tiêm vào Taobao, không tự động quét/download nội dung.
- Người dùng tự tải ảnh được phép sử dụng từ Taobao/nhà cung cấp vào Downloads và chọn nhiều ảnh trong web importer.
- Android nhận URL chia sẻ qua `ACTION_SEND` (chỉ domain taobao.com/tmall.com/tb.cn); chuyển URL vào fragment `#source=` phía client; không lưu trên server và không gán vào nội dung sản phẩm.
- Web importer chạy trong cùng origin Admin đã đăng nhập, gọi API `/api/admin/session`, `/api/admin/login`, `/api/admin/upload`, `/api/admin/products` đã có.
- WebP tối đa 5 MB và ảnh gốc JPEG/PNG/WebP tối đa 20 MB. Hiện máy chủ đã yêu cầu cả bản WebP và bản gốc; dùng R2 `IMAGES`/`ORIGINALS`.
- Khi tạo sản phẩm luôn `published:false` để giữ chế độ ẩn. SKU chính thức được API server cấp.

## Sơ đồ

Taobao (Chrome Custom Tabs)
  → tải ảnh được phép sử dụng về Android
  → File Picker ở trang `/admin/taobao-import.html`
  → API upload (same-site session; 2 ảnh WebP & original)
  → R2 `IMAGES` và `ORIGINALS`
  → POST `/api/admin/products` với `published:false`
  → D1 sản phẩm nháp ẩn, Owner duyệt ở `/admin/`.

## Cách tích hợp trang nhập ảnh

Sao chép file `web/public/admin/taobao-import.html` vào `public/admin/taobao-import.html` trong repository `chichute5500/Sindarealest-admin` ở **nhánh thử nghiệm được phép** (không đưa lên `main` khi chưa nghiệm thu). Không cần sửa API và không cần migration, nhưng cần kiểm thử lại các chính sách bảo mật ứng dụng, admin login, hình ảnh, R2/ORIGINALS và session rotation trước deploy.

> Địa chỉ gợi ý: `https://sindarealest2.pages.dev/admin/taobao-import.html` — **chưa kiểm chứng đây là hostname deployment Admin thực tế**. Phải xác minh URL trước khi phát hành APK.

## Cách build ứng dụng Android

Thư mục `android/` là source Android Studio (Java, compileSdk 36, minSdk 26, targetSdk 35, AndroidX Browser 1.10.0, Gradle Android Plugin 8.13.0).

1. Mở `android/` bằng Android Studio (JDK 17 / Android SDK 36). Nếu Android Studio yêu cầu Gradle Wrapper, tạo từ bản Gradle 8.13 cài trên máy bằng `gradle wrapper --gradle-version 8.13`.
2. **Xác minh và cập nhật hằng số `ADMIN_IMPORT`** trong `MainActivity.java` tới domain Admin đang chạy thử. Không nhập mật khẩu vào source code.
3. Sync Gradle; build `assembleDebug`. Chỉ cài file APK đã được Android Studio tạo ra trên thiết bị thử. Không cấp quyền `READ_EXTERNAL_STORAGE` hay `MANAGE_EXTERNAL_STORAGE` — web importer dùng system file picker.
4. Dùng Chrome để đăng nhập Taobao nếu được hỗ trợ, chọn ảnh đã tải về, mở import, đăng nhập Admin, nhập sản phẩm nháp, kiểm tra trên Admin.

**Lưu ý:** bộ này chưa bao gồm Android Gradle Wrapper jar/binary; cần Android Studio hoặc Gradle để lấy các thành phần build. Không tuyên bố đã tạo được APK.

## Rủi ro cần kiểm thử trước khi dùng chính thức

- Taobao có thể giới hạn thao tác đăng nhập / tải ảnh và yêu cầu xác thực bổ sung. Công cụ **không vượt bảo vệ website** hoặc truy xuất API chưa được phép.
- Ảnh hoặc mô tả đăng lại cần có quyền hợp lệ từ người sở hữu quyền. Không dùng ảnh từ trang không cho phép tái sử dụng.
- URL chia sẻ có thể có tham số cá nhân; công cụ chỉ giữ trong Activity RAM, gắn vào URL fragment để frontend hiển thị, không gửi trực tiếp trong body hoặc request URL lên server. Người dùng có thể xóa URL fragment bằng chính importer trước khi thao tác tiếp.
- Mỗi upload riêng lẻ đã ghi vào R2; nếu việc tạo sản phẩm thất bại có thể còn ảnh chưa gắn với sản phẩm. Nên bổ sung dọn rác ảnh mồ côi với quy trình xác nhận trong phase sau, không xóa tự động trên production.
- Ứng dụng hiện có một sản phẩm mỗi lần nhập, giới hạn 30 ảnh, không có tự động dịch giá/size và không có thu thập hàng loạt từ Taobao.
- Web page chủ động login Admin tại same-origin; không đọc hoặc lưu `HttpOnly` token Admin trong JavaScript, không lưu mật khẩu Admin. Phiên có thể hết hạn sau 10 phút không hoạt động và cần đăng nhập lại.
- Test cả Android Chrome, Chrome Custom Tabs, shared URL, private R2 original, 401/403/413, hết session khi đang upload, dark/light, tải ảnh 20MB, 30 ảnh, category, giá rỗng, và xác nhận `published=false` trên D1.

## Phạm vi đã kiểm tra (2026-10-28)

Đã đọc trực tiếp từ repo nhánh `feat/product-options-shoes-belts-phone-2026-10-28`: `functions/api/admin/upload.js`, `functions/api/admin/products.js`, `functions/api/admin/login.js`, `functions/api/admin/session.js`, `functions/_catalog-sku.js`, `functions/_lib.js`, `public/admin/index.html`, `wrangler.toml`.

Không sửa repository và không thay đổi trạng thái PR #137. Source này được tạo độc lập để Owner duyệt thiết kế và luồng sử dụng, sau đó mới tích hợp lên nhánh được phép.
