# PROMPT NEXT CHAT — SINDAREALEST STOREFRONT (2026-10-25)

Tiếp tục **đúng dự án SinDarealest**, không phải dự án mới. Đừng hỏi lại lịch sử. Ưu tiên đọc file bàn giao mới nhất `docs/handoff/SESSION-HANDOFF-2026-10-25.md` trong repo `chichute5500/Sindarealest-admin`, rồi `docs/handoff/CURRENT-STATE.md`, `TASKS.md`, `DECISIONS.md`, `TEST-RESULTS.md`, `PR-SCOPE-REVIEW.md`. Các mục lịch sử ghi "chờ nghiệm thu" đã bị ghi đè bởi OWNER PASS bên dưới.

**Repository:** `chichute5500/Sindarealest-admin`
**Nhánh được phép sửa (chỉ khi công việc được ủy quyền):** `fix/liquid-glass-audit-2026-10-19`
**Source/test commit cuối nghiệm thu:** `c23649de31e5bfe9ed0eaa2aaa3a1bb769a9ad84`
**PR #108:** OPEN, chưa merge, **307 files thay đổi**, hiện `mergeable=false / dirty` so với main.
**Admin PR #111:** OPEN, riêng biệt, không chỉnh khi làm storefront.
**Cloudflare Preview:** https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/
**Không merge PR, không sửa main, không deploy Production** nếu chưa có sự đồng ý riêng.

## Đã hoàn thành và CHỦ DỰ ÁN ĐÃ PASS / KHÓA THIẾT KẾ
1. **Hero**: đôi giày da cá sấu PNG gốc + bệ đá 3D hòa màu nền, chống lơ lửng, đồng bộ mobile/PC và theme tối/sáng. Không đổi ảnh gốc; blob `c17cc9058ae3008dc662806d21d2cf8f7d83b8a9`.
2. **Lọc danh mục**: khung cao 38px, hiệu ứng lóe inset 1px, vùng chạm 44px, chữ/chiều ngang nguyên, cả theme sáng/tối và responsive. Owner PASS.
3. **Scroll Reveal 2 chiều**: mỗi lần vào viewport từ trên/dưới đều xuất hiện. Đã tối ưu: sản phẩm opacity ~0,38s, bỏ blur nặng trên khối Liquid Glass, không giữ `will-change` GPU; tiêu đề đi 10px; chống nhấp nháy rìa bằng ngưỡng 8%; reduced-motion vẫn đúng. Owner PASS. Không hứa 60fps nếu chưa đo trên máy thật.
4. **Thêm vào giỏ**: **CẢ Ô SẢN PHẨM** bay từ đúng vị trí đến biểu tượng giỏ đang hiển thị; di chuyển cong và thu nhỏ; **0,9 giây**, nâng alpha cuối từ 0,22 lên 0,37 (**rõ thêm 15 điểm phần trăm**); mobile → giỏ thanh dưới, desktop → giỏ header; cộng đúng 1 và có phản hồi giỏ. Owner PASS bản cuối.
5. **Gallery**: CI/browser regression PASS; giữ nguyên hành vi đã khóa, không tự đổi.

## Kết quả chính xác ở source `c23649de31e5bfe9ed0eaa2aaa3a1bb769a9ad84`
- Validate **PASS** #40171662234
- Deploy Cloudflare Preview **PASS** #40171662196
- Hero browser **PASS** #40171662226
- Gallery browser **PASS** #40171662192
- Scroll/layer browser **PASS** #40171662178
- Full-card cart flight Chromium mobile/desktop × light/dark **4/4 PASS** #40171662229
- Screenshot artifact cart flight: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40171662229/artifacts/12590242188 (có hạn lưu trữ).

## Những việc CHƯA hoàn thành, phân biệt với frontend đã PASS
- PR #108 còn xung đột và phạm vi trộn (307 tệp; bản inventory cũ chỉ 298), phải đối chiếu mới để phân loại thành storefront vs Admin/backend/DB/migrations/catalog/deploy/infra, rồi trình phương án tích hợp an toàn; không merge vội.
- Preview D1 migration `0008_product_sku_verification.sql` và SKU live từ API chưa được xác minh đủ.
- QR/payment-ready API, lưu `fulfillmentType`, trạng thái đơn và cross-check Admin chưa được chứng minh end-to-end.
- PR #111 Admin là dự án con độc lập.
- Một vài audit thủ công có khóa và kiểm thử FPS thực thiết bị chưa chạy; không nói PASS thay cho SKIPPED.
- Production vẫn giữ nguyên, chưa được phép triển khai.

## Cách tiếp tục
1. Tự kiểm tra live GitHub HEAD/PR/Actions (SHA có thể đã thay đổi sau bàn giao). Phân biệt commit runtime `c23649de31e5bfe9ed0eaa2aaa3a1bb769a9ad84` với commit tài liệu tạo sau đó.
2. Đọc và tin vào checkpoint OWNER PASS mới nhất; không sửa lại các UX/UI đã được chủ dự án khóa trừ khi tôi yêu cầu.
3. Nếu chưa có task cụ thể khác, bắt đầu read-only rà soát **PR #108 xung đột/phạm vi 307 tệp**, tìm nguyên nhân và phương án tách an toàn; báo cáo phần cần quyền owner. Đừng làm tràn qua Admin/backend.
4. Khi được giao tác vụ giao diện, làm trực tiếp trên Preview với test/ảnh Chromium mobile+PC, light+dark, kiểm tra regressions Hero/Gallery/Cart và tính năng đang dùng; không chỉ đưa CSS để chủ dự án tự dán.
5. Cập nhật docs/handoff và tạo prompt bàn giao mới khi cần. Không hỏi lại những gì đã có.

Trả lời bằng **tiếng Việt**, báo cáo súc tích tiến độ, kết quả thật và trở ngại còn mở. **Chỉ dừng khi cần thao tác/quyền riêng của tôi.**
