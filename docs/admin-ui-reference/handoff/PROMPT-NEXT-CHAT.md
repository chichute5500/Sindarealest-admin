# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục công việc thực tế trên GitHub; sau mỗi checkpoint báo cáo rồi làm tiếp task an toàn kế tiếp.

## Preflight
- Repository: chichute5500/Sindarealest-admin.
- ADMIN branch duy nhất: feature/admin-isolated-handoff-2026-10-20; PR #111 phải OPEN, không merge.
- Static website branch được bảo vệ: fix/liquid-glass-audit-2026-10-19; PR #108 phải OPEN, không merge.
- Live ADMIN HEAD phải được fetch trước mỗi lần ghi; lần cập nhật này bắt đầu từ HEAD 2e274dcc18d3479e183a6385144858146a6c2fb9. PR #111 và #108 vẫn phải OPEN/unmerged; xác minh HEAD PR #108 trực tiếp trước khi thao tác tiếp theo. Không dùng SHA trong handoff làm HEAD hiện tại.
- Visual/application source SHA: dca19a2af32a78390878b9ccfa5c7c26b816f2ff. Compare source → pre-write HEAD: 21 commits / 22 paths tài liệu/handoff/reference; application source không đổi.
- Workflow [#39778009734](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778009734) SUCCESS trên source SHA `3658ca1069616639b825de2cd7b9c714ce560901`: `npm run check`, `npm test`, responsive/theme Playwright capture, safe preview diagnostics và artifact upload đều PASS. Artifact [#314 / ID 12425910948](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39778009734/artifacts/12425910948): 89 PNG, 16 login metrics, fixture/read-only; không phải authenticated backend QA. Current live HEAD có docs-only commits phía sau source tested; không tuyên bố exact live HEAD đã test.
- Exact live docs-only HEAD không có status checks/PR workflow run được trả về. Run #39773285617 thành công trên SHA cũ 5497d4d3b51d32064a9a993e0f891ca672c543c1, không gọi nhầm là test trên HEAD hiện tại.
- Progress giữ 50% PROVISIONAL; docs hoặc CI xanh không tự làm tăng tiến độ.

## Mapping poster chuẩn
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Product gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log. Product classification thuộc #3/#4. AI image grouping là feature riêng BLOCKED, không phải #11.

## Kết quả mới — không lặp lại
### #3 Product list — review đóng do giới hạn dữ liệu, chưa nghiệm thu
- Đã tải/mở artifact #311 và xem metrics viewport 320×640 + 360×800 ở cả sáng/tối. documentWidth bằng viewport; wrapper width 292/332 và scrollWidth bằng clientWidth; không thấy horizontal overflow ở các trạng thái này.
- Test fixture hiện có cover status chips, search/category/fulfillment filters, no-result/clear, card layout, giá/tồn kho chưa xác minh và mở editor từ nút sửa.
- Fixture chỉ có 3 sản phẩm UI-only; ảnh là placeholder, giá/tồn kho để trống. Page size là 12 nên chỉ có page 1/1; pagination nhiều trang chưa được kiểm chứng. Không bịa dữ liệu để khớp poster.
- Không có lỗi nguồn độc lập được chứng minh; không sửa source. #3 vẫn PARTIAL_NOT_ACCEPTED. Không lặp lại vòng so ảnh này trừ khi có state/evidence hợp lệ mới.

### #4 Product editor — review một phần, chưa nghiệm thu
- Đã mở screenshots 390×844 sáng/tối và 1280×800 sáng; metrics không thấy horizontal overflow.
- Test hiện có cover tab click/ARIA và keyboard ArrowLeft/ArrowRight/Home/End, trường title/category, vị trí checkbox SKU, hình học nút AI suggestion, placeholder/align giá-tồn kho, footer cố định và scroll content.
- Chưa chứng minh toggle/save SKU persistence, AI endpoint trả kết quả thật, save qua backend thật hoặc full-screen parity. Fixture chặn mọi API write. #4 vẫn PARTIAL_NOT_ACCEPTED; không lặp lại geometry đã chạy khi chưa có trạng thái mới.

## Latest checkpoint — migration 0009 preflight tested
- Source change commit: `3658ca1069616639b825de2cd7b9c714ce560901`.
- Files changed: `scripts/setup-cloudflare.mjs`, `scripts/deploy-cloudflare.mjs`, `tests/config-integrity.test.mjs`. Both scripts now issue read-only `SELECT ... LIMIT 0` checks for the 0009 fulfillment/payment schema before Pages deploy and fail closed on errors; they do not run migration 0009.
- Workflow #39778009734 is SUCCESS for repository checks, automated tests, screenshot matrix, safe diagnostics and artifact upload. Artifact #314 / ID 12425910948 was downloaded; its metadata confirms local/static + synthetic fixture scope. No setup/deploy/remote D1/R2/migration was run.
- Product editor screenshot 390×844 light was opened; no overflow issue established. Order-detail fixture screenshot confirms visible summary/customer/product/footer CTA but does not prove real action/business behavior. Both remain PARTIAL_NOT_ACCEPTED.
- Product list #3 review remains closed as fixture-data-limited; do not repeat without new state/data.

## Next task — P1 PR #111 scope/provenance audit
1. Read-only audit .github/workflows/admin-preview-diagnostics.yml: triggers, contents:write, phạm vi cập nhật evidence và chống commit ảnh stale.
2. Review migrations/0009_fulfillment_and_manual_payments.sql, functions/api/admin/payment-requests.js và payment-transactions.js; đối chiếu schema/contract với tests, không giả lập API.
3. Review scripts/setup-cloudflare.mjs và scripts/deploy-cloudflare.mjs về preflight migration/schema 0009. Đây là POTENTIAL_BLOCKER_NOT_VERIFIED; chưa có bằng chứng schema remote thiếu.
4. Phân loại inherited vs authored bằng merge-base/path evidence; không revert mù. Live census PR #111: 1,296 paths. Merge base a3834fed3eb1c012b188d7c95d14ec3d15e3969f; tại checked heads ADMIN ahead 904, static ahead 920.
5. Sau đó tiếp tục từng màn theo evidence riêng; #6 Orders và #7 Order detail là hai màn khác nhau.

## Guardrails
- Không merge #111/#108; không sửa main hoặc nhánh static.
- Không deploy Production; không bypass Cloudflare Access; không đọc/chỉnh secrets.
- Không chạy migration/setup/deploy hay remote D1/R2 query/write.
- AI image grouping BLOCKED nếu chưa có contract được duyệt.
- R2 image save và PRE/PRO migrations DEFERRED_BY_OWNER.
- Không bịa ảnh, giá, tồn kho, nghiệp vụ/API contract.
- PASS/FAIL/BLOCKED/NOT VERIFIED phải có evidence và SHA. Không PASS toàn màn dựa riêng fixture, screenshot hoặc CI.
- Khi status đổi đáng kể, cập nhật current-status.json, latest-test-results.json, PROMPT-NEXT-CHAT.md và audit liên quan; đọc lại GitHub sau khi ghi; tiếp tục task an toàn kế tiếp.
