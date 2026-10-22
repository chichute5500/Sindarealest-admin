# PROMPT BÀN GIAO CHAT MỚI — SINDAREALEST ADMIN

Tiếp tục việc thực tế trên GitHub; báo cáo xong phải làm tiếp task an toàn kế tiếp.

## Preflight
- Repo `chichute5500/Sindarealest-admin`; nhánh ADMIN duy nhất `feature/admin-isolated-handoff-2026-10-20`, PR #111; nhánh static được bảo vệ `fix/liquid-glass-audit-2026-10-19`, PR #108.
- Đọc `handoff/current-status.json`; fetch HEAD, PRs và Actions trực tiếp trước mọi write. Dùng archive `docs/admin-ui-reference/handoff/history/legacy-2026-10-22/` chỉ để tra lịch sử.
- Parent HEAD trước lần gom tài liệu: `b7a466f95b8ad4b5956540d0bdfef89e5dd0ff8e`; Validate #39769095034 SUCCESS. Visual artifact #311 / Preview #39767851318 trên source `dca19a2af32a78390878b9ccfa5c7c26b816f2ff`, 99 PNG/75 fixture metrics; không chứng minh backend thật.
- Tiến độ **50% PROVISIONAL**; #3/#4 và toàn bộ 12 màn chưa accepted.

## Đánh số chuẩn theo poster
1 Login; 2 Dashboard; 3 Product list; 4 Product editor; 5 Gallery; 6 Orders; 7 Order detail; 8 Customers; 9 Warranty/support; 10 Website settings; 11 Backup/Restore; 12 Activity log. Product classification thuộc #3/#4; AI grouping là feature riêng BLOCKED, không phải #11.

## Queue
1. **P1 #3:** so reference/source ở viewport/theme khớp; kiểm tra card density, filters, chips, edit, pagination, overflow. Không bịa ảnh, giá hay stock; phân biệt fixture thiếu data với lỗi source.
2. **P1 #4:** tabs/fields/SKU checkbox/AI suggestion/giá-tồn kho/footer; giữ nguyên API/nghiệp vụ.
3. **P1 12-screen parity:** mỗi màn có bằng chứng riêng, không PASS chỉ từ fixture.
4. **P1 PR #111 scope:** read-only merge-base/path audit; phân loại inherited vs authored, không revert mù.
5. **P2 #6/#7:** Orders và Order detail là hai màn riêng.
6. **BLOCKED:** backend QA cần Preview identity hợp lệ; AI grouping cần contract được duyệt.
7. **DEFERRED_BY_OWNER:** R2 image save và PRE/PRO migrations.

## Guardrails
Không merge #111/#108; không sửa main/static; không Production deploy; không bypass Access hoặc đọc/đổi secrets; không remote D1/R2 writes/migrations/setup/deploy; không tạo dữ liệu/ảnh/API contract giả. Mỗi source change phải có regression, exact SHA, readback và kiểm tra CI.


## New source-only release-readiness finding (2026-10-22T18:50:41+07:00)
PR #111 and the static branch share merge base `a3834fed3eb1c012b188d7c95d14ec3d15e3969f`; they are independently diverged, so do not sync them. Static `public/index.html`, static preview workflow and setup/deploy scripts' latest path changes predate the merge base and appear inherited, though still in the PR diff vs `main`.

Migration `0009_fulfillment_and_manual_payments.sql` and payment ledger routes are post-merge-base Admin changes. Both `scripts/setup-cloudflare.mjs` and `scripts/deploy-cloudflare.mjs` lack a 0009/schema preflight, while `scripts/check-migrations.mjs` tests 0009 only against temporary local D1. Track this as POTENTIAL_BLOCKER_NOT_VERIFIED; do not inspect/write remote D1 or auto-run migration. Continue the higher-priority #3 UI task first.


## Latest handoff checkpoint — 2026-10-22T21:05:00+07:00
- Current docs checkpoint began from commit `5497d4d3b51d32064a9a993e0f891ca672c543c1` (docs-only consolidation); fetch live branch/PR HEAD again before doing anything. The source validation run `39769095034` is SUCCESS on parent source SHA `b7a466f95b8ad4b5956540d0bdfef89e5dd0ff8e`, not proof that a newer source commit was tested.
- Downloaded and opened artifact #311 from run `39767851318`; compared poster with #3 screenshot `products-reference-matrix__390x844__light.png`. Fixture uses placeholder images and unknown price/stock, so no source data should be fabricated. No proven new source defect yet; do not claim #3 complete.
- Immediate task: continue matched-state #3 review for 320×640 and 360×800 in both themes using artifact #311 and metrics; inspect toolbar/card actions/pagination/overflow. If no independent defect is demonstrated, record evidence and move to #4 rather than inventing a fix.
- Any documentation-only commits do not increase the 50% PROVISIONAL project progress. Keep PR #111 and #108 open/unmerged and follow all existing guardrails.
