/**
 * Build Cloudflare Access service-auth headers from paired environment secrets.
 * Secrets are returned only for same-origin Preview requests by the caller.
 */
export function buildCloudflareAccessHeaders(env = process.env) {
  const clientId = typeof env.CF_ACCESS_CLIENT_ID === 'string' ? env.CF_ACCESS_CLIENT_ID.trim() : '';
  const clientSecret = typeof env.CF_ACCESS_CLIENT_SECRET === 'string' ? env.CF_ACCESS_CLIENT_SECRET.trim() : '';

  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error('Cloudflare Access service authentication requires both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET.');
  }

  if (!clientId) return {};

  return {
    'cf-access-client-id': clientId,
    'cf-access-client-secret': clientSecret,
  };
}
