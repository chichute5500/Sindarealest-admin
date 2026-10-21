# PROMPT BÀN GIAO — TIẾP TỤC HOÀN THIỆN SINDAREAL EST ADMIN

Bạn phải tiếp tục công việc thực tế, không chỉ lập kế hoạch. Trước khi hành động, hãy đọc toàn bộ các file sau từ nhánh `feature/admin-isolated-handoff-2026-10-20` trong repository `chichute5500/Sindarealest-admin`:

1. [MASTER-PROMPT-AUTO-HANDOFF.md](../MASTER-PROMPT-AUTO-HANDOFF.md)
2. [START-HERE.md](START-HERE.md)
3. [LATEST-STATUS.md](LATEST-STATUS.md)
4. [latest-test-results.json](latest-test-results.json)
5. [PROMPT-COMPLETENESS-AUDIT.md](PROMPT-COMPLETENESS-AUDIT.md)
6. [reference-instructions.md](../reference-instructions.md)

## Bắt đầu bằng xác minh, không đoán

- Xác minh repository, nhánh ADMIN, HEAD SHA, Git status/working tree nếu có checkout, PR hiện tại và workflow mới nhất.
- Nếu không có local checkout hoặc không có quyền đọc một phần trạng thái, nói rõ giới hạn; không giả vờ đã chạy lệnh hoặc xem file.
- Đọc handoff trước khi làm để tránh lặp lại các bước đã có bằng chứng.
- Không dựa vào test PASS của commit cũ để tuyên bố HEAD hiện tại đã PASS. Mọi kết quả phải gắn với source commit/workflow cụ thể.

## Phạm vi và bảo vệ bắt buộc

- Chỉ sửa và commit trên `feature/admin-isolated-handoff-2026-10-20`.
- Bảo vệ nhánh website tĩnh `fix/liquid-glass-audit-2026-10-19` và nhánh `main`.
- Giữ PR #111 (ADMIN) và PR #108 (website tĩnh) OPEN/chưa merge. Không tự merge, cherry-pick, force-push hoặc đồng bộ hai nhánh.
- Không deploy Production; không sửa secrets, cấu hình môi trường, D1/R2, schema, dữ liệu thật, API/auth/backend hay nghiệp vụ ngoài phạm vi được cho phép.
- Không bỏ qua Cloudflare Access. Nếu Preview bị chặn hoặc phục vụ sai source/signature, ghi BLOCKED và tiếp tục công việc độc lập có thể thực hiện an toàn.

## Tiếp tục công việc

1. Đối chiếu trạng thái và bằng chứng gần nhất trong LATEST-STATUS.md / JSON; xác minh lại các kết quả mới nhất từ GitHub Actions.
2. Xử lý các việc còn mở theo thứ tự ưu tiên: Preview URL/source mismatch; kiểm thử Playwright trên source hiện tại; so sánh các màn hình với ảnh tham chiếu; đánh giá responsive và nghiệp vụ ADMIN bằng fixture/read-only trước; chỉ kiểm tra backend thật khi có Preview và quyền hợp lệ.
3. Không coi ảnh fixture hoặc login-only là bằng chứng cho nghiệp vụ đã đăng nhập. Không dùng dữ liệu cá nhân/thật cho screenshot.
4. Với mỗi thay đổi có ý nghĩa: sửa trên nhánh ADMIN → chạy test phù hợp → lưu screenshot/metadata thực → đối chiếu → cập nhật LATEST-STATUS.md và latest-test-results.json. Dùng PASS/FAIL/BLOCKED/SKIPPED/NOT VERIFIED chính xác.
5. Không dừng sau báo cáo tiến độ nếu vẫn còn việc an toàn có thể thực hiện. Chỉ dừng khi cần người dùng cấp quyền, cung cấp URL Preview hợp lệ, hoặc quyết định mà AI không thể suy ra an toàn.
6. Trước khi kết thúc phiên, cập nhật file handoff, ghi commit SHA chỉ sau khi GitHub xác nhận, đọc lại file từ GitHub để xác minh và đưa ra bước tiếp theo cụ thể.

## Trạng thái khởi điểm được ghi nhận — 2026-10-21

- Lượt cập nhật bàn giao gần nhất chỉ cập nhật tài liệu; không có thay đổi source ADMIN và không chạy test mới.
- Bằng chứng kiểm thử cũ phải được đọc từ JSON và xác minh workflow/commit trước khi tái sử dụng. Preview mismatch và kiểm thử module nghiệp vụ đã đăng nhập là các vấn đề còn cần xử lý theo trạng thái mới nhất.
- Không tuyên bố hoàn tất 100% cho đến khi từng tiêu chí nghiệm thu có bằng chứng phù hợp.

**Bắt đầu ngay bằng việc xác minh GitHub và đọc các file bàn giao trên; sau đó thực hiện bước tiếp theo an toàn có thể làm, cập nhật file và tiếp tục.**


## Continuation update — 2026-10-21

