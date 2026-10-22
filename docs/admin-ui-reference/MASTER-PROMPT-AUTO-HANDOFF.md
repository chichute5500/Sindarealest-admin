# SINDAREALEST ADMIN — MASTER PROMPT (LIVE)

> **Single entry point for a new chat:** read [`handoff/START-HERE.md`](handoff/START-HERE.md) first. The owner should only need to send its one-line starter, not paste this master prompt or historical notes. Fetch live GitHub state before acting; embedded SHAs are historical. Current known issue to triage: Preview workflow `39804852604` overall failed because local Playwright timed out waiting for `[data-action="retry-customers"]` at `tests/e2e/admin-static-baseline.spec.js:1940`, while the deployed Preview diagnostic step itself passed. Inspect [artifact 12437154740](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39804852604/artifacts/12437154740).

## Mission
Tiếp tục làm việc thực tế trên GitHub, không chỉ phân tích/báo cáo. Sau mỗi checkpoint tự chuyển sang task an toàn tiếp theo; chỉ dừng khi cần quyết định/quyền từ chủ dự án hoặc hết nhiệm vụ an toàn.

## Repo and branch isolation
- Repo `chichute5500/Sindarealest-admin`; ADMIN branch `feature/admin-isolated-handoff-2026-10-20`, PR #111.
- Static branch được bảo vệ: `fix/liquid-glass-audit-2026-10-19`, PR #108.
- `handoff/current-status.json` là nguồn trạng thái/task duy nhất. Fetch HEAD/PR/workflows trước mỗi write.
- Không merge PR, sửa main/static, force-push hoặc revert/reset/cherry-pick mù. Phải xác minh merge-base và phân biệt file kế thừa với thay đổi mới.

## Cấm
Không deploy Production; không bypass Cloudflare Access; không truy xuất/tiết lộ/đổi secrets; không remote D1/R2 write/migration/setup/deploy nếu chưa có phê duyệt riêng. R2 image save và PRE/PRO migrations là DEFERRED_BY_OWNER. Không bịa giá, stock, dữ liệu, ảnh, API/route/contract. QR không nhúng số tiền và xác nhận tiền thủ công theo contract `docs/integration/QR-PAYMENT-AND-PRODUCT-TYPE-CONTRACT.md`.

## Reference and acceptance
Ảnh `docs/admin-ui-reference/admin-mobile-reference.png` là chuẩn thị giác. Mapping chính thức ở `handoff/12-SCREEN-REFERENCE-AUDIT.md`. UI luxury-minimalist Liquid Glass, mobile-first, Vietnamese text, light/dark, accessible focus/targets, không clipping/overlap; bảo toàn auth, business logic và API.
Viewports: 320×640, 360×800, 375×812, 390×844, 412×915, 768×1024, 1280×800, 1440×900. Ghi đúng tổ hợp đã test.

## Execution loop
1. Verify live HEAD, PR #111/#108 and Actions.
2. Read relevant source/reference/evidence.
3. Establish concrete defect/acceptance rule.
4. Make smallest ADMIN-only change and add regression.
5. Test exact SHA; inspect screenshots at matching viewport/theme.
6. Use truthful statuses: PASS, PARTIAL_NOT_ACCEPTED, FAIL, BLOCKED, NOT_TESTED, NOT_VERIFIED, DEFERRED_BY_OWNER.
7. Update compact JSON/Markdown, parse/readback and re-fetch PR/HEAD.
8. Continue automatically.

CI is not full acceptance. Fixtures are not live backend QA. Keep progress 50% PROVISIONAL until actual weighted acceptance improves; docs/test-only work or green CI does not increase it.
