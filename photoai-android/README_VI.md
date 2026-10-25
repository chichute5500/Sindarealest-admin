# SinDarealest PhotoAI Android — mã nguồn 0.5 alpha

> **Trạng thái: nguyên mẫu mã nguồn, CHƯA phải APK hoàn chỉnh.** Chưa biên dịch hoặc chạy trên Xiaomi 15 Ultra thực tế. Môi trường làm việc hiện không có Android SDK/Gradle nên không thể bảo đảm APK cài được.

## Mục tiêu ứng dụng

- Nhập ảnh từ thư mục điện thoại và quét đệ quy, giữ danh mục lớn đang có.
- Tìm ảnh theo tên, xem ảnh, chọn/chuyển ảnh, gộp mẫu, đổi tên, hoàn tác và lưu dự án.
- Nhập giá bán VNĐ và xác nhận mẫu. **AI không tự đặt giá.**
- Xuất thư mục mới `Danh mục/Mẫu/Màu/Ảnh`, không ghi đè ảnh nguồn.
- Có công tắc **Bật/Tắt AI** và chọn 3 chế độ: **Trên máy / Cloud / Kết hợp**.
- Người dùng bật quyền gửi ảnh lên Cloud rõ ràng; không có dịch vụ Cloud mặc định.

## Đang hoạt động trong mã nguồn

1. UI Android WebView + giao diện quản lý nhóm, tìm file, gộp/tách/chuyển, chỉnh tên và giá; dùng dữ liệu dự án lưu nội bộ.
2. Native SAF chọn thư mục, quét ảnh và xuất bản sao; không yêu cầu quyền truy cập tất cả tệp.
3. Hiển thị tổng RAM/luồng CPU, chọn chế độ AI và tắt AI bất cứ lúc nào.
4. Chế độ cục bộ **chỉ là baseline an toàn**: đọc ảnh, không tự gộp ảnh/khẳng định màu khi độ tin cậy chưa có. Kết quả được đánh dấu chưa xác nhận. **Chưa phải mô hình nhận diện chuyên dụng.**
5. Chế độ Cloud: giao thức HTTPS với máy chủ **do chủ sở hữu cấu hình**; mã truy cập không ghi xuống dự án. Chỉ gửi thumbnail khi người dùng đồng ý.
6. Chế độ Hybrid: chạy baseline trên máy; nếu được đồng ý và cấu hình endpoint, thử Cloud, nếu không sử dụng gợi ý trên máy.

## CHƯA hoàn thiện — không nên phát hành thực tế

- Chưa tích hợp trọng số và runtime mô hình thị giác tối ưu cho Snapdragon (TFLite/ONNX/QNN).
- Chưa có dịch vụ Cloud thực tế. Cloud chỉ hoạt động sau khi có máy chủ HTTPS triển khai theo `CLOUD_API.md`.
- Chưa chạy bài thử trên Xiaomi 15 Ultra hoặc qua Android SDK; chưa đo mức sử dụng pin/nhiệt độ/RAM.
- Chưa kiểm thử kéo-thả cảm ứng thực tế. Với điện thoại có thể dùng nút **Chuyển đến** đáng tin cậy hơn.
- Nhận diện màu sản phẩm/tách nền CHƯA sẵn sàng trong native baseline; ảnh chưa rõ để “Chưa rõ”.
- Chưa có công cụ nâng cấp mô hình online mà không cập nhật APK.

## Dựng thử mã nguồn bằng Android Studio

1. Android Studio phiên bản hỗ trợ Android Gradle Plugin 8.8.2, JDK 17, Android SDK Platform 35.
2. Mở thư mục dự án chứa `settings.gradle`.
3. Sync Gradle, build `app` → `assembleDebug`.
4. Cài thử bằng Android Studio trên thiết bị, kiểm tra quyền thư mục theo Android SAF, rồi mới thử ảnh thật.
5. Khi phân phối chính thức cần dùng **một khóa ký APK cố định**, versionCode tăng dần để cập nhật cùng ứng dụng, không đổi applicationId.

CI mẫu được cung cấp tại `.github/workflows/android-debug.yml` để tạo APK debug từ repo sau khi đẩy lên GitHub.

## An toàn dữ liệu

- Không cung cấp ảnh/tài khoản Cloud nếu chưa tin tưởng dịch vụ; HTTPS không đảm bảo quyền riêng tư của bên nhận.
- Luôn giữ thư mục nguồn nguyên vẹn. Xuất sẽ tạo một thư mục mới có tiền tố `SinDarealest_Export_`.
- Thông tin sản phẩm do người dùng xác nhận mới xem là sẵn sàng cho web. Chưa đồng bộ website.

## Bản đóng gói AI offline

Workflow tải model MediaPipe MobileNetV3-Small theo tài liệu Google AI Edge trước khi biên dịch và kiểm tra dung lượng model. Ứng dụng chứa model thực để trích xuất embedding ảnh, tự động nhóm theo mức tương đồng trong từng danh mục. Màu là phép ước lượng từ tiền cảnh và ảnh không chắc chắn trả Chưa rõ. Không thể cam kết chính xác 100%.

### Lưu ý phân phối

Các APK debug từ mỗi runner CI có khóa debug khác nhau. Phát hành chính thức phải dùng một khóa ký release ổn định, lưu an toàn trong GitHub Actions secrets.

## Thay đổi 0.5 alpha (25/10/2026)
- AI chỉ phân tích ảnh thuộc mẫu CHƯA xác nhận; tên, màu, giá và gán ảnh của mẫu đã duyệt được giữ nguyên. Kiểm tra toàn vẹn của phản hồi Cloud trước khi áp dụng.
- Không cho xuất vào chính thư mục nguồn hoặc thư mục con của nó khi SAF provider hỗ trợ document ID theo cấu trúc phân cấp. Nên chọn vùng xuất độc lập.
- Xóa cache thumbnail khi mở nguồn ảnh khác, tránh hiện nhầm ảnh cũ theo mã p1/p2.
- Khi chuyển nhiều ảnh đến danh mục, tạo một mẫu đích chung thay vì mỗi ảnh một mẫu.
- Gộp/chuyển toàn bộ một màu sang mẫu khác sẽ cập nhật danh mục nhất quán.
- Không duyệt sản phẩm khi còn ảnh màu Chưa rõ hoặc chưa nhập giá.
- JavaScript kiểm tra bằng node --check; kiểm thử giao diện trình duyệt là độc lập với kiểm thử APK trên thiết bị.
- Chưa nhận được kết quả GitHub Actions assembleDebug chứa mô hình; tuyệt đối không dùng APK Beta 59KB để đánh giá AI.

- Xem ảnh lớn sử dụng bản xem trước tối đa 1600px, giảm nguy cơ WebView hết RAM với ảnh 20–50 MP; ảnh gốc vẫn được sao chép nguyên byte khi xuất.
- Giao thức Cloud v0.5 từ chối >150 ảnh/lượt để tránh tạo yêu cầu JSON quá lớn; Hybrid tự giữ kết quả trên máy khi Cloud không đáp ứng. Đây chưa phải giải pháp Cloud hoàn chỉnh cho bộ 792 ảnh.

 