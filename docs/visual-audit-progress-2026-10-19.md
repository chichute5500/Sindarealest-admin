# SinDarealest — tiến độ kiểm toán giao diện

Ngày cập nhật: 19/10/2026  
Repository: `chichute5500/Sindarealest-admin`  
Nhánh làm việc: `fix/liquid-glass-audit-2026-10-19`  
Production: không merge vào `main`, không deploy, không thay DNS/secrets/DB/R2.

## Bằng chứng đã thu thập

- Đã kiểm kê ZIP ban đầu gồm 28 JPG, `report.html`, `visual-audit.json`.
- Đã tạo và đọc trực tiếp artifact `sindarealest-liquid-glass-preview-62`: 36 ảnh JPG và báo cáo audit. 20 phép đo responsive ở 10 viewport × 2 theme. 0 lỗi console/page/HTTP/request cùng nguồn; 0 request ghi ngoài phạm vi; tuy nhiên audit tương tác chưa đạt.
- Ảnh full-page hiện tại cho thấy website dài và có các section bổ sung so với ảnh mẫu dạng màn hình app. Ảnh catalog hiện dùng sản phẩm thật trong fixture; không có túi xách phù hợp để giả lập chiếc túi ở ảnh đích. Không tự bịa sản phẩm/ảnh/giá.
- Ở artifact 62, lỗi tương tác chính là: cart không inert khi checkout mở, test focus trap không đo đúng biên tab, account không giữ initial focus trong audit.

## Sửa tiếp trên nhánh thử nghiệm

- Bắt buộc đặt `inert` cho cart sau khi mở checkout.
- Tránh callbacks khôi phục focus từ drawer cũ chạy đè lên drawer vừa mở.
- Mở account đặt focus ngay và có các frame/timer dự phòng trong lúc chuyển cảnh.
- Cập nhật trình duyệt test để lấy danh sách focusable thật và kiểm tra Tab/Shift+Tab trên hai đầu chuỗi; ghi lại nguyên nhân nếu vẫn thất bại.
- Tăng diagnostics checkout để phân biệt trạng thái `aria-hidden`, `inert`, open class và focus.

## Giới hạn

Preview là Chromium/Playwright trên viewport giả lập; không phải kiểm thử Android vật lý. API địa chỉ trong preview là fixture offline; không gửi đơn thật hoặc thực hiện thanh toán. Chưa có đo điểm tương đồng pixel có thể xác nhận với ảnh tham chiếu tổng hợp. Vì vậy chưa được tuyên bố nghiệm thu 100%.
