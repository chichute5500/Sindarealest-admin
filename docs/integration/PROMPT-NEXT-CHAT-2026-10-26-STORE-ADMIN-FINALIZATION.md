> **CHECKPOINT MỚI NHẤT (được cập nhật sau 7ef00dce, 26/10/2026):** Vui lòng mở [`docs/integration/HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md`](https://github.com/chichute5500/Sindarealest-admin/blob/integration/storefront-locked-on-main-2026-10-26/docs/integration/HANDOFF-LATEST-2026-10-26-THEME-TWO-PHASE.md) và [PROMPT MỚI](https://github.com/chichute5500/Sindarealest-admin/blob/integration/storefront-locked-on-main-2026-10-26/docs/integration/PROMPT-NEXT-CHAT-2026-10-26-THEME-TWO-PHASE.md) trước. Các kết luận PASS/FAIL, SHA `a4627e5` hoặc `63806aa` bên dưới chỉ là lịch sử; hiện HEAD code `7ef00dce` có Chromium theme FAIL. PR #118 vẫn DRAFT. Không dùng nội dung dưới để tuyên bố release-ready.

> **BỔ SUNG QUAN TRỌNG SAU LẦN KIỂM TRA QA 26/10/2026:** HEAD trước commit tài liệu này là `63806aae144c9460287f1c637648adf684ce61ab` (thay đổi **DUY NHẤT script kiểm thử**, mã giao diện vẫn giống source QA PASS `a4627e5`). [Isolated Preview run #40296591223](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296591223) hiện **FAIL chỉ ở Chromium theme regression**: nav tuy có transition CSS `0.22s` nhưng đôi khi **BẮT ĐẦU muộn** ở trình duyệt tải nặng; assertion `Navigation still changing after 300ms`. Job deploy D1/R2 và E2E Preview order/Admin **PASS**, [CI #40296591264](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296591264) và [CI PR #40296598817](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296598817) **PASS**. Run tài liệu [#40296121132](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40296121132) FAIL do test Welcome cold-font giả định chữ phải còn nhìn thấy dù Welcome đã tự đóng hợp lệ; test này được sửa ở commit `63806aa`, đã qua bước font ở run sau. **CHƯA nghiệm thu hoàn toàn cảm nhận theme trên máy Owner; chat kế tiếp cần đo frame timing để tách trễ của event/render/painting khỏi duration CSS, KHÔNG chỉ tăng timer/nới ngưỡng test.** Các kết quả PASS `a4627e5` bên dưới là baseline thực, không thay thế trạng thái QA mới tại HEAD.

# PROMPT NEXT CHAT — SINDAREALEST: BÀN GIAO MỚI NHẤT 26/10/2026
**Tiếp tục dự án hiện hữu, không tạo lại.** Người dùng đã yêu cầu cập nhật file + prompt để mở chat mới. Không đòi gửi lại toàn bộ lịch sử.

## BẮT BUỘC ĐỌC & XÁC MINH GITHUB
Repository: `chichute5500/Sindarealest-admin`.
Nhánh DUY NHẤT có quyền tiếp tục thay đổi: `integration/storefront-locked-on-main-2026-10-26`.
PR #118: https://github.com/chichute5500/Sindarealest-admin/pull/118 — ở thời điểm bàn giao: **OPEN, DRAFT, NOT MERGED, mergeable true**.
Production/main lúc kiểm tra: `db40af63965678598b0ebd3f3fe63865849dcf2e`. Isolated Preview: https://integration-storefront-locke.sindarealest-admin-preview.pages.dev/
**SOURCE SHA ĐÃ PASS MỚI NHẤT:** `a4627e55da5420522ba5461145ec522dc826c625` (`a4627e5`). HEAD có thể tăng do commit tài liệu. Không mặc định SHA này còn là HEAD.

**ĐỌC ĐẦY ĐỦ THEO THỨ TỰ:**
1. `docs/integration/HANDOFF-LATEST-2026-10-26-WELCOME-THEME-MATERIAL.md` — CHECKPOINT MỚI NHẤT.
2. `docs/integration/HANDOFF-STORE-ADMIN-OWNER-ACCEPTANCE-2026-10-26.md` — hồ sơ trước; đoạn không khớp latest là lịch sử.
3. `docs/integration/QA-DISPOSABLE-CHECKOUT-RELEASE-GATE-2026-10-26.md` — giới hạn thanh toán và isolated D1.
4. `docs/integration/STOREFRONT-MAIN-OWNER-PASS-STAGING-2026-10-26.md` — baseline UI Owner PASS.
5. Nếu người dùng yêu cầu chỉnh giao diện: `public/index.html`, `public/material-gallery.css`, `public/material-gallery.js`, `scripts/qa-storefront-theme-material.mjs`, `tests/welcome-owner-approved.test.mjs`, `tests/material-gallery-theme-atomic.test.mjs`.

Sử dụng GitHub connector để `get_pr_info`, đọc branch/main và GitHub Actions mới nhất; **diff từ SHA code PASS đến HEAD**. Nếu chỉ cập nhật docs, không được tự chạy lại những công việc đã được Owner PASS.

## CẬP NHẬT NGHIỆM THU GẦN NHẤT
1. **Welcome lỗi ngay lúc BẮT ĐẦU**, ảnh user cho thấy dấu tiếng Việt biến dạng rồi mới hoàn thiện, KHÔNG phải lỗi khi click thoát Welcome. Đã fix preload Noto Serif/Sans + ẩn tạm chữ đến khi `document.fonts.load/check` xác nhận, bỏ timer 1200ms mở glyph sai; nút Vào cửa hàng vẫn sẵn sàng. Bài Chromium cố tình làm chậm 2 font requests 600ms trên PC/Mobile **2/2 PASS**. Giữ nguyên bố cục, nội dung, timeout Welcome Owner PASS.
2. **Theme Light/Dark có cảm giác LAG**, không phải người dùng muốn kéo dài animation: bỏ forced reflow `document.body.offsetHeight`, không animate các shadow/blur/filter của hàng loạt catalog item; chỉ chuyển opacity nền và màu navbar **220ms**. Chromium PC/Mobile Light→Dark→Light **PASS**; cảm nhận thiết bị thật của user chưa được xác nhận. Các bản 400ms/460ms là LỊCH SỬ.
3. **“Chất liệu cao cấp”**: 12 ảnh thật có sẵn tại `public/images/crocodile-leather/`, manifest `gallery.json`. Đổi mỗi **1500ms**, crossfade **580ms**, không điều khiển; bỏ lớp phủ trắng/tối khỏi ảnh thật, chỉ để shadow phía chữ. Hướng dẫn upload thêm có trong README.
4. **Welcome khi THOÁT** cũng đã sửa ở lượt trước: không lộ half-layout; text/logo biến mất trước nền, 2/2 PC/Mobile PASS. ĐỪNG nhầm vấn đề bắt đầu với vấn đề kết thúc.
5. **HERO code-only, Welcome design, Gallery/fullscreen, Liquid Glass, 6 ô dịch vụ, watermark, bay CẢ sản phẩm vào giỏ, Admin**: các thiết kế đã được Owner PASS và KHÓA. Không tự sửa hoặc xét duyệt lại.

## EVIDENCE ĐÚNG SHA
- Isolated full Preview QA 3/3 jobs **SUCCESS**: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290073747
- 8/8 browser visual, 4/4 checkout disposable, read-only theme/mosaic, Welcome cold-font PC/Mobile 2/2, Welcome exit PC/Mobile 2/2, isolated remote Preview D1 Order/Admin fixture cleanup PASS.
- CI **SUCCESS**: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290073738 và https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290079433
- Admin Preview **SUCCESS**: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290079434
- Admin-specific isolated workflow **SKIPPED do không đúng nhánh**, expected, không phải FAIL.
- Screenshot/JSON: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40290073747/artifacts/12636650251; hai screenshot cold-start Welcome PC/Mobile đã kiểm tra hình thực tế.
- Trước đó E2E ghi D1 Preview order/Admin 22/22 PASS: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40279420747, cleanupVerified=true, productionWrites=0. QR/ledger/refund/payment chỉ thử SQLite disposable; **KHÔNG bank transfer thật**.
- Các runs FAIL trung gian ở SHA cũ là lịch sử đã được sửa/retest; KHÔNG kết luận FAIL nếu HEAD `a4627e5` đang SUCCESS.

## QUY TẮC TIẾP TỤC
- **Chờ nhiệm vụ tiếp theo từ Owner** hoặc thực hiện ngay khi Owner giao; không hỏi lại lịch sử, không làm lại những gì đã PASS.
- Nếu có bug mới thật: xác nhận bằng ảnh/Chromium, sửa đúng scope trong branch integration, kiểm HEAD lease, rerun test liên quan + Preview, lưu screenshot, cập nhật tài liệu/PR. Có thể song song các lượt đọc/QA, nhưng không hai luồng ghi lên cùng tệp.
- **KHÔNG merge PR #118, KHÔNG deploy Production, KHÔNG ghi Production D1/R2, KHÔNG fake bank transfers** khi chưa có lệnh cho phép triển khai rõ ràng của Owner. Preview PASS không đồng nghĩa quyền merge.
- KHÔNG nói Production 100% trước owner final acceptance, merge/deploy được phép và smoke Production. Người dùng ưu tiên hiệu quả, hành động thực tế và chứng cứ, không hỏi vặt và không báo % vô căn cứ.
- Báo trạng thái ngắn, nêu SHA, run IDs và phân biệt kỹ thuật/Owner/Production; cập nhật GitHub docs trước khi bàn giao chat tiếp theo.
