import { appendFileSync } from "node:fs";
import { validateAdminPreviewUrl } from "./admin-preview-url.mjs";

try {
  const safeUrl = validateAdminPreviewUrl(process.env.PREVIEW_URL);
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    throw new Error("GITHUB_OUTPUT is unavailable; use this guard from the manual GitHub Actions workflow.");
  }
  appendFileSync(outputFile, `safe_url=${safeUrl}\n`, { encoding: "utf8", flag: "a" });
  console.log("PASS: storefront Preview URL is HTTPS and restricted to this project's non-Production Pages deployment.");
} catch (error) {
  console.error(`BLOCKED: ${error instanceof Error ? error.message : "Preview URL validation failed."}`);
  process.exitCode = 1;
}
