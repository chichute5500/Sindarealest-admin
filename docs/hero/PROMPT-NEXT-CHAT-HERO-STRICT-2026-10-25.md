# ACTIVE V14 CHECKPOINT — 2026-10-26

Use this checkpoint BEFORE the historical V11 instructions below. The project is NOT a new project.
- GitHub repo chichute5500/Sindarealest-admin; only work on feature/hero-v9-integrated-2026-10-25; PR #115 must remain Draft, do not merge or deploy Production.
- The latest verified isolated V14 Preview app code SHA is e8497d4f764110007e41fb4797728581d0ce569b; doc-only updates follow, so reverify live HEAD/CI.
- Isolated Preview: https://hero-v11-native-20261025.sindarealest-admin-preview.pages.dev/ (historic alias), immutable V14: https://82f400e8.sindarealest-admin-preview.pages.dev/; D1/R2 safety and live deployment run #40217731968 PASS.
- FULL VISUAL STATUS = FAIL, owner has not passed 95%. Do not mark complete from technical QA successes.
- Main technical check at SHA 723d47e0: source tests #40217448593 PASS, 14-viewport Chromium #40217452710 PASS, full integration #40217452804 PASS; source integrity protects Admin/order/payment/QR/D1/R2.
- Single clean authoritative HERO CSS style#sd-hero-component-authority; 392 legacy HERO selectors were removed. No !important patch piles. HTML text/CTA are real; original separate transparent PNG shoes; separate silk-waves.svg and V14 independent marble-shelf-v14.svg (no flattened composite).
- Pixel-alpha browser QA proves zero opaque shoe pixels over real description and CTA at widths 320/360/390/768/980/1280/1440 in both themes.
- Visual fail blockers: marble natural light/gold veins/stone-floor blending, silk realism, fine serif/font spacing and shoe-contact reflection; use Library main desktop reference, not the old no-red layout.
- Detailed source and precise unresolved items: docs/hero/HERO-STRICT-ACCEPTANCE-AND-HANDOFF-2026-10-25.md, section 7.
- Continue edits/capture/visual comparison until EACH essential region >95% AND owner approves. No fake score or image cheating.

---
# PROMPT NEXT CHAT — SINDAREALEST HERO (STRICT 95%+; CURRENTLY VISUAL FAIL)

Tiếp tục trực tiếp dự án SinDarealest tại GitHub `chichute5500/Sindarealest-admin`. **Không khởi tạo dự án mới, không hỏi lại lịch sử, không lấy CI PASS làm nghiệm thu giao diện.** Đọc đầy đủ tài liệu **`docs/hero/HERO-STRICT-ACCEPTANCE-AND-HANDOFF-2026-10-25.md`** trên nhánh `feature/hero-v9-integrated-2026-10-25`. Xác minh HEAD PR #115 và trạng thái Preview/Actions trước khi thay đổi code.

**ẢNH MẪU Ở ĐÂU:** ChatGPT Library > `/SinDarealest/HERO-REFERENCE/`: `REFERENCE-DESKTOP-luxury-red-text.png` = mẫu thiết kế CHÍNH (chữ Đẳng cấp đỏ, giày bên phải, lụa xanh và bệ hòa nền); `REFERENCE-LAYOUT-PC-MOBILE-older-no-red.png` = bố cục PC/mobile cũ chỉ tham khảo, KHÔNG được ghi đè màu chữ của ảnh chính. Ảnh thực tế FAIL: `CURRENT-FAIL-PC-1440-V11.png` và `CURRENT-FAIL-MOBILE-390-V11.png`. Truy cập bằng Files Library; **không giả định /mnt/data của chat cũ vẫn còn**. Ảnh mẫu KHÔNG được dùng làm ảnh HERO trên web.

**TRẠNG THÁI HIỆN TẠI:** V11.2 HTML/CSS thật, CI 14/14 + tích hợp 3/3 + Preview đã PASS kỹ thuật, nhưng **NGHIỆM THU HÌNH ẢNH = FAIL**. Chưa giống ảnh mẫu 95%, tuyệt đối không ghi hoàn thành. PR #115 Draft; không merge, không Production. Preview cách ly `https://hero-v11-native-20261025.sindarealest-admin-preview.pages.dev/`. Snapshot code trước tài liệu: `2b13bc9177cf764d1a3e51d72d5e44699baa2df0`; xác minh SHA mới nhất trong GitHub.

**YÊU CẦU TỐI CAO:** 
(1) Dựng chữ, font, màu đỏ, mô tả, nút bằng HTML/CSS THẬT; giày PNG alpha riêng; bệ và nền decorative SVG/CSS riêng. CẤM ảnh banner nguyên khối có sẵn chữ/giày/bệ/nút, nút vô hình đè lên ảnh, base64/canvas/embedded screenshot, gian lận hình ảnh hoặc gian lận điểm số.
(2) **CẤM chồng CSS vá nối**: trước tiên kiểm toán và gom hiệu lực HERO V2–V11 thành một bộ CSS có thẩm quyền, không ảnh hưởng các màn Admin/Storefront đã pass, kiểm tra specificity và computed CSS.
(3) **MỖI LẦN chỉnh code: thật sự render Chromium và chụp PC/mobile ở 320/360/390/768/980/1280/1440, sáng/tối, đối chiếu ảnh mẫu**; sửa lại khi chưa đạt. Đánh giá riêng chữ/font; nền lụa/ánh sáng; bệ hòa nền/bóng tiếp xúc không lơ lửng; tỷ lệ giày; bố cục/nút, kể cả mobile ngang chữ trái/giày phải. Bất kỳ vùng thiết yếu nào không đạt mục tiêu >95% thì ghi FAIL. Không tự chế % nếu chưa có đo lường minh bạch và đánh giá thị giác.
(4) Chỉ khi QA kỹ thuật + nghiệm thu thị giác đều đạt mới cho phép đề xuất owner xem. Đến khi người dùng duyệt thì giữ PR Draft; Production không đụng.

**HÀNH ĐỘNG NGAY:** đọc 4 ảnh Library, kiểm toán CSS hiện tại, bắt đầu refactor sạch và cải thiện font/nền/bệ dựa trên ảnh mẫu, lấy ảnh chụp trình duyệt, tự phát hiện FAIL và tiếp tục sửa, cập nhật commit và tài liệu QA. Không chỉ báo cáo suông. Nếu không hoàn thiện trong lượt này, commit checkpoint trung thực, ảnh chụp, những sai lệch còn lại và prompt cập nhật.