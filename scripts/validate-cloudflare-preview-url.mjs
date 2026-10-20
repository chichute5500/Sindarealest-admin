const candidate = process.argv[2] || process.env.PREVIEW_URL || '';
if (!candidate) {
  console.error('Usage: node scripts/validate-cloudflare-preview-url.mjs <preview-url>');
  process.exit(2);
}
try {
  const url = new URL(candidate);
  const allowedHost = /^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i;
  if (url.protocol !== 'https:' || !allowedHost.test(url.hostname)
      || url.hostname.toLowerCase() === 'sindarealest2.pages.dev'
      || url.username || url.password || url.search || url.hash
      || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Refused: only an HTTPS non-production alias under sindarealest2.pages.dev is allowed. Production hostname, paths, credentials, query strings and fragments are rejected.');
  }
  console.log('PASS: Preview URL uses the HTTPS non-production Pages alias ' + url.hostname + '.');
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
