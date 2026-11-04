# SinDarealest — R2 image backup

## Purpose and safety

- This feature backs up *actual image bytes*, unlike D1 JSON backups which contain image references.
- Three buckets must be distinct: existing IMAGES (optimized WebP/logo), existing ORIGINALS (private originals), new IMAGE_BACKUPS (private copies).
- The IMAGE_BACKUPS bucket must have **no r2.dev / custom-domain public access**. Do not publish the backup bucket or credentials.
- The engine reads existing source objects and writes **versioned keys** only into IMAGE_BACKUPS. It has **no source delete/put operations**, and does not mirror deletions. Older versions stay available unless an operator explicitly deletes them from R2.
- The UI never claims a backup succeeded based only on an enabled toggle: success requires copying and verifying object size with R2 head.
- This is a supplementary backup within the same Cloudflare account; for disaster recovery against account loss or compromise, also keep an independent off-account copy.

## Cloudflare operator setup (required before enabling)

1. Identify actual Production bucket names for the Pages bindings IMAGES and ORIGINALS. Verify ORIGINALS is private.
2. Create a **new, distinct, private R2 bucket** for IMAGE_BACKUPS. Keep public access disabled. Do not point it to either source bucket.
3. Add the IMAGE_BACKUPS R2 binding to **Pages Production** (and Preview only if testing with disposable buckets). Add an environment variable IMAGE_BACKUP_BUCKET_VERIFIED="true" ONLY after verifying the bucket identities and privacy. Never use real Production buckets for a Preview test.
4. Create a separate Cloudflare Worker using workers/image-backup-worker.js and the private copy of workers/wrangler.image-backup.example.toml. Fill the three verified bucket names and the existing Production D1 database id. In the Worker configuration, set IMAGE_BACKUP_BUCKET_VERIFIED="true" only after checking all three names. Deploy via Cloudflare Wrangler from an authenticated, authorized environment. Pages Functions alone **cannot run scheduled()**.
5. Set a Cron Trigger (template: every 15 minutes). The Admin selection daily/weekly controls when a new scan begins; an unfinished scan resumes on each trigger. Default is disabled until the admin enables it explicitly.
6. Visit Admin > Khác > Sao lưu / Khôi phục > Sao lưu ảnh tự động; verify the readiness state and the Cron Worker heartbeat (last seen within 60 minutes). Select daily/weekly and enable, or use Sao lưu ngay to start and verify a bounded batch. Repeated manual runs resume work safely.
7. Check IMAGE_BACKUPS contains both image-backup-v1/images/... and image-backup-v1/originals/...; verify object sizes, then complete an entire scan. Check errors and last successful completion time in the Admin screen before considering production PASS.

## Operation

- Maximum 64 objects per request to bound runtime and R2 operations. Big existing collections are copied incrementally across many Cron invocations. The Admin button runs one batch, not a fake immediate full backup.
- The D1 settings table stores toggle, cadence, cursor and progress. No D1 migration is necessary.
- If a copy fails or the source changes during a scan, the run stops with an error. The next run retries without advancing past that page. Pre-existing immutable versioned copies are checked and skipped.
- Changes to an image produce a new versioned backup object; deleting a live image does **not** delete backups.
- The backup process itself does not restore files; recovery needs explicit operator review of the correct snapshot and target path. Do not bind backup copies to the storefront or treat a JSON restore as an image restore.
- R2 operations and storage are not unconditionally free. Validate current account usage/cost before enabling automatic schedules.

## QA / release gates

- Verify API endpoints require a valid Admin session (GET/PUT/POST).
- Verify enabling is rejected when the new backup binding is missing or not explicitly verified.
- Verify the manual route is bounded and does not change source buckets.
- Verify the Cron Worker is not HTTP-accessible (returns 404).
- Test with *separate disposable R2 buckets* before production; then verify the first production scan with the owner.
- Never merge/deploy to Production without Owner PASS and real Cloudflare binding validation.


## Download ZIP to phone / restore missing photos

- **Admin > Khác > Sao lưu / Khôi phục > Tải ảnh sao lưu về thiết bị (.ZIP)**.
- This is independent from the optional scheduled IMAGE_BACKUPS R2 bucket. It only needs the existing IMAGES and ORIGINALS bindings on the current environment.
- Press **Tải toàn bộ ảnh ZIP** to enumerate both R2 buckets. The browser groups objects into multiple uncompressed ZIP parts for Android (at most 27 MiB of raw media per part, 60 images per part, and 32 MiB final ZIP hard limit). Press the same button again for each subsequent part. Verify the phone's Downloads folder contains every part.
- The **first ZIP part** contains \`product-index.json\` listing SKUs, titles and product image references; every ZIP part contains \`manifest.json\` with image metadata. The existing **Sao lưu JSON** button is still required for order/customer/payment data. ZIP does not replace JSON.
- Press **Khôi phục ảnh từ ZIP** to choose one part; confirm then re-enter the admin password. Only images **not already present** in the target R2 bucket are uploaded. An atomic If-None-Match: * condition prevents overwrites even if uploads race. Each ZIP part can be retried safely. Restore images first, then use the existing JSON restore if needed.
- The browser validates whole ZIP archives (manifest, CRC, object signatures, unsafe paths, size/count limits, duplicates) before the first restore request; the server independently validates Admin auth, password, destination key and image signature for every image. A conditional R2 If-None-Match header prevents concurrent overwrites.
- Stored ZIP method is deliberately uncompressed (original WebP/JPEG/PNG media is already compressed). Do not extract a ZIP and modify it then attempt to re-upload as a different format. The ZIP restore accepts only archives produced by this app.
- There is NO real Production photo export or restore QA until an authorized environment with both bindings is verified; use disposable Preview R2 sample objects to test first. Never select Production data to test restoration.

- To respect **Cloudflare Workers Free 10ms CPU** limits, ZIP creation and parsing run in the browser via `/admin/image-archive-client.js`; `GET /api/admin/image-archive?mode=object` streams R2 image bytes without CPU-heavy CRC, and `POST ?mode=restore-object` restores only a single missing object after fresh Admin password verification. Do not move full ZIP CRC32 into a Pages Function without measuring CPU.
