import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectName = 'sindarealest2';
const requestedUrl = process.env.PREVIEW_URL || '';
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const apiToken = String(process.env.CLOUDFLARE_PAGES_READ_TOKEN || '').trim();
const outputDir = path.join(process.cwd(), 'artifacts', 'liquid-glass-preview');
const outputPath = path.join(outputDir, 'deployment-verification.json');

export function validatePreviewUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('PREVIEW_URL must be a valid HTTPS Pages Preview URL.'); }
  if (url.protocol !== 'https:'
      || !/^[a-z0-9-]+\.sindarealest2\.pages\.dev$/i.test(url.hostname)
      || url.hostname.toLowerCase() === 'sindarealest2.pages.dev'
      || url.username || url.password || url.search || url.hash
      || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Refused URL: deployment verification is limited to an HTTPS non-production sindarealest2.pages.dev alias.');
  }
  return url;
}

export function matchesPreviewDeployment(deployment, previewUrlOrOrigin) {
  const targetOrigin = (typeof previewUrlOrOrigin === 'string'
    ? previewUrlOrOrigin
    : previewUrlOrOrigin?.origin || '').toLowerCase();
  if (!targetOrigin) return false;
  const aliases = Array.isArray(deployment?.aliases) ? deployment.aliases : [];
  const origins = aliases.map((alias) => {
    try { return new URL(alias).origin.toLowerCase(); } catch { return ''; }
  });
  let deploymentOrigin = '';
  try { deploymentOrigin = new URL(deployment?.url || '').origin.toLowerCase(); } catch {}
  return origins.includes(targetOrigin) || deploymentOrigin === targetOrigin;
}

export function inspectPreviewDeployment(deployment, expectedBranch = '') {
  const metadata = deployment?.deployment_trigger?.metadata || {};
  const commitHash = String(metadata.commit_hash || '').trim();
  const deploymentBranch = String(metadata.branch || '').trim();
  const latestStage = deployment?.latest_stage || (Array.isArray(deployment?.stages) ? deployment.stages.at(-1) : null);
  const latestStageStatus = String(latestStage?.status || '').toLowerCase();
  const environment = String(deployment?.environment || '').toLowerCase();
  const status = String(deployment?.status || latestStageStatus).toLowerCase();
  const commitHashValid = /^[a-f0-9]{7,64}$/i.test(commitHash);
  const branchMatchesExpected = expectedBranch ? deploymentBranch === expectedBranch : null;
  const verified = environment === 'preview'
    && latestStageStatus === 'success'
    && status === 'success'
    && commitHashValid
    && Boolean(deploymentBranch)
    && (!expectedBranch || branchMatchesExpected === true)
    && Boolean(deployment?.id)
    && deployment?.is_skipped !== true;
  return {
    verified,
    metadata: {
      id: typeof deployment?.id === 'string' ? deployment.id : null,
      url: typeof deployment?.url === 'string' ? deployment.url : null,
      aliases: Array.isArray(deployment?.aliases) ? deployment.aliases.filter(x => typeof x === 'string') : [],
      environment,
      branch: deploymentBranch || null,
      expectedBranch: expectedBranch || null,
      branchMatchesExpected,
      commitHash: commitHashValid ? commitHash : null,
      commitMessage: typeof metadata.commit_message === 'string' ? metadata.commit_message.slice(0, 300) : null,
      createdOn: shortDate(deployment?.created_on),
      modifiedOn: shortDate(deployment?.modified_on),
      status,
      latestStage: {
        name: typeof latestStage?.name === 'string' ? latestStage.name : null,
        status: latestStageStatus || null,
      },
    },
  };
}

function shortDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

async function writeReport(report) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
}

function safeCloudflareErrors(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  return errors.slice(0, 5).map((item) => ({
    code: Number.isInteger(item?.code) ? item.code : null,
    message: String(item?.message || '')
      .replace(/Bearer\\s+\\S+/gi, 'Bearer [REDACTED]')
      .replace(/(token|authorization|secret)\\s*[:=]\\s*[^\\s,;]+/gi, '$1=[REDACTED]')
      .replace(/[a-f0-9]{32,}/gi, '[REDACTED_IDENTIFIER]')
      .replace(/[\\r\\n]+/g, ' ')
      .slice(0, 240),
  })).filter((item) => item.code !== null || item.message);
}

