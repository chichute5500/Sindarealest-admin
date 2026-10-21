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


## Additional blocking finding — migration bookkeeping

- Before any deployment, resolve the migration strategy: `setup-cloudflare.mjs` uses remote `d1 execute --file` for schema files and direct `ALTER TABLE` for the two `sku_verified` columns instead of applying migration 0008 with the Wrangler migration mechanism. `deploy-cloudflare.mjs` checks for columns but not that migration 0008 is recorded in `d1_migrations`.
- This is a possible schema/migration-ledger divergence; remote D1 state is NOT VERIFIED because no remote command was run. Local `check-migrations` PASS does not establish remote state. Do not run setup/deploy/migration commands.
- Cloudflare docs: https://developers.cloudflare.com/workers/wrangler/commands/d1/ and https://developers.cloudflare.com/d1/reference/migrations/.
- Latest source CI run before this handoff cycle: [39545568905](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39545568905) PASS on `f744fed18636622ac108f5e9874d3735ae2c2ccc`. The Preview diagnostic still fails and authenticated real-backend QA remains NOT VERIFIED. Progress remains 43%.


## Latest ADMIN source-contract correction — 2026-10-21

- Before this update, current ADMIN HEAD was `21a7e039749e484e42b68ec322481df6a2a797af`; current `public/admin/index.html` blob is `a297b8298ff30c5e713896fed1c21d0f8ca3e899`.
- Supersede stale visual gap notes: source has **five** bottom navigation buttons, with Warranty/Settings under “Khác”; final mobile CSS sets five columns. Tables for products/orders/customers/warranties/claims use `mobilecards` responsive CSS and override inline min-width at <=680px. Login markup already says “Luxury in Every Detail” and “Đăng nhập quản trị”. These are source-only conclusions; real authenticated visual checks and PNG parity remain NOT VERIFIED.
- Latest CI run [39545978621](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39545978621) PASS on `21a7e039749e484e42b68ec322481df6a2a797af`; Preview run [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) still FAILS CSS signature.
- Current PR #111 metadata: OPEN, 909 files (+30,553/−356), 405 ahead / 6 behind; PR #108 remains OPEN. Do not merge or sync branches.
- Progress remains 43%. Remaining blockers: authorized intended Preview identity/access, real authenticated module QA, all 12 reference screen comparisons, mixed-scope PR review, and a reviewed D1 migration procedure.


## Latest run checkpoint — 2026-10-21

- Current HEAD `cbc0c1c9f1504e86121eadcbfc60d76675cd1e91`; [source CI run 39546689786](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39546689786) SUCCESS on exact HEAD. Dependency audit, integrity validation, automated tests PASS.
- Latest Preview diagnostic is still [run 39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719), FAIL at deployed CSS/UI signature mismatch on source `de6114f...`; local source screenshots and evidence upload succeeded. No Preview diagnostic on current HEAD has been found.
- PR #111 OPEN/unmerged: 909 files (+30,664/-356), 406 ahead / 6 behind main. PR #108 OPEN. Progress remains 43%.
- Continue safe read-only review; request the exact authorized Preview URL/deployment identity if needed. Never bypass Access, expose/change secrets, run remote D1 setup/migrations/deploy, merge, or sync branches.


## Latest checkpoint — 2026-10-21

- Live ADMIN HEAD verified `fbc783d514b194a7f922083e79b66cf333dda2ce`; source CI [39547169787](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39547169787) PASS on exact HEAD.
- Latest deployed Preview diagnostic [39542387719](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39542387719) remains FAIL at CSS/UI signature mismatch on source `de6114f...`; no newer Preview diagnostic found.
- PR #111 remains OPEN/unmerged: 909 files (+30,716/-356), 407 ahead/6 behind main. PR #108 OPEN. Progress 43%.
- Read-only review notes update-product duplicate SKU errors may fall through to generic 500 handling; DB uniqueness still protects integrity. Do not change backend/business logic without approval; add a scoped regression test only after permission and scope review.
- Continue safe work: verify current refs/runs, review PR scope and handoff. No Access bypass, secrets, remote D1/migrations, deploy, merge or branch sync.


## Follow-up verification — 2026-10-21 12:14 +07:00

- Confirmed [source CI run 39547341928](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39547341928) has completed SUCCESS on `4a1b58950c0b8e9de75009d5af313dfdfbea3595`. GitHub job steps show dependency audit, project integrity and automated tests completed successfully; the temporary `Post Check out source` step also completed.
- This validates the current pre-handoff commit, but does not address the deployed Preview failure. The latest Preview diagnostic is still run 39542387719 and still fails the deployed CSS/UI signature check. Evidence artifact `admin-preview-evidence-62` (artifact ID 12320316041, 9.17 MB, expires 2026-11-04) is available from that run; this connector exposed artifact metadata but not a direct decoded screenshot view in this pass.
- The current authorized blocker remains the intended Preview deployment/source identity and Access path. Owner must provide/confirm the target; do not inspect or change secrets, bypass Access, or use real customer data.
- Progress remains 43%. No source code change, deployment, merge, remote migration, or protected-branch write occurred.