**Verified branch:** `feature/admin-isolated-handoff-2026-10-20` only. **Current reported progress: 43%.** PR #111 remains OPEN/unmerged. Never merge PR #111/#108 or deploy Production.

### Latest verified run
- Run: https://github.com/chichute5500/Sindarealest-admin/actions/runs/39495162150
- Tested source commit: `d74de3c6adbb6be6b0a59ac4d45e869738a016e4`.
- `npm run check`: PASS; `npm test`: PASS; local screenshot/source matrix: PASS.
- Workflow overall: FAILURE only at `Diagnose configured deployed Preview`; Preview CSS/UI signature does not match the source tested. Artifact `admin-preview-evidence-61`, ID `12296849221`.
- The 58-PNG source screenshot set, 16 login-shell images and 42 fixture module images are different evidence sets; 42 fixture images plus 36 metrics are read-only fixture evidence, not real authenticated backend testing.
- A verified source fix changed the malformed shell tail from `</nav>/div>` to `</nav></div>`. Inspect current screenshot evidence before claiming the deployed site is fixed.
- Updated `LATEST-STATUS.md` and `latest-test-results.json` to the latest run. Latest test status is `SOURCE_CHECKS_PASS_PREVIEW_DIAGNOSTICS_FAIL`.

### Continue immediately
1. Re-read this prompt, `MASTER-PROMPT-AUTO-HANDOFF.md`, `START-HERE.md`, `LATEST-STATUS.md`, `latest-test-results.json`, and `PROMPT-COMPLETENESS-AUDIT.md`; do not assume old SHA/status is current.
2. Verify current PR #111 head SHA and workflow run. Check whether the branch has moved after the evidence updates.
3. Download/inspect artifact `admin-preview-evidence-61` and its screenshots/metadata; compare against the approved reference screens. Do not report visual parity without a screen-by-screen comparison.
4. Continue safe source and test improvements. Investigate why `ADMIN_TEST_URL` reaches a UI/CSS signature that differs from tested source, but do not expose, edit, or replace secrets and do not bypass Cloudflare Access. Record BLOCKED if owner action is needed.
5. Audit PR #111's full changed-file scope. Its last reported diff was very broad (909 files against `main`); do not merge until ADMIN isolation is proven and the scope is safe.
6. Only run authenticated read-only module tests when a legitimate authorized Preview/login path and safe test data/PII masking are available. Fixture screenshots never count as authenticated business-flow PASS.
7. After each meaningful verified cycle, update `LATEST-STATUS.md`, `latest-test-results.json`, and this prompt, then read them back from GitHub to verify saved content.

### Immutable safety constraints
- Work only on `feature/admin-isolated-handoff-2026-10-20`.
- Never modify `fix/liquid-glass-audit-2026-10-19` or `main`; no merge/cherry-pick/force-push/synchronization.
- Keep PR #111 (ADMIN) and #108 (static website) unmerged.
- No Production deployment; no secrets, real data, D1/R2, schema, or out-of-scope backend changes.
- Report the percentage honestly. 43% remains appropriate until Preview, authenticated modules, all 12 reference comparisons, and full PR diff audit have evidence.


### Newest change after run #39495162150 — workflow fix awaiting CI
- Updated .github/workflows/admin-preview-diagnostics.yml at commit de6114f75cba36193c50ad043175d08be092929f: the run summary now differentiates source PASS from remote Preview failure, refreshes the latest evidence object from current metadata, and keeps screenshot counts separated by suite.
- Appended the verified run/log findings to LATEST-STATUS.md in commit 250653fad7440eea42a532ccbd42291747ad8a94.
- IMPORTANT: these workflow/documentation commits happened after run #39495162150 and have not themselves been validated by a subsequent Actions run. Do not label the latest workflow version PASS until new CI evidence exists.
- The remote failure remains a real failure: CSS signature PREVIEW_CSS_SIGNATURE_MISMATCH, .topbar > .brand visible when hidden was expected. Do not weaken the assertion just to turn CI green; establish the correct Preview target with authorized owner input.


### 2026-10-21 PR scope and migration-risk findings
- PR #111 current audited scope: 909 files (+30,195/-356), 393 commits ahead and 6 behind main; 862 are docs/evidence files, but changed code also includes public/index.html, data/legacy-products.json, 14 functions files, migration 0008, 5 scripts and 20 tests. Do not merge based on screenshot tests alone.
- Patch audit found scripts/setup-cloudflare.mjs now executes remote D1 migrations and direct ALTER TABLE statements for SKU verification columns when missing. This was NOT executed. Because current constraints prohibit schema/data changes, treat this script/migration path as a merge/deploy blocker pending explicit review. deploy-cloudflare.mjs adds a remote schema gate; review ordering carefully.
- Available patches show changes to shared product/public middleware, SKU verification, price confirmation, order snapshots and watermark backup/restore. These require backward compatibility tests; the large public/index.html and data/legacy-products.json patches were not returned by GitHub's patch endpoint and remain unreviewed.
- Latest evidence status remains run #39495162150 (source commit d74de3c6...), not the newest workflow/doc commits. The updated workflow has not been validated on current HEAD; no PR-triggered workflow run was found for bb320c7f928fbee888df5f641e3f27fe27ca3253.
- Continue by inspecting call sites/tests for scripts/setup-cloudflare.mjs without running it; review remaining API patches; request an authorized decision on whether migration/backend work belongs in PR #111; investigate the configured Preview source mismatch without bypassing Access or modifying secrets. Update all handoff files after each evidence-backed cycle.


