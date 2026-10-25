> **FINAL QA ROUND — 25/10/2026:** Admin source SHA `3f65965c6015f0c4f97c17aa06022416875e552b`, **9/9 GitHub workflows SUCCESS** (Validate ×2, Admin Preview Playwright, isolated Playwright, Preview Deploy, diagnostics, 12-screen read-only, security/keyboard smoke, isolated synthetic D1 QA). Remote QA [#40184464715](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40184464715) verified actual Product/Order/Warranty/Backup API & D1 readback, **14 × 12 = 168 screen captures**, **two independent zero-run-owned cleanup checks**, artifact #12596180300. Read-only visual #40184464611 artifact #12595746276. Cloudflare alias deploy source SHA matched. Not yet 100% OWNER ACCEPTED: 0/12 same-data screen signoffs, no actual remote R2 end-to-end cleanup, no destructive Restore on an independent disposable remote D1, no real money bank statement approval, full accessibility/pentest/load audit incomplete. Last observed Storefront Preview shares Production DB/ORIGINALS — DO NOT perform Storefront writes or integrate. Only Admin branch PR #111 writable; main/PR #108 untouched. Audit: [PARALLEL-ACCEPTANCE-2026-10-25.md](../../admin-audit/PARALLEL-ACCEPTANCE-2026-10-25.md).

---

> **LIVE QA ĐA LUỒNG 2026-10-25** — source commit `3cbfc808fe0a7c9fde25c36ca6aab350ff3a42ac` đã đạt **5/5 CI PASS**: Validate #40184069669/#40184065903, Admin Preview Playwright #40184069661, isolated Playwright #40184069682, diagnostic #40184065876. Mã sửa tranh chấp cập nhật giá/trạng thái bằng parent-order snapshot trước mọi item write, SQLite thực tế chặn stale reprice; fixture thanh toán đã được sửa mà không nới lỏng điều kiện nghiệp vụ. Remote Admin D1 QA synthetic #40182629881 PASS 14 × 12 màn hình, cleanup hai lần; security keyboard #40183492321 PASS; Preview R2/D1 isolation #40183717239 và remote D1 schema #40183717244 PASS. Đang triển khai/kiểm tra lại đúng code mới trên Admin Preview; không ghi Production/Storefront, không merge. **0/12 OWNER_ACCEPTED**, 32/100 là điểm trọng số bằng chứng, KHÔNG phải tỷ lệ hoàn thành. Báo cáo: [PARALLEL-ACCEPTANCE-2026-10-25.md](../../admin-audit/PARALLEL-ACCEPTANCE-2026-10-25.md).

---

> **BỔ SUNG NGHIỆM THU ĐỘC LẬP (Admin order race, 25/10/2026):** code/test SHA `030a39928204a5b091b27880adf645f57e343593`, commit sửa thêm điều kiện kiểm tra snapshot dòng hàng khi thao tác lưu giá không thay đổi. Test D1-contract bằng SQLite in-memory mô phỏng người khác đổi giá trước `DB.batch`; bản lưu cũ phải HTTP 409, giữ giá/tổng tiền mới, không tạo audit thành công giả. CI tại mốc cập nhật: 6/6 SUCCESS (xem báo cáo cập nhật), không coi job chưa kết thúc là PASS. Các blocker Cloudflare vẫn giữ nguyên; không deploy/merge/tích hợp. [Báo cáo](../../admin-audit/INDEPENDENT-QA-2026-10-25.md).

---

> **Nghiệm thu độc lập bổ sung 25/10/2026:** code HEAD `27a145253c71bc887b536611e9fece3ddd51779d`. Sửa API thanh toán `30b193a640dd6bad826265bf3b982b05558616cc` và cấp bảo hành `27a145253c71bc887b536611e9fece3ddd51779d`; các nguồn kiểm thử mới đã **6/6 SUCCESS**. Đã kiểm tra ZIP evidence, 12 màn hình đủ ảnh ở 390×844 light/dark và 1280×800 light, đúng kích thước và duy nhất trong mỗi bộ; vẫn **0/12 owner accepted**. Cloudflare Preview deploy metadata vẫn là `c64e07fca248dc527361c4d018dc26c11f5b3570`, KHÔNG chứa backend mới. Đọc [INDEPENDENT-QA-2026-10-25.md](../../admin-audit/INDEPENDENT-QA-2026-10-25.md). Chỉ sửa nhánh Admin, không merge/tích hợp.

---

> **CẬP NHẬT BỔ SUNG 25/10/2026 — RESTORE AUDIT ROUND 2:** nguồn mã Admin đã tiến lên `181e1ff3e843c9984ce5889095e3913290a038a7` qua hai commit sửa dữ liệu Restore: `e047395ee5f4823deec22d4a1f721a0ef6a0ebc2` (chặn kiểu số sai) và `181e1ff3e843c9984ce5889095e3913290a038a7` (chặn số tiền hoàn vượt tiền đã nhận). Các workflow kết quả chính xác và giới hạn nghiệm thu xem [RESTORE-HARDENING-2026-10-25.md](../../admin-audit/RESTORE-HARDENING-2026-10-25.md). 0/12 visual OWNER_ACCEPTED; các blocker Cloudflare vẫn còn. Chưa deploy backend mới, chưa tích hợp/merge. Luôn xác minh HEAD mới sau commit tài liệu.

---

# PROMPT NEXT CHAT — SINDAREALEST ADMIN (CẬP NHẬT 2026-10-25)

Đây là công việc đang tiếp tục trên GitHub, KHÔNG phải dự án mới. Không bắt người dùng kể lại lịch sử. Hãy trực tiếp mở repository, đối chiếu trạng thái hiện tại, sửa/kiểm tra các phần còn thiếu trên đúng nhánh Admin và chạy kiểm thử có bằng chứng. Được phép thực hiện nhiều hướng rà soát độc lập song song; không tuyên bố đang chạy ngầm nếu chưa thực hiện tool.

## 1. PHẠM VI VÀ QUY TẮC KHÔNG ĐƯỢC VI PHẠM

- Repo: chichute5500/Sindarealest-admin.
- Chỉ được ghi nhánh: feature/admin-isolated-handoff-2026-10-20, PR #111 hiện OPEN, chưa merge.
- Website thử nghiệm: nhánh fix/liquid-glass-audit-2026-10-19, PR #108, CHỈ ĐỌC cho mục đích đối chiếu. Người dùng CHƯA CHO TÍCH HỢP.
- KHÔNG merge/rebase/cherry-pick giữa hai nhánh; KHÔNG sửa main, Production, DNS, secrets, dữ liệu thật, Cloudflare Production, đơn hàng hay giao dịch tiền thật. KHÔNG deploy chung.
- Có thể sửa Admin code/tests/workflows/docs an toàn trên feature branch. Mọi deploy Admin Preview nếu thật sự cần phải được kiểm tra identity D1/R2, project và Preview-only; không tự dùng tài nguyên Production; không deploy website thử nghiệm.
- Không tự điều chỉnh logo hay nhận diện SinDarealest: giữ nguyên logo SD nguyên bản, vàng kim, không CSS filter đổi xanh. Đảm bảo mobile/PC và light/dark.
- Người dùng đã cho phép test bằng dữ liệu ảo CHỈ trong tài nguyên Preview cách ly, cần gắn nhãn run-owned, ghi log và xác minh cleanup 2 lần. Chừng nào binding thiếu/an toàn chưa được chứng minh, không chạy test ghi từ xa.

## 2. CHECKPOINT MỚI NHẤT ĐƯỢC XÁC MINH TRƯỚC COMMIT BÀN GIAO

- 2026-10-25, Admin code/tests/docs HEAD trước handoff: 6b10cd53ad591521ee719aefd015898bfeb5d36f.
- Đúng HEAD trên: 4/4 GitHub Actions SUCCESS: Validate #40170302058 và #40170299770; Admin Preview Playwright #40170302063; Admin isolated Preview Playwright #40170302057. Các workflow kiểm tra code không tương đương chạy backend mới trên bản deploy thật.
- PR #111 OPEN/unmerged. Main ref không đổi: 227622d3e3b7c75724ffa1775b193da71089269a. GitHub PR base.sha có thể khác main ref; không tự suy ra là Production đã đổi.
- PR #108 OPEN/unmerged, HEAD kiểm tra gần nhất a72e6d4344b963a50057480ddb1d9f7d57d653ce, có thể tiếp tục thay đổi từ phía làm web.
- Deployed Admin Preview ứng dụng mới nhất được chứng minh bởi Deploy workflow #40165551327 SUCCESS ở source c64e07fca248dc527361c4d018dc26c11f5b3570. Các commit backend sau c64e07f đang trên nhánh và đã được test nhưng CHƯA chứng minh được đã deploy: tuyệt đối phân biệt source SHA / deployed SHA.
- URL: https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/
- Sau khi ghi bàn giao, HEAD sẽ thay đổi bởi commit docs-only: BẮT BUỘC fetch live HEAD và CI mới trước khi làm tiếp.

## 3. NHỮNG VIỆC ĐÃ LÀM / ĐÃ PASS

A. Giao diện: sửa khe chân modal và mobile tabs ở 320–390px; kiểm tra seam 0px; sửa câu trạng thái Customers; chụp 72 ảnh read-only và 72 ảnh synthetic, 320x640 / 390x844 / 1280x800, light/dark trên SHA 9fde886e4be11ab680fa3f6679695721d772a3ef; kiểm tra cleanup run-owned 2 lần, 0 row còn lại trong 7 bảng. Workflow nguồn #40162834106 và #40162834084 đã PASS. KHÔNG xem screenshot là đã đạt chuẩn giao diện thiết kế.
B. Logo: bỏ CSS filter grayscale/sepia/hue-rotate gây màu xanh, giữ ảnh logo chính thức; sửa chữ thương hiệu về vàng. Commit c64e07f; deployed Admin Preview #40165551327 PASS, checks light/dark/mobile/desktop PASS.
C. API/Auth: kiểm tra toàn bộ 22 module Admin, 31 HTTP handler có xác thực runtime, 401 với khách chưa đăng nhập và 403 với session cross-site TRƯỚC KHI đụng D1; 3 handler phương thức không hỗ trợ trả 405; test tests/admin-route-runtime-auth.test.mjs PASS trên source 9b6bb3145145b1399391dd235f1a2efb9ee66b99.
D. Product: lỗi lưu/xóa sản phẩm khi dòng biến mất do race đã được sửa: chỉ nhận thành công khi meta.changes===1; audit INSERT...SELECT WHERE changes()=1; lỗi trả 409. Test SQLite memory từ migrations 0001–0009 PASS, commit 192a4374f13bb9d918e85eabf167b6573efcf1b7.
E. Bảo hành: ORIGINALS.get() ném lỗi phải trả 503, không được bí mật fallback IMAGES công khai; chỉ fallback legacy khi private R2 trả null, test PASS; commit d6da905c4ce53cbf0a84e426943927c978767923.
F. Ảnh sản phẩm: thiếu ORIGINALS trả 503 trước khi put IMAGES; derivative put lỗi thì rollback private object vừa tạo, test mock PASS.
G. Backup/D1/đơn hàng/thanh toán: đã có test isolated local SQLite và Wrangler D1/R2, xác thực order item/price terms, payment-request/transactions race, QR trạng thái xác minh, warranty issuance/claim, backup V2 GET và cleanup. KHÔNG tuyên bố settlement thực tế hay remote disposable Restore đã PASS.
H. Bảo vệ Preview: thêm workflow read-only preintegration .github/workflows/preintegration-preview-bindings-readonly.yml; cố ý FAIL nếu binding unsafe, không coi workflow kết thúc là nghiệm thu. Thêm scripts/admin-preview-binding-safety.mjs và test để trước deploy Admin Preview so D1/R2 binding với Production; không đổi cấu hình thực tế. Bản preintegration audit #40167641001 cố ý FAIL vì 3 blocker thật.
I. Diagnostic riêng trên source 9b6bb3: 6/6 workflow PASS, diagnostic #40169833613 và artifact #12589933479; 142 ảnh PNG quan sát, logo filter none, không có tràn ngang login ở các breakpoint đã kiểm. Nguồn 6b10cd5 (docs HEAD) tiếp tục 4/4 PASS.

## 4. CHƯA HOÀN THÀNH / KHÔNG ĐƯỢC GIẢ PASS

Ba blocker đã được xác minh bằng Cloudflare metadata READ-ONLY:
1) STOREFRONT_PREVIEW_DB_SHARES_PRODUCTION: D1 của website thử nghiệm Preview trùng Production. Tuyệt đối không chạy test ghi từ website thử nghiệm.
2) ADMIN_PREVIEW_ORIGINALS_MISSING: Admin Preview chưa binding private R2 ORIGINALS; upload ảnh sản phẩm gốc/bảo hành live phải fail closed.
3) STOREFRONT_PREVIEW_ORIGINALS_PRODUCTION_BACKED: kho ORIGINALS website thử nghiệm Preview trùng Production; cấm upload thử.
Điểm đã xử lý: R2 IMAGES Admin Preview đã có binding và hai Preview cùng non-Production IMAGES bucket, cách biệt Production; đừng đọc các handoff cũ bảo IMAGES còn thiếu.
Nguồn: https://github.com/chichute5500/Sindarealest-admin/actions/runs/40167641001 (FAIL đúng do 3 blocker).
Các bước cấu hình Cloudflare chỉ trên Preview, phải xác minh bucket private độc lập/không public, không được tự trỏ tới Production. Nếu không có quyền chỉnh Cloudflare thì cung cấp từng bước owner cần làm và tiếp tục các việc độc lập khác.

