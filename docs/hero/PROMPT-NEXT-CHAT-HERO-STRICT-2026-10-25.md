# V18 VERIFIED — STRICT CONTINUATION, VISUAL FAIL — 2026-10-26

**Mandatory:** Read `docs/hero/HERO-STRICT-ACCEPTANCE-AND-HANDOFF-2026-10-25.md` **section 9**, then resume DIRECTLY without repeating already verified work. This message supersedes older V17 status sections below.

- Repo `chichute5500/Sindarealest-admin`; only writable branch `feature/hero-v9-integrated-2026-10-25`; PR #115 DRAFT; NO merge / Production / shared D1/R2; nothing changed in accepted Admin/Storefront.
- Exact tested V18 **source/CI SHA** `e5a3fdc4ec163a8459dd3bbef00c5f222e95db70`. Documentation-only checkpoint then commit `395f35d54aa0479913ade897af22af89cc39f486`. Reconfirm GitHub PR head. Chromium [#40223012421 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40223012421), 14 actual screenshots + JSON [artifact 12610202195](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40223012421/artifacts/12610202195), Full-site integration [#40223012433 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40223012433), source validation [#40223008842 PASS](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40223008842).
- **Latest strict image comparison:** reference original in ChatGPT Library `/SinDarealest/HERO-REFERENCE/REFERENCE-DESKTOP-luxury-red-text.png`. Real desktop hero Chromium capture V18 overall **SSIM .6233**, shoes+stage .3537, marble .4524, upper satin .7858, floor .7941; every essential region below .950. **VISUAL FAIL, NOT APPROVED.**
- V18 actually improved owner PNG relative shoe geometry by using two **complementary clipped displays of the SAME unchanged 1200x1600 transparent source**. Correct split enabled 761–850px tablet and ≥1101px PC, **NOT at 980px because browser captured shoe floating**. Mobile 320–390 keeps original paired shoes. Real Chromium 14/14 QA covers both alpha layers, 0 shoe pixel overlap on text/CTA, keyboard CTA, no overflow. Do not break this passing technical behavior or flatten artwork.
- Failed V19 extra-dark blue marble after true screenshot: SSIM worsened overall .6233→.6199 and marble .4524→.4369; **REVERTED**. Earlier dark navy photographic standalone WebP and spaghetti-gold vector trial also rejected. Existing silk and marble still far too vector-like for natural photoreal target.
- No V18 Preview deploy; stable isolated Preview still earlier V14. Visual FAIL prevents merge and no Production ever.
- Next safe useful task: genuinely improve independent photoreal marble+gold vein material and flowing satin (not full baked HERO, no reference screenshot used as site background), inspect shoes grounding across all breakpoints, adjust native Didone type if measured, run ALL 14 Chromium screenshots each edit, compute SSIM per critical region against approved Library original and visually inspect, revert failures, update same authoritative CSS not new `!important` stacks. No 95% or approval assertion without evidence and owner PASS.

---

# V17 exact strict visual continuation — 2026-10-26, VISUAL FAIL

Before doing any more implementation, read `docs/hero/HERO-STRICT-ACCEPTANCE-AND-HANDOFF-2026-10-25.md`, especially **section 8**. Do NOT repeat historical V14/V15/V16 fixes already tested or falsely pass the design.

**Facts:** Repo `chichute5500/Sindarealest-admin`; ONLY branch `feature/hero-v9-integrated-2026-10-25`; PR #115 DRAFT, NO MERGE, NO Production, NO unrelated Admin or accepted Storefront changes. V17 last full code/QA SHA `ff901d333983ea6c35f392e2b6948e212aa83e3e`. Subsequent docs SHA changes do not change app. Native Chromium [run #40220877828](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220877828) PASS, 14 actual photos [artifact 12608909260](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220877828/artifacts/12608909260). Protected integration [run #40220877862](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40220877862) PASS. Exact source original shoe image immutable. **V17 HAS NOT BEEN DEPLOYED TO PREVIEW**; existing stable Preview remains V14. **Visual acceptance FAIL**.

**Real SSIM after geometry normalization** (owner master 1779×884 resized to Chromium 1380×677, same crop): heading .599, upper silk .787, lower silk/floor .794, shoes+stage .328, lower marble .418, CTA .651, overall .615. This is NOT 95%, and every core region fails. Honest comparison, not fabricated percentage or functional CI PASS interpreted as visual pass. Existing isolated SVG stage remains too pale/simple/vector-based; golden veins and satin fold highlights not photorealistic; owner's original paired-shoe left shoe relative top is substantially lower than in the rendered target, cannot fix both shoes with a global transform. Original preserved standalone WebP marble is a dark navy platter, tested in actual browser and **rejected**; do not reuse as an alleged pale stone. V15 squiggly veins and uniform vector ribbons were rejected. Desktop slab height compression V17 improves floor but not required overall.

**Next actions:** Truly redesign independently layered silk and gold-veined light marble and relative shoe presentation WITHOUT full banner image, embedded markup as image, fake image CTA, altered owner PNG bytes or CSS `!important` patch stacks. Keep live 3-line h1, descriptive paragraph and clickable native #products CTA. Run actual Chromium at 320, 360, 390, 768, 980, 1280, 1440 × light/dark; download its 14 real screenshots, compare to untouched original master at matched viewport/crop and save named per-region SSIM, then visual self-audit and iterate. Maintain separate technical PASS vs visual FAIL and only propose owner approval when **EVERY** key region >.95 and explicitly visually verified. Keep PR Draft, no Production or isolated Preview deploy except after separate D1/R2 guard. Do not ask user to re-explain their rules. Read more history below.

---

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