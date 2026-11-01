/** Read-only Cloudflare Pages deployment metadata; never deploys or changes remote data. */
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT = 'sindarealest-admin-preview';
export const BRANCH = 'feature-admin-isolated-handoff-2026-10-20';
export const ALIAS = 'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/';
export const APPROVED_PREVIEWS = new Map([
  ['feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev', BRANCH],
  ['admin-glass-2026-10-30.sindarealest-admin-preview.pages.dev', 'admin-glass-2026-10-30'],
  ['admin-dock-jump-2026-11-01.sindarealest-admin-preview.pages.dev', 'admin-dock-jump-2026-11-01']
]);
const shaValid = value => /^[a-f0-9]{40}$/i.test(String(value || ''));
const hostOf = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.hostname.toLowerCase() : null; } catch { return null; } };

export function sanitizedDeployments(data) {
  return (Array.isArray(data) ? data : []).map(item => ({
    id: typeof item.id === 'string' ? item.id : null,
    aliases: (Array.isArray(item.aliases) ? item.aliases : []).map(hostOf).filter(Boolean),
    environment: item.environment || null,
    stage: item.latest_stage?.status || null,
    createdOn: item.created_on || null,
    branch: item.deployment_trigger?.metadata?.branch || null,
    sha: item.deployment_trigger?.metadata?.commit_hash || null
  }));
}

export function safeApiErrorCodes(errors) {
  return (Array.isArray(errors) ? errors : []).map(e => Number(e?.code))
    .filter(v => Number.isSafeInteger(v) && v > 0).slice(0,5);
}

export function assessDeployments(deployments, targetAlias = ALIAS, expectedSha = '') {
  const target = hostOf(targetAlias);
  if (!target || !APPROVED_PREVIEWS.has(target) || !target.endsWith('.' + PROJECT + '.pages.dev') || !shaValid(expectedSha))
    return { status: 'NOT_VERIFIED_INVALID_TARGET' };
  const matches = sanitizedDeployments(deployments)
    .filter(item => item.environment === 'preview' && item.stage === 'success' && item.aliases.includes(target))
    .sort((a,b) => (b.createdOn || '').localeCompare(a.createdOn || ''));
  if (!matches.length) return { status: 'NOT_VERIFIED_ALIAS_UNMAPPED', expectedSha, aliasHost: target };
  const selected = matches[0];
  const details = { expectedSha, observedSha: selected.sha, branch: selected.branch, deploymentId: selected.id, createdOn: selected.createdOn, aliasHost: target, evidenceScope: 'CLOUDFLARE_PAGES_API_REPORTED_DEPLOYMENT_METADATA_ONLY' };
  if (selected.branch !== APPROVED_PREVIEWS.get(target)) return { status: 'NOT_VERIFIED_BRANCH_MISMATCH', ...details };
  if (!shaValid(selected.sha)) return { status: 'NOT_VERIFIED_INVALID_COMMIT', ...details };
  return { status: selected.sha.toLowerCase() === expectedSha.toLowerCase() ? 'REPORTED_SHA_MATCH' : 'REPORTED_SHA_MISMATCH', ...details };
}

export async function main(env = process.env) {
  const sha = env.EXPECTED_FEATURE_SHA || env.GITHUB_SHA || '';
  let result;
  if (!shaValid(sha)) result = { status: 'NOT_VERIFIED_INVALID_TARGET' };
  else if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN)
    result = { status: 'NOT_VERIFIED_MISSING_CREDENTIALS', expectedSha: sha };
  else {
    const url = 'https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID) + '/pages/projects/' + PROJECT + '/deployments';
    try {
      const response = await fetch(url, { method: 'GET', headers: { Authorization: 'Bearer ' + env.CLOUDFLARE_API_TOKEN }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        result = { status: 'NOT_VERIFIED_API_HTTP_ERROR', httpStatus: response.status,
          expectedSha: sha, apiErrorCodes: safeApiErrorCodes(payload?.errors) };
      }
      else {
        const data = await response.json();
        result = data?.success === true && Array.isArray(data.result) ? assessDeployments(data.result, env.ADMIN_PREVIEW_ALIAS || ALIAS, sha) : { status: 'NOT_VERIFIED_API_RESPONSE', expectedSha: sha };
      }
    } catch (error) { result = { status: 'NOT_VERIFIED_API_REQUEST_FAILED', errorType: error?.name || 'Error', expectedSha: sha }; }
  }
  result.checkedAtUtc = new Date().toISOString();
  result.project = PROJECT;
  result.deploymentPerformed = false;
  result.businessWritesPerformed = false;
  const folder = join(process.cwd(), 'artifacts', 'admin-preview-evidence', shaValid(sha) ? sha.slice(0,12) : 'unknown');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'deployment-provenance-readonly.json'), JSON.stringify(result, null, 2) + '\n');
  console.info('[ADMIN_PREVIEW_DEPLOYMENT_PROVENANCE] ' + JSON.stringify(result));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, '\n### Read-only Pages deployment provenance\n\n- Status: ' + result.status + '\n- Cloudflare-reported deployment metadata only, not served-byte/D1 proof\n- No deployment or business write\n');
  return result;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
