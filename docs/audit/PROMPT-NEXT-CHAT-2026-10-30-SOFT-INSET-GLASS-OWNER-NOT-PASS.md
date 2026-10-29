> **Cập nhật 2026-10-30:** Owner đã PASS bản Preview cuối cùng và cho phép đưa PR #152 lên `main`. Trạng thái “chưa PASS/không merge” bên dưới là lịch sử tại thời điểm bàn giao, không còn là trạng thái hiện tại.

# PROMPT CHAT MỚI — TIẾP TỤC TRỰC TIẾP SINDAREALEST LIQUID GLASS (OWNER CHƯA PASS)

Tiếp tục trực tiếp dự án **SinDarealest** trên GitHub. Đây là task đang dở, **không bắt đầu lại**, không hỏi lại lịch sử đã có trong docs, không chỉ viết CSS mẫu/prompt, không dựng demo. Owner vừa nghiệm thu ảnh mới nhất và xác nhận rõ: **CHƯA PASS**.

**Repository:** `chichute5500/Sindarealest-admin`  
**Nhánh DUY NHẤT được sửa:** `feat/soft-neumorphic-controls-2026-10-29`  
**PR #152:** https://github.com/chichute5500/Sindarealest-admin/pull/152 — **OPEN, DRAFT**, base là `feat/zalo-customer-login-2026-10-29`, **chưa merge Main**.  
**Code HEAD trước lần cập nhật handoff docs này:** `a9ae91105d4178ffb636d88155f604d6d2103cad`. Hai commit tạo docs có thể làm HEAD mới hơn, phải fetch HEAD thật mới nhất rồi đối chiếu; không tự reset về SHA cũ.  
**Preview immutable đã kiểm thử code này:** https://57d129a5.sindarealest-admin-preview.pages.dev/  
**Alias branch Preview:** https://soft-neumorphism-1029.sindarealest-admin-preview.pages.dev/  
**CI code SHA:** run #40918071404 PASS; **isolated Preview + Playwright 8/8:** run #40918071445 PASS — **CHỈ LÀ PASS KỸ THUẬT, KHÔNG PHẢI OWNER VISUAL PASS**.

## BẮT BUỘC ĐỌC TRƯỚC KHI SỬA

1. `docs/audit/HANDOFF-LATEST-2026-10-30-SOFT-INSET-GLASS-OWNER-NOT-PASS.md`
2. `docs/audit/PROMPT-NEXT-CHAT-2026-10-30-SOFT-INSET-GLASS-OWNER-NOT-PASS.md` (file này)
3. `docs/auth/CUSTOMER-LOGIN-RELEASE-GATES-2026-10-29.md` để không phá khóa auth/Preview binding
4. Đọc thật `public/index.html`, `public/customer-auth.css`, `.github/workflows/qa-soft-glass-controls.yml`, các contract/Playwright tests có liên quan.

Hai ảnh Owner dùng đối chiếu: **`84896.jpg`** (mẫu vật liệu kính 3D mềm thật) và **`84903.jpg`** (Preview gần nhất Owner vẫn chê). Nếu ảnh chưa hiện trong chat mới, dùng ảnh đính kèm mới của Owner hoặc xin hai ảnh khi cần pixel-by-pixel; vẫn tự kiểm tra source trước, không được ngừng việc vì thiếu ảnh.

## VẤN ĐỀ PHẢI SỬA

Bản cũ từng neon-outlined rồi chuyển thành soft-plastic neumorphism. Bản mới hơn đã đổi gradient radial directional nhưng **Owner vẫn CHƯA PASS**. **Không** tăng bóng `inset`, `blur`, opacity, thêm viền/lớp đồng tâm hoặc tô đậm highlight để đánh lừa cảm giác vật liệu.