function formatCloudflareErrors(errors) {
  if (!errors.length) return '';
  return ' Sanitized Cloudflare error details: ' + errors.map((item) =>
    [item.code !== null ? 'code ' + item.code : '', item.message].filter(Boolean).join(' — ')
  ).join('; ');
}

function fail(report, message, exitCode = 1) {
  report.passed = false;
  report.status ||= 'FAILED';
  report.error = message;
  return writeReport(report).then(() => {
    console.error(message);
    process.exitCode = exitCode;
  });
}

async function main() {
  const report = {
    sourceKind: 'cloudflare-pages-api-read-only',
    requestedPreviewUrl: null,
    projectName,
    verifiedAtUtc: new Date().toISOString(),
    passed: false,
    status: 'NOT_STARTED',
    deployment: null,
  };

  let previewUrl;
  try { previewUrl = validatePreviewUrl(requestedUrl); }
  catch (error) {
    report.status = 'BLOCKED_INVALID_PREVIEW_URL';
    await fail(report, error.message, 2);
    return;
  }
  report.requestedPreviewUrl = previewUrl.origin;

  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    report.status = 'BLOCKED_CONFIGURATION';
    await fail(report, 'Missing or invalid CLOUDFLARE_ACCOUNT_ID. Store the account ID as a GitHub Actions variable/secret; never place an API token in code.', 2);
    return;
  }
  if (!apiToken) {
    report.status = 'BLOCKED_CONFIGURATION';
    await fail(report, 'Missing CLOUDFLARE_PAGES_READ_TOKEN. Configure a separate read-only Pages API token as a GitHub Actions secret.', 2);
    return;
  }
  const expectedBranch = String(process.env.EXPECTED_DEPLOYMENT_BRANCH || '').trim();
  if (!expectedBranch) {
    report.status = 'BLOCKED_CONFIGURATION';
    await fail(report, 'Missing EXPECTED_DEPLOYMENT_BRANCH; deployment verification must be scoped to the selected fix branch.', 2);
    return;
  }
  report.expectedBranch = expectedBranch;

  const matches = [];
  const branchCandidates = [];
  let totalPages = 1;
  const maxPages = 10;
  for (let page = 1; page <= Math.min(totalPages, maxPages); page += 1) {
    const endpoint = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments`
    );
    endpoint.searchParams.set('env', 'preview');
    // Cloudflare Pages deployments API rejects per_page=100; use its supported 20-item page size.
    endpoint.searchParams.set('per_page', '20');
    endpoint.searchParams.set('page', String(page));

    let response;
    let payload;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      payload = await response.json();
    } catch {
      report.status = 'API_UNAVAILABLE';
      await fail(report, 'Could not read Cloudflare Pages deployment metadata. Check network/API token permissions; no credential values were logged.');
      return;
    }
    if (!response.ok || payload?.success !== true || !Array.isArray(payload?.result)) {
      report.httpStatus = response.status;
      const safeErrors = safeCloudflareErrors(payload);
      if (safeErrors.length) {
        report.apiErrorCodes = safeErrors.map((item) => item.code).filter((code) => code !== null);
        report.apiErrors = safeErrors;
      }
      const detail = formatCloudflareErrors(safeErrors);
      if (response.status === 401) {
        report.status = 'API_AUTHENTICATION_REJECTED';
        await fail(report, 'Cloudflare Pages API returned HTTP 401: the configured API token was not accepted for this request. Replace it with a valid account-scoped Pages Read token and verify the account ID. Secret values and unfiltered response bodies are never logged.' + detail);
      } else if (response.status === 403) {
        report.status = 'API_PERMISSION_DENIED';
        await fail(report, 'Cloudflare Pages API returned HTTP 403: verify the token has Account / Pages / Read permission in the account containing this project. Secret values and unfiltered response bodies are never logged.' + detail);
      } else {
        report.status = 'API_REJECTED';
        await fail(report, 'Cloudflare Pages API did not return a successful Preview deployment list (HTTP ' + response.status + '). Check token validity, Pages Read permission, and account/project scope. Secret values and unfiltered response bodies are never logged.' + detail);
      }
      return;
    }

    totalPages = Number(payload?.result_info?.total_pages || 1);
    for (const deployment of payload.result) {
      if (matchesPreviewDeployment(deployment, previewUrl)) matches.push(deployment);
      const metadata = deployment?.deployment_trigger?.metadata || {};
      const deploymentBranch = String(metadata.branch || '').trim();
      const stage = deployment?.latest_stage || (Array.isArray(deployment?.stages) ? deployment.stages.at(-1) : null);
      if (String(deployment?.environment || '').toLowerCase() === 'preview'
          && deploymentBranch === expectedBranch && branchCandidates.length < 12) {
        const aliases = Array.isArray(deployment?.aliases) ? deployment.aliases
          .filter((alias) => {
            try { return new URL(alias).hostname.toLowerCase().endsWith('.sindarealest2.pages.dev'); }
            catch { return false; }
          }).slice(0, 5) : [];
        branchCandidates.push({
          id: typeof deployment?.id === 'string' ? deployment.id : null,
          url: typeof deployment?.url === 'string' ? deployment.url : null,
          aliases,
          environment: 'preview',
          branch: deploymentBranch,
          commitHash: /^[a-f0-9]{7,64}$/i.test(String(metadata.commit_hash || '')) ? metadata.commit_hash : null,
          status: String(deployment?.status || stage?.status || '').toLowerCase() || null,
          latestStage: {
            name: typeof stage?.name === 'string' ? stage.name : null,
            status: String(stage?.status || '').toLowerCase() || null,
          },
          createdOn: shortDate(deployment?.created_on),
          modifiedOn: shortDate(deployment?.modified_on),
        });
      }
    }
  }

  const uniqueMatches = matches.filter((item, index, all) => item?.id
    ? all.findIndex(other => other?.id === item.id) === index
    : true);
  if (uniqueMatches.length !== 1) {
    report.status = uniqueMatches.length === 0 ? 'DEPLOYMENT_NOT_FOUND' : 'AMBIGUOUS_DEPLOYMENT';
    if (uniqueMatches.length === 0 && branchCandidates.length) {
      report.sameBranchPreviewCandidates = branchCandidates;
      report.note = 'The exact supplied alias was not found among recent Preview deployments. Candidate deployments below are limited to the expected branch; use an alias returned by Cloudflare for the intended current Preview, not a guessed deployment URL.';
    }
    await fail(report, uniqueMatches.length === 0
      ? 'Cloudflare Pages API could not associate the exact Preview alias with a Preview deployment. No screenshots can be archived as verified.'
      : 'The exact Preview alias matched more than one deployment record. Refusing to guess which commit is live.');
    return;
  }

  const deployment = uniqueMatches[0];
  const inspection = inspectPreviewDeployment(deployment, expectedBranch);
  report.deployment = inspection.metadata;
  const verified = inspection.verified;

  if (!verified) {
    report.status = 'DEPLOYMENT_METADATA_UNVERIFIED';
    await fail(report, 'The matched deployment is not a completed Preview on the selected branch with a verified commit SHA. Refusing to archive screenshot stages.');
    return;
  }

  report.passed = true;
  report.status = 'VERIFIED_PREVIEW_DEPLOYMENT';
  await writeReport(report);
  console.log(JSON.stringify({
    passed: report.passed,
    status: report.status,
    requestedPreviewUrl: report.requestedPreviewUrl,
    projectName: report.projectName,
    deployment: {
      environment: report.deployment.environment,
      branch: report.deployment.branch,
      branchMatchesExpected: report.deployment.branchMatchesExpected,
      commitHash: report.deployment.commitHash,
      createdOn: report.deployment.createdOn,
      latestStage: report.deployment.latestStage,
    },
    reportPath: 'artifacts/liquid-glass-preview/deployment-verification.json',
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async () => {
    const report = {
      sourceKind: 'cloudflare-pages-api-read-only',
      passed: false,
      status: 'UNEXPECTED_ERROR',
      error: 'Unexpected deployment verification error; details omitted to avoid leaking request credentials.',
    };
    await writeReport(report).catch(() => {});
    console.error(report.error);
    process.exitCode = 1;
  });
}
