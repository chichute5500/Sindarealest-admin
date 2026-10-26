const APPROVED_ADMINISTRATIVE_API_ORIGIN = 'https://provinces.open-api.vn';
const ADMINISTRATIVE_LOOKUP_PATH = /^\/api\/v2\/p\/(?:\d+\/?)?$/;

/**
 * Permit only public, read-only province and commune lookups during live Preview
 * screenshots. This allowlist must never carry the Cloudflare Access service token.
 */
export function isApprovedPreviewExternalRead(rawUrl, method = 'GET') {
  if (String(method).toUpperCase() !== 'GET') return false;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.origin !== APPROVED_ADMINISTRATIVE_API_ORIGIN
      || url.username || url.password || url.hash
      || !ADMINISTRATIVE_LOOKUP_PATH.test(url.pathname)) return false;

  const isProvinceList = url.pathname === '/api/v2/p' || url.pathname === '/api/v2/p/';
  if (isProvinceList) return url.search === '';

  const query = [...url.searchParams.entries()];
  return query.length === 1 && query[0][0] === 'depth' && query[0][1] === '2';
}