## Latest continuation checkpoint (2026-10-21) — read before doing more work
- Branch: `feature/admin-isolated-handoff-2026-10-20`. Latest observed PR #111 head: `eee7dcedb71a42516822a9f46384ddacc107eb4e`; PR is OPEN/unmerged against `main`. No PR-triggered workflow run was returned for this head, so the workflow reporting change is NOT yet CI-validated.
- Scope audit: 909 changed files; 862 docs/evidence and 47 non-doc files spanning storefront, `functions/`, migration 0008, setup/deploy scripts, package config, workflows and 20 tests. PR is not isolated to Admin UI. Compare endpoint reports 398 commits ahead / 6 behind main and caps file detail at 300; use paginated PR filename list for full count.
- High-risk blocker: `scripts/setup-cloudflare.mjs` contains remote D1 migration and direct ALTER TABLE behavior for SKU verification columns. It was not executed. Do not run setup/deploy scripts or touch production schema/data.
- Latest evidence still points to run #39495162150 (tested source `d74de3c6...`): source checks/screenshot capture passed; deployed Preview diagnostics failed CSS signature mismatch. This is stale evidence for the current head, not a current green CI result.
- Progress remains 43%. Next: inspect setup script call sites/tests without executing; review remaining API patches and unreviewed large storefront/data files; establish authorized Preview target/access; obtain fresh CI evidence; update status/result files. Never merge PR #111, PR #108, deploy Production, change secrets, bypass Access, or run migrations without explicit authorization.



## Newest verified checkpoint — 2026-10-21 (supersedes prior older run references)

- Current HEAD at the last GitHub read: `9c94c106fec99aa5920685da4d4af32b53e680ad`; PR #111 OPEN/unmerged. Static branch HEAD at the last read: `9d5549cf662c63f55d3df591c1321248276a5a22`; PR #108 OPEN/unmerged. Main SHA is `28c768ba26b1d9f7d40e14efac5112526ed1c8b3`.
- Current HEAD source CI [39543407286](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39543407286) is PASS for check/test/dependency-audit. It is not Preview evidence.
- Latest diagnostic [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) ran on `de6114f75cba36193c50ad043175d08be092929f`, generated artifact `admin-preview-evidence-62 (ID 12320316041)`, and fails only at the configured Preview CSS signature. Remote computed signature: topbar brand display=flex/visible/opacity=1; expected login-hide rule absent.
- Artifact set: 16 login-shell images plus 42 module fixture images, 36 fixture metrics. Fixture session is stubbed locally and non-GET calls are blocked. No real authenticated backend QA was performed.
- PR #111 is 909 files: 862 docs/evidence and 47 non-doc across storefront, data, Functions, migration, scripts, workflows, config and tests. The exact large patches for `public/index.html` and `data/legacy-products.json` remain unreviewed because GitHub patch retrieval returned null.
- `scripts/setup-cloudflare.mjs` was inspected read-only; it can run remote D1 migrations and direct ALTER TABLE for `sku_verified`. It was NOT run. No schema/data/secrets/Production actions.
- Progress stays 43%. Continue safe read-only audit. Need authorized owner confirmation of the intended Preview deployment/URL and direction on mixed-scope PR; do not bypass Access, merge, deploy, or run migration commands.


## Latest audit addendum — 2026-10-21

- Latest verified branch HEAD before this doc update: `179d6d5ae93ebd56215abb0d4bbdaa45679dd7fa`; standard source CI [39545082149](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39545082149) PASS. Do not confuse this CI with Preview/browser evidence.
- Read-only comparison of large public files confirms PR #111 is mixed-scope: ADMIN `public/index.html` differs from the protected static branch and contains broad public theme/layout/favourites/watermark/price presentation. ADMIN `public/admin/index.html` also differs from the static branch. No branch sync was performed.
- `data/legacy-products.json` is identical between ADMIN and the static branch. Compared with main, the 235 records differ only by `sku:null` and `skuVerified:false`; titles, categories, descriptions, prices and images are unchanged.
- Latest Preview diagnostic remains FAIL on source `de6114f...` because the served CSS signature does not match. Artifact has 16 login-shell images + 42 fixture module images; this is not authenticated real-backend QA.
- PR #111 remains OPEN/unmerged with 909 changed files; review of public storefront effects and migration/backward compatibility is still mandatory. No migration/setup/deploy scripts were executed.
