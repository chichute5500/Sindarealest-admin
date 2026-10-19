import assert from "node:assert/strict";
import { validateAdminPreviewUrl } from "../scripts/admin-preview-url.mjs";

assert.equal(
  validateAdminPreviewUrl("https://9c82d72c.sindarealest2.pages.dev/admin/"),
  "https://9c82d72c.sindarealest2.pages.dev/admin/",
  "a valid project Preview URL should be preserved",
);
assert.equal(
  validateAdminPreviewUrl("https://fix-branch.sindarealest2.pages.dev/admin"),
  "https://fix-branch.sindarealest2.pages.dev/admin",
  "the /admin path without a trailing slash is valid",
);

const unsafeUrls = [
  "",
  "not-a-url",
  "http://preview.sindarealest2.pages.dev/admin/",
  "https://sindarealest2.pages.dev/admin/",
  "https://example.com/admin/",
  "https://sindarealest2.pages.dev.evil.example/admin/",
  "https://user:password@preview.sindarealest2.pages.dev/admin/",
  "https://preview.sindarealest2.pages.dev/admin/?token=secret",
  "https://preview.sindarealest2.pages.dev/admin/#session",
  "https://preview.sindarealest2.pages.dev:8443/admin/",
  "https://preview.sindarealest2.pages.dev/products/",
];
for (const value of unsafeUrls) {
  assert.throws(() => validateAdminPreviewUrl(value), Error);
}

console.log("PASS: Admin Preview URL allowlist rejects Production, off-domain, insecure, and credential-bearing targets.");
