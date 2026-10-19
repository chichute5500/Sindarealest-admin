import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Accept only an HTTPS /admin URL on a Cloudflare Pages Preview host for this
 * project. Production's apex hostname, embedded credentials, query strings,
 * fragments, custom ports, and non-admin paths are rejected.
 */
export function validateAdminPreviewUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("ADMIN_TEST_URL or the workflow_dispatch preview_url input is required.");
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Preview URL is not a valid absolute URL.");
  }

  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") {
    throw new Error("Preview URL must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("Preview URL must not contain embedded credentials.");
  }
  if (url.port) {
    throw new Error("Preview URL must not use a custom port.");
  }
  if (url.search || url.hash) {
    throw new Error("Preview URL must not contain a query string or fragment.");
  }
  if (hostname === "sindarealest2.pages.dev" || !hostname.endsWith(".sindarealest2.pages.dev")) {
    throw new Error("Only a SinDarealest2 Cloudflare Pages Preview hostname is allowed; Production is blocked.");
  }
  if (url.pathname !== "/admin" && url.pathname !== "/admin/") {
    throw new Error("Preview URL must point to /admin/.");
  }

  return url.href;
}

function runPreflight() {
  if (!process.env.ADMIN_TEST_PASSWORD) {
    throw new Error("ADMIN_TEST_PASSWORD is missing from GitHub Actions Secrets.");
  }
  const safeUrl = validateAdminPreviewUrl(process.env.ADMIN_TEST_URL);
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) {
    throw new Error("GITHUB_OUTPUT is unavailable; this guard is intended for the manual GitHub Actions workflow.");
  }
  // The validator restricts this to a single-line URL with no query/fragment.
  appendFileSync(outputFile, `safe_url=${safeUrl}\n`, { encoding: "utf8", flag: "a" });
  console.log("PASS: Preview hostname, URL path, protocol, and required credential presence validated. URL and password were not printed.");
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  try {
    runPreflight();
  } catch (error) {
    console.error(`BLOCKED: ${error instanceof Error ? error.message : "Preview preflight failed."}`);
    process.exitCode = 1;
  }
}