## Latest continuation update — 2026-10-21 12:19 +07 (authoritative)

### Verified source and test status
- Application/test source commit: `6935eefa3473f1c6a15da08a34389d7223cbd0ea`.
- Source CI: [run 39548605358](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39548605358) SUCCESS on that exact commit.
- Preview diagnostic: [run 39548605474](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39548605474) FAILURE only at the configured deployed Preview assertion; do not weaken the assertion to obtain green CI.
- The CSS diagnostic was improved to normalize CSSOM selector whitespace and inspect parsed `CSSStyleRule.selectorText`. Corrected regex is verified in commit `6935eefa`.
- Preview evidence is definitive on the immediate CSS issue: `browserSupportsHideSelector=true`, `hideSelectorMatchesBrand=true`, `topbarBrandDisplay=flex`, and the only inline stylesheet reports `ruleCount=226`, `hasLoginHideRule=false`. The configured Preview response is missing the hide rule present in current source. It is therefore a stale/wrong Preview build or target mismatch; the exact URL identity cannot be inferred because GitHub masks `ADMIN_TEST_URL` in logs.
- Local Playwright evidence on source commit `6935eefa`: 58 PNGs (16 login shell + 42 read-only synthetic module fixtures), 36 fixture metrics, zero browser/console/network/HTTP errors and no attempted writes. This is not authenticated live-backend QA and does not prove all 12 reference screens visually match.
- Latest artifact: [admin-preview-evidence-64](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39548605474), artifact ID `12322384265`, expires 2026-11-04 05:19:09Z. Evidence/handoff commit after the source test does not change which source SHA was tested.
- Current progress estimate recorded as **45%**. The main remaining gates are Preview identity, 12-screen visual parity, authenticated live module tests, migration compatibility and full PR #111 scope review.

### Next actions
1. Continue safe work without waiting for user: review available local source screenshot evidence and HTML reference, run source-only accessibility/responsive checks as feasible, and continue the GitHub PR #111 file-scope audit. Update the handoff after each evidence cycle.
2. For the Preview issue, inspect only permitted public/workflow evidence; do not print, retrieve, edit or replace `ADMIN_TEST_URL` or Access secrets. Current browser reached the Admin login; do not bypass Cloudflare Access.
3. To make the remote Preview test pass, the owner must eventually provide an authorized Preview URL built from the current ADMIN branch, or explicitly authorize a dedicated preview-only deployment after confirming Preview D1/R2 bindings are isolated. This repository's checked-in `deploy.yml` sets `CLOUDFLARE_PAGES_BRANCH=main` and its deploy path must not be run to fix Preview.
4. Keep authenticated live backend workflows as NOT TESTED until current-source Preview access and a safe synthetic-data/PII-masking strategy exist. Do not access or modify real business data.
5. Keep PR #111 and #108 OPEN/unmerged; do not edit `main` or `fix/liquid-glass-audit-2026-10-19`; no Production deploy, migration, D1/R2 action, or secret change.


## Latest PR scope audit — 2026-10-21 12:21 +07

- PR #111 currently targets `main`, remains OPEN/unmerged, and the live PR API reports **970 changed files (+32,282/−356; 415 commits)**.
- A paginated GitHub Pull Request Files API read retrieved all 970 entries: **854 screenshot PNGs**, **70 other docs/notes**, and **46 non-documentation files**. Those 46 include 20 tests, 14 backend Functions, 5 scripts, 2 workflows, one migration, `public/index.html`, `public/admin/index.html`, `data/legacy-products.json`, and `package.json`.
- This is not an ADMIN-only diff. The public storefront HTML and seed product data are changed along with backend/API/migration/setup scripts. Keep PR #111 unmerged. Do not reset/rewrite/force-push, cherry-pick, change the PR base, or delete screenshot history without explicit owner approval.
- Migration audit remains static/read-only: `0008_product_sku_verification.sql` adds `sku_verified` to `products` and `order_items`; handlers use these columns. `scripts/setup-cloudflare.mjs` can run remote D1 executes and direct `ALTER TABLE`; it was not executed. Remote D1/migration ledger remain NOT VERIFIED.
- Latest source checks remain PASS on exact source/test commit `6935eefa3473f1c6a15da08a34389d7223cbd0ea`; deployed Preview check remains FAIL on run `39548605474` because `hasLoginHideRule=false` while selector support/match are true.
- Handoff files latest versions: `LATEST-STATUS.md`, `latest-test-results.json`, `PROMPT-NEXT-CHAT.md`; verify current branch HEAD/PR state before changing these because every handoff commit advances HEAD.
- Progress estimate remains **45%**, not completion. Safe next work: continue review of source/reference and public/backend diff risk, keeping all writes on this ADMIN branch only. User/owner action is still needed to provide a valid current-source Admin Preview URL (or authorize a verified preview-only deployment), and to decide how to safely resolve PR #111 scope contamination before merging.

