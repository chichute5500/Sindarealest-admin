import { buildCloudflareAccessHeaders } from "./cloudflare-access-service-token.mjs";

export function validatePreviewUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("PREVIEW_URL must be a valid HTTPS Pages Preview URL."); }
  if (url.protocol !== "https:"
      || !/^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i.test(url.hostname)
      || url.hostname.toLowerCase() === "sindarealest2.pages.dev"
      || url.username || url.password || url.search || url.hash
      || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("Refused URL: SEO diagnostic is limited to a non-production sindarealest2.pages.dev Preview origin.");
  }
  return url;
}

export function assessPreviewSeoResponse(path, response, body = "", expectedOrigin = "") {
  const contentType = response.headers.get("content-type") || "";
  const robotsTag = response.headers.get("x-robots-tag") || "";
  const cacheControl = response.headers.get("cache-control") || "";
  const common = { path, httpStatus: response.status, contentType, xRobotsTag: robotsTag || null, cacheControl: cacheControl || null };

  if (response.status >= 300 && response.status < 400) {
    return { ...common, result: "ACCESS_REDIRECT", note: "Request redirected; app response was not verified." };
  }

  if (path === "/") {
    if (response.status !== 200 || !/text\\/html/i.test(contentType)) {
      return { ...common, result: "UNEXPECTED_ROOT_RESPONSE", note: "Preview root did not return HTML 200." };
    }
    if (!/\\bnoindex\\b/i.test(robotsTag)) {
      return { ...common, result: "MISSING_NOINDEX", note: "Preview root response lacks an observable X-Robots-Tag noindex directive." };
    }
    if (expectedOrigin) {
      const expectedTags = [
        '<link rel="canonical" href="' + expectedOrigin + '/">',
        '<meta property="og:url" content="' + expectedOrigin + '/">',
        '<meta property="og:image" content="' + expectedOrigin + '/og-sindarealest.jpg">',
        '<meta name="twitter:image" content="' + expectedOrigin + '/og-sindarealest.jpg">',
      ];
      if (expectedTags.some((tag) => !body.includes(tag))) {
        return { ...common, result: "ROOT_METADATA_MISMATCH", note: "Preview root canonical/Open Graph/Twitter image URLs do not match the deployed Preview origin." };
      }
    }
    return { ...common, result: "PASS", note: "Preview root carries noindex and origin-correct canonical/social metadata." };
  }
  if (path === "/robots.txt") {
    if (response.status === 200 && /text\/plain/i.test(contentType)
        && body === "User-agent: *\nDisallow: /\n") {
      return { ...common, result: "PASS", note: "Preview robots.txt blocks crawling and does not advertise a sitemap." };
    }
    return { ...common, result: "ROBOTS_POLICY_MISMATCH", note: "Preview robots.txt did not match the expected crawl-block response." };
  }

  if (path === "/sitemap.xml") {
    if (response.status === 404 && /\bnoindex\b/i.test(robotsTag)
        && /no-store/i.test(cacheControl)
        && body === "Sitemap unavailable on Preview hosts") {
      return { ...common, result: "PASS", note: "Preview sitemap is suppressed before product data is exposed." };
    }
    return { ...common, result: "SITEMAP_POLICY_MISMATCH", note: "Preview sitemap did not return the expected 404/noindex/no-store response." };
  }

  return { ...common, result: "UNSUPPORTED_PATH", note: "The diagnostic path is not allowlisted." };
}

export async function runPreviewSeoDiagnostic({ previewUrl, env = process.env, fetchImpl = fetch } = {}) {
  const report = { kind: "read-only-preview-seo-diagnostic", status: "NOT_VERIFIED", previewOrigin: null, checks: [] };
  let base;
  try {
    base = validatePreviewUrl(previewUrl || env.PREVIEW_URL || "");
    report.previewOrigin = base.origin;
  } catch {
    report.status = "BLOCKED_INVALID_PREVIEW_URL";
    report.checks.push({ result: report.status, note: "Preview URL is missing or outside the allowlisted project Preview hostnames." });
    return report;
  }

  let headers;
  try { headers = buildCloudflareAccessHeaders(env); }
  catch {
    report.status = "BLOCKED_ACCESS_CONFIGURATION";
    report.checks.push({ result: report.status, note: "Cloudflare Access service-token configuration is incomplete." });
    return report;
  }

  for (const path of ["/", "/robots.txt", "/sitemap.xml"]) {
    try {
      const response = await fetchImpl(new URL(path, base), {
        method: "GET",
        headers,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.text();
      report.checks.push(assessPreviewSeoResponse(path, response, body, base.origin));
    } catch {
      report.checks.push({ path, result: "FETCH_FAILED", note: "Preview endpoint could not be fetched; no response body or credential was logged." });
    }
  }

  const failed = report.checks.filter((item) => item.result !== "PASS");
  report.status = failed.length ? "WARNINGS" : "PASS";
  return report;
}

async function main() {
  const report = await runPreviewSeoDiagnostic();
  console.log(JSON.stringify(report, null, 2));
  for (const check of report.checks) {
    if (check.result !== "PASS") {
      console.log("::warning::Preview SEO diagnostic " + check.result + " for " + (check.path || "configuration") + ": " + check.note);
    }
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === new URL("file://" + process.argv[1]).pathname) {
  await main();
}
