/** Fail-closed deployment provenance gate for isolated Admin Preview QA / deploy.
 * Reads only Cloudflare Pages metadata; never touches D1 or R2 objects.
 * Retries briefly to account for Pages alias propagation after a safe Preview deploy.
 */
import { main } from './admin-preview-provenance-readonly.mjs';

const expected = String(process.env.GITHUB_SHA || '');
if (!/^[a-f0-9]{40}$/i.test(expected) ||
  process.env.GITHUB_REF !== 'refs/heads/feature/admin-isolated-handoff-2026-10-20')
  throw Error('DEPLOYMENT_SHA_PREFLIGHT_INVALID_BRANCH_OR_COMMIT');
const attempts = 18;
let last = 'NOT_VERIFIED';
for (let index = 0; index < attempts; index++) {
  const report = await main();
  last = report.status;
  if (last === 'REPORTED_SHA_MATCH') {
    console.info('PASS: Cloudflare Pages reports exact Admin Preview alias, branch and source SHA match.');
    process.exit(0);
  }
  if (['NOT_VERIFIED_INVALID_TARGET','NOT_VERIFIED_MISSING_CREDENTIALS','NOT_VERIFIED_BRANCH_MISMATCH'].includes(last))
    break;
  if (index < attempts - 1) await new Promise(resolve => setTimeout(resolve, 5000));
}
throw Error('ADMIN_PREVIEW_DEPLOYMENT_SHA_NOT_VERIFIED: '+last);