Cần làm **đúng vật liệu Soft Inset 3D Glass**:
- Trung tâm bán trong, mịn, nhẹ, gần nền xanh nhạt; không đệm cao su/nhựa opaque hoặc phồng.
- Mép bo cong liên tục, có độ dày quang học **nhưng chỉ một mép**, tránh 2–3 vòng outline rõ.
- Phản xạ **hồng tím rất nhạt ở trên trái, xanh lam ở phải, xanh ngọc ở dưới**, loang mềm theo hướng sáng, không chạy nguyên vòng neon.
- Contact shadow ngắn, ambient shadow rất nhẹ, inner recess nông nhưng đủ chiều sâu. **Không tăng mọi bóng cùng lúc**.
- Giữ nền gợn sóng Owner PASS nguyên vẹn. Giữ nguyên layout, kích thước, icon, logo, badge, URL, sản phẩm, tìm kiếm/lọc, size, cart, checkout QR, Google/account và theme.
- Khi chạm giữ: mép hạ ~1px, contact giảm, recess tăng, phản xạ thay đổi; khi thả phục hồi êm 200–280ms, không kẹt, không chỉ scale. Mobile touch emulation bắt buộc, Android thật chỉ xác nhận nếu thực sự có thiết bị.

## PHẠM VI THỰC HIỆN

**Ưu tiên 1 — CATEGORY CHIPS:** audit rule `#products .filter-pill`, trạng thái `active/selected/data-sd-glass-press`, pseudo `::after`, `--sd-3d-rim`, `--sd-3d-surface`, `--sd-3d-shadow`. Tạo screenshot crop cùng khu vực và so trực tiếp ảnh mẫu. Tinh chỉnh hình khối/độ cong trước khi áp dụng toàn hệ.

**Ưu tiên 2 — SEARCH:** `#products .search-field`, biến thể lens mềm trong hơn, giảm trắng/đục, mép không nhiều đường đồng tâm; focus keyboard vẫn rõ.

**Ưu tiên 3 — HEADER/ICON/BOTTOM NAV:** icon tròn có optical depth phù hợp, tray bottom nav riêng và bốn nút bên trong không cộng dồn bóng; duy trì safe-area và hiệu năng Android.

**Ưu tiên 4 — ĐỒNG BỘ CONTROL KHÁC:** `#productOverlay .sd-product-option-chip`, CTA thêm giỏ xanh/đặt ngay cam, số lượng, checkout, account và login, chỉ lớp trình bày; giữ chức năng và màu trạng thái.

Không thêm CSS override mới ở cuối để chồng rule cũ. Hợp nhất vào token + selector hiện có, kiểm tra CSS specificity, `background-clip`, layering, blur, opacity, pseudo, `overflow`. Không phá cấu trúc style-last được `scripts/audit-css-cascade.mjs` kiểm tra.

## QUY TRÌNH BẮT BUỘC

1. Fetch repo, branch HEAD, PR, CI và code hiện thực, đọc tất cả handoff; nêu ngắn nguyên nhân gốc trước khi sửa.
2. Sửa trực tiếp **chỉ nhánh này**; không thay các phần Owner PASS/LOCKED.
3. Chạy `npm run check`, `npm test`, `node --test tests/soft-glass-controls-contract.test.mjs` và test cần thiết khác.
4. Dùng workflow `qa-soft-glass-controls.yml` deploy **chỉ** `sindarealest-admin-preview` sau read-only isolation checks; không Production DB/R2 hoặc merge Main.
5. Chụp BEFORE/AFTER **cùng viewport/cùng scroll và vùng crop** của chip, search, icon tròn và bottom nav, Light/Dark. Screenshot normal/pressed/released. Kiểm thử 360×800, 390×844, 768×1024, 1440×900 và touchStart/touchEnd/cancel/scroll, horizontal overflow và FPS/blur khi có thể.
6. **Không tuyên bố 100% hoặc Owner PASS** dựa vào CI 8/8. Nếu ảnh vẫn nhựa/đục/viền vòng thì tiếp tục sửa, không kết thúc bằng báo cáo thành tích.

## BÀN GIAO CHO OWNER SAU KHI SỬA

- Branch + SHA trước/sau + danh sách file sửa.
- Link **Preview immutable mới** (khác build `57d129a5` khi có code thay đổi) và link PR #152 DRAFT.
- Ảnh ghép trước/sau cùng cảnh, có crop chip/search/icon/nav sáng/tối.
- CI, Browser QA, touch emulation, Android thật (nếu chưa test thật, ghi rõ), vấn đề FAIL còn lại.
- **DỪNG ở Preview chờ chủ dự án xác nhận PASS, tuyệt đối không tự merge Main.**

**BẮT ĐẦU NGAY bằng đọc hai file handoff và kiểm tra GitHub HEAD; sau đó trực tiếp xử lý hình khối Soft Inset Glass, không trả lại prompt thay cho việc sửa.**