- Admin Preview runtime hiện có thể chưa chứa 2 backend bugfix gần nhất; nếu cần redeploy, bảo vệ source/project/branch, kiểm tra môi trường rồi chỉ deploy Preview.
- 12 màn hình tham chiếu thiết kế: 0/12 được chủ dự án duyệt theo cùng dữ liệu/trạng thái. 32/100 là điểm TRỌNG SỐ BẰNG CHỨNG theo docs/admin-ui-reference/handoff/weighted-acceptance.json, KHÔNG phải % sản phẩm hoàn thành. Con số 50% PROVISIONAL ở tệp cũ là lịch sử, không được dùng làm trạng thái hiện hành.
- Remote QR R2 write-read-delete/cleanup, private ORIGINALS upload và đọc, remote disposable D1 Restore POST, payment/refund business signoff, keyboard/screenreader, perf/security audit, reference same-state visual parity và owner final acceptance còn thiếu chứng cứ.
- Website test branch khác API (migration 0009 / fulfillment_type / orderAccessToken / order-payment) nhưng CHƯA tích hợp nên chỉ ghi là rủi ro tương lai, không thay code web.

## 5. NHIỆM VỤ CHAT MỚI — BẮT ĐẦU NGAY, KHÔNG HỎI LẠI

1. Đọc các tệp bàn giao hiện hành: docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md, LATEST-STATUS.md, START-HERE.md, docs/admin-audit/AUDIT-CONTINUATION-2026-10-25.md và audit-status-2026-10-25.json, docs/preintegration/READINESS-AUDIT-2026-10-25.md, rubric weighted-acceptance.json. Fetch HEAD/PR/Actions live trước khi thực thi.
2. Chia các hướng rà soát có thể song song: (a) bảo mật tất cả Admin route/auth/CSRF/session/rate-limit, (b) sản phẩm/SKU/media/bảo hành và cleanup, (c) đơn hàng/QR/ledger/backup/restore trên disposable D1, (d) mobile/PC 12 màn hình, hiệu năng và accessibility, (e) cấu hình Preview D1/R2 đọc-only.
3. Fix lỗi source Admin cụ thể, thêm test hồi quy thực tế; đối chiếu CI trên đúng HEAD. Không commit chỉ để lấy workflow PASS và không dừng ở báo cáo nếu còn việc code an toàn có thể thực hiện. Dữ liệu test được phép phải riêng hoàn toàn với Production.
4. Nếu phát hiện binding owner-only không tự giải quyết được, ghi rõ địa chỉ Cloudflare Pages project, môi trường Preview, tên binding và yêu cầu bucket/database độc lập, KHÔNG cung cấp/đoán ID hoặc secret. Không để blocker bên ngoài cản trở sửa lỗi code độc lập.
5. Trước khi kết luận: xác minh mới nhất source SHA, deployed app SHA, PR OPEN, main unchanged; kết quả workflow thật, ảnh và cleanup. Cập nhật file trạng thái, checkpoint và PROMPT-NEXT-CHAT để bàn giao tiếp.
6. Chỉ công bố 100% khi từng cổng có bằng chứng PASS và 12 màn hình được chấp nhận chính thức; chưa có quyền tích hợp/merge kể cả khi đủ cổng.

## 6. NGUYÊN TẮC LÀM VIỆC

Báo cáo sự thật, có SHA/CI/artifact; phân biệt PASS unit/static, PASS browser, PASS remote live, và OWNER_ACCEPTED. Nếu một việc chưa được test/live/deploy thì ghi NOT_VERIFIED. Không tự nhận làm nền/asynchronous. Người dùng muốn xử lý hết nhưng không chấp thuận tích hợp. Không yêu cầu người dùng copy lại lịch sử trừ khi quyền Cloudflare thật sự buộc chủ tài khoản thao tác.