## Bàn giao mới nhất — 2026-10-21 12:43 +07

### Trạng thái có bằng chứng
- Source CI run [39550214045](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39550214045) SUCCESS trên commit `8fd8aa96a9f80ae7a18fd598b44cc459dd303bca`.
- Preview diagnostics run [39550214050](https://github.com/chichute5500/Sindarealest-admin/actions/runs/39550214050) FAILURE trên cùng commit. CSS signature: `browserSupportsHideSelector=true`, `hideSelectorMatchesBrand=true`, `ruleCount=226`, `hasLoginHideRule=false`. Hai test qua, một assertion Preview vẫn đỏ. Không xóa/giảm assertion để che lỗi; URL `ADMIN_TEST_URL` bị GitHub che và không được in/đọc/đổi secret.
- Tiến độ ước tính hiện tại: **45%**; đây là ước lượng theo giai đoạn, không phải nghiệm thu. Authenticated QA backend thật, đối chiếu đủ 12 màn hình, kiểm tra scope/migration vẫn chưa hoàn tất.
- PR #111 OPEN/unmerged; API khi cập nhật ghi nhận 1.033 file (+33.892/−357; 424 commits). Diff chứa file ngoài Admin; không merge, không đổi base, không force-push, không xóa lịch sử.

### Thay đổi mới nhất cần giữ
- `public/admin/index.html`: bổ sung tên trợ năng theo bản ghi cho điều khiển trạng thái/thanh toán đơn hàng, lưu đơn hàng, trạng thái/ghi chú/lưu yêu cầu bảo hành, thao tác sắp xếp/xóa ảnh và công tắc cấu hình.
- `tests/admin-liquid-glass-contract.test.mjs`: contract checks cho các tên trợ năng.
- `.github/workflows/admin-preview-diagnostics.yml`: ảnh PNG và metadata đầy đủ được giữ trong GitHub Actions artifact 14 ngày; chỉ báo cáo ngắn/chẩn đoán được lưu trong Git. Không được quay lại copy cả thư mục screenshots vào branch.
- `tests/admin-upgrade.test.mjs`: kiểm tra chống hồi quy cho artifact-only storage.
- Artifact run #39550214050: `admin-preview-evidence-68`. Artifact run #39550195026: `admin-preview-evidence-67` (ID 12322959928, ~9,16 MB). Đây là bằng chứng source/fixture, không chứng minh workflow backend thật.

### Bắt buộc trước khi làm tiếp
1. Đọc lại MASTER PROMPT, START-HERE, LATEST-STATUS, JSON, PROMPT-COMPLETENESS-AUDIT và reference instructions trên nhánh ADMIN; không dựa vào phần tóm tắt này nếu file nguồn mới hơn.
2. Xác minh HEAD/PR/CI/workflow mới nhất vì commit bàn giao tiếp tục làm HEAD tiến lên. Tìm run được kích hoạt sau commit workflow artifact-only và kiểm tra PR changed-files count; xác nhận không thêm hàng chục PNG vào Git.
3. Nếu workflow vừa commit một báo cáo mới và HEAD lại di chuyển, fetch lại status/JSON/prompt trước khi ghi; không ghi đè các thay đổi mới bằng bản cũ.
4. Tiếp tục audit source-only accessibility/responsive và so sánh ảnh với reference. Ghi rõ SOURCE/fixture vs Preview thật; không tuyên bố authenticated QA đã PASS.
5. Chỉ xử lý Preview bằng đường hợp lệ: cần Preview URL được ủy quyền, build từ source ADMIN hiện tại và quyền truy cập hợp lệ. Không bypass Access, không thao tác secret, không chạy workflow deploy đang đặt `CLOUDFLARE_PAGES_BRANCH=main`.
6. Giữ nguyên các hàng rào: chỉ branch `feature/admin-isolated-handoff-2026-10-20`; không sửa `main`/website tĩnh; không merge PR #111/#108; không Production deploy; không migration/setup, không remote D1/R2/data write.
