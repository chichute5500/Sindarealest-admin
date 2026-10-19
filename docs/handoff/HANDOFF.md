# SinDarealest2 — Handoff trạng thái công việc

> Hồ sơ bàn giao giữa các AI. Đây là bản đồ trạng thái, không thay thế bằng chứng từ GitHub, CI, test và ảnh chụp thực tế.

## Trạng thái hiện tại

- Repository: `chichute5500/Sindarealest-admin`
- Nhánh mục tiêu: `fix/liquid-glass-audit-2026-10-19`
- Phạm vi: rà soát/sửa giao diện web tĩnh, so sánh ảnh tham chiếu, kiểm thử hồi quy và lưu bằng chứng trước/sau.
- Production: `https://sindarealest2.pages.dev`
- Quy tắc: không deploy/merge Production; không sửa nhánh admin riêng `feature/admin-isolated-handoff-2026-10-20`; không sửa dữ liệu Production.
- Ảnh tham chiếu gốc (không ghi đè):
  - Sáng: [file_0000000017088207af45f5e6dd90cfa4.png](../static-web-reference/file_0000000017088207af45f5e6dd90cfa4.png)
  - Tối: [file_00000000fcb48207a23aeda23caa5eeb.png](../static-web-reference/file_00000000fcb48207a23aeda23caa5eeb.png)

## Cập nhật kiểm tra gần nhất — 2026-10-19/20 UTC

- Nhánh đang làm: `fix/liquid-glass-audit-2026-10-19`.
- Các commit quy trình ảnh trong lượt này: `746237efaf1fc5637019934fdb4fd90aeff4ef54` (đưa ảnh về đúng hai thư mục chuẩn tắc), `2297ea9fa4fffe37527b5e09bc832cfe705ff569` (bổ sung metadata viewport/đối chiếu vào manifest workflow), `d60fc6344520bb8e88d857d31fd830657adc5ee3`, `5280355ec9eb43f48c3a640ae425ba7d9b291295`, `dcd414163cd53876af6cb47d9d14efab1c86db7f`, `c33c77e330942d339b218dbbbfb81884137441d5` (tạo thư mục ảnh chuẩn tắc và manifest ghi đúng trạng thái hiện tại).
- `docs/website-screenshots/manifest.json` hiện ghi rõ baseline `BLOCKED`, end-of-work `NOT TESTED`, chưa có ảnh được xác minh. Không coi các tệp `.gitkeep` là screenshot.
- Đã truy cập thử URL Preview do người dùng cung cấp ở các route `/`, `/san-pham/sd2929`, `/sanpham/giaytay/sd2929` bằng trình đọc web chỉ đọc; cả ba trả về `login_required`. Đây không phải xác minh HTTP/browser hoàn chỉnh và không cung cấp screenshot. Không thử Production để thay thế.
- Workflow `.github/workflows/liquid-glass-visual-preview.yml` trước đây lưu ảnh theo `<stage>/<RUN_ID>/`; đã sửa hướng lưu sang đúng `<stage>/` và làm phong phú manifest. Workflow mới đang chờ/chạy trong GitHub Actions; chưa đánh dấu PASS cho commit mới cho đến khi có kết quả hoàn tất.
- Ảnh tham chiếu PNG vẫn chưa được mở/xem trực quan trong công cụ hiện có; trạng thái `UNVERIFIED`.
- Audit code xác nhận URL chi tiết hiện được tạo dạng `/san-pham/{SKU hoặc ID/slug}`, còn `popstate`/khởi tạo cũng chỉ nhận route đó. Chưa chuyển sang `/sanpham/{danh-mục}/{mã}`: cần nguồn dữ liệu thật và quy tắc SKU đã xác minh; nhiều bản ghi legacy có `sku: null` và `skuVerified: false`. Không tự tạo mapping.
- Chưa sửa HTML/CSS website công khai; các thay đổi hiện tại chỉ ở workflow/tài liệu ảnh. Không merge/deploy Production, không sửa nhánh admin.

## Cách tiếp quản — bắt buộc trước khi sửa

1. Đọc file này cùng `TASKS.md`, `TEST-RESULTS.md` và `DECISIONS.md`.
2. Xác minh nhánh và commit HEAD trực tiếp trên GitHub. Ghi lại SHA và thời gian bắt đầu phiên.
3. Kiểm tra diff và workflow runs kể từ commit được ghi trong hồ sơ.
4. Đối chiếu từng trạng thái với code/test/evidence; không tin trạng thái chỉ vì nó được ghi ở đây.
5. Không làm lại task PASS trừ khi code liên quan đã đổi, có lỗi hồi quy hoặc bằng chứng mới khiến kết quả cũ không còn hợp lệ.
6. Nếu task đang IN_PROGRESS, xác minh thay đổi hiện có và commit mới nhất trước khi tiếp quản; không ghi đè công việc chưa được hiểu.
7. Chỉ cập nhật hồ sơ bằng trạng thái có căn cứ. Không có bằng chứng thì dùng UNVERIFIED, NOT TESTED hoặc BLOCKED.

## Trạng thái khởi tạo đã biết

- Thư mục ảnh tham chiếu `docs/static-web-reference/` có README và hai ảnh PNG được GitHub Contents API liệt kê. README xác định ảnh đầu là mẫu mobile sáng, ảnh thứ hai là mẫu mobile tối.
- Việc xem trực quan từng ảnh bằng công cụ hiện tại **chưa được xác minh hoàn tất**; không tuyên bố đã phân tích pixel cho đến khi ảnh thực sự được hiển thị.
- Có đề cập workflow `.github/workflows/liquid-glass-visual-preview.yml` để chụp ảnh. Việc workflow chạy thành công, ảnh thật được tạo và commit chưa được xác minh trong hồ sơ này.
- Các thư mục/ảnh baseline và end-of-work: cần kiểm tra trực tiếp trên nhánh; không mặc định đã tồn tại.
- Trạng thái test giao diện hiện tại: UNVERIFIED cho đến khi xác minh commit, URL Preview, test logs và ảnh thực tế.

## Môi trường và giới hạn

- Ưu tiên GitHub Actions/Playwright để chạy kiểm thử; không phụ thuộc vào việc chạy Wrangler trên Android.
- Không giả định Preview có cùng bindings, secrets hoặc dữ liệu với Production.
- Không in secrets/token vào log, screenshot hoặc commit.
- Không dùng mock làm bằng chứng thành công của dịch vụ thật (đặc biệt Workers AI).
- Không thực hiện hành động có thể ghi/xóa dữ liệu thật.

## Cập nhật sau mỗi phiên

Khi kết thúc phiên làm việc, cập nhật:
- Commit SHA cuối và link commit.
- Task IDs đã hoàn tất/thay đổi trạng thái.
- Test vừa chạy, URL/commit/viewport, kết quả và link workflow/log.
- Ảnh mới được tạo và đường dẫn manifest.
- Lỗi còn lại, lý do BLOCKED và điều kiện để tiếp tục.
- Việc tiếp theo có thể thực hiện ngay (tối đa 3–5 mục, sắp xếp ưu tiên).

Không ghi “hoàn thành 100%” nếu còn FAIL, BLOCKED hoặc hạng mục bắt buộc chưa được kiểm thử. Không deploy Production.
