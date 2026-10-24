import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const readText = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const readJson = path => JSON.parse(readText(path));
const status = readJson('../docs/admin-ui-reference/handoff/current-status.json');
const results = readJson('../docs/admin-ui-reference/handoff/latest-test-results.json');
const startHere = readText('../docs/admin-ui-reference/handoff/START-HERE.md');
const nextPrompt = readText('../docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md');
const latestStatusDoc = readText('../docs/admin-ui-reference/handoff/LATEST-STATUS.md');
const screenAudit = readText('../docs/admin-ui-reference/handoff/12-SCREEN-REFERENCE-AUDIT.md');
const masterPrompt = readText('../docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md');
const previewTest = readText('../tests/e2e/admin-isolated-preview.spec.js');
const previewWorkflow = readText('../.github/workflows/admin-preview-diagnostics.yml');

assert.equal(status.repository, results.repository, 'Handoff status files must identify the same repository.');
assert.equal(status.activeBranch, results.targetBranch, 'Handoff status files must identify the same writable branch.');
assert.equal(status.progressPercent, results.progressPercent, 'Product progress must stay synchronized across handoff JSON files.');
assert.equal(status.progressStatus, results.progressStatus, 'Progress confidence must stay synchronized across handoff JSON files.');

const statusScreens = Object.keys(status.screenStatuses).sort();
const resultScreens = Object.keys(results.screens).sort();
assert.deepEqual(statusScreens, resultScreens, 'Both handoff JSON files must cover the same screen inventory.');
for (const key of statusScreens) {
  assert.equal(status.screenStatuses[key].status, results.screens[key].status, `Screen status drift: ${key}`);
}
assert.equal(statusScreens.length, 12, 'The current acceptance scope must include all 12 admin screens.');

assert.ok(!/opened\.type === 'blocked'\)\s*test\.skip/.test(previewTest),
  'A Cloudflare Access gate must not be reported as a successful Playwright run by skipping the remote smoke test.');
assert.ok((previewTest.match(/BLOCKED_CLOUDFLARE_ACCESS: Preview diagnostics were saved/g) || []).length === 2,
  'Both remote Preview tests must fail explicitly with the blocked Access diagnostic when the login page is not reached.');
assert.ok(previewWorkflow.includes("uses: actions/upload-artifact@v7"),
  'The workflow must save screenshot and Playwright evidence as a GitHub Actions artifact.');
assert.ok(previewWorkflow.includes('Verify branch HEAD still matches the tested SHA'),
  'The workflow must verify tested SHA against current branch HEAD after running tests.');
assert.ok(!previewWorkflow.includes('contents: write') &&
  !previewWorkflow.includes('git commit') && !previewWorkflow.includes('git push'),
  'The workflow must not commit evidence or push a follow-up commit to the source branch.');
assert.ok(!previewWorkflow.includes('docs/admin-ui-reference/handoff/**'),
  'Handoff-only evidence updates must not trigger another workflow run.');

for (const [label, sha] of [
  ['current status codeTestSha', status.codeTestSha],
  ['test results codeTestSha', results.codeTestSha],
  ['latestCodeCommitSha', results.latestCodeCommitSha]
]) {
  assert.match(String(sha), /^[0-9a-f]{40}$/i, `${label} must be a complete Git SHA`);
}
assert.ok(results.testedCommitSha === null || /^[0-9a-f]{40}$/i.test(results.testedCommitSha),
  'testedCommitSha must be null until the full local baseline passes, otherwise a complete Git SHA');
assert.ok(Number.isInteger(status.latestActionsRun.id) && status.latestActionsRun.id > 0,
  'The last-known successful/recorded Action pointer must remain identifiable.');
assert.ok(Number.isInteger(results.latestRun.id) && results.latestRun.id > 0,
  'The latest test attempt pointer must remain identifiable.');
assert.match(status.latestActionsRun.url, /^https:\/\/github\.com\/.+\/actions\/runs\/\d+$/,
  'Status Action URL must be a GitHub Actions run URL.');
assert.match(results.latestRun.url, /^https:\/\/github\.com\/.+\/actions\/runs\/\d+$/,
  'Test-result Action URL must be a GitHub Actions run URL.');
assert.equal(status.handoffSync.entryPoint, 'docs/admin-ui-reference/handoff/START-HERE.md',
  'START-HERE must remain the single handoff entry point.');
assert.equal(status.handoffSync.nextChatPrompt, 'docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md',
  'The canonical next-chat prompt path must resolve.');
assert.match(startHere, /\[?PROMPT-NEXT-CHAT\.md\]?/,
  'START-HERE must link the next-chat prompt explicitly.');
assert.match(startHere, /fetch live/i,
  'START-HERE must require a live-state fetch rather than trusting historical checkpoints.');
assert.match(nextPrompt, /START-HERE\.md/,
  'The next-chat prompt must point back to the single entry point.');
const currentCheckpointDocs = [
  ['START-HERE.md', startHere],
  ['PROMPT-NEXT-CHAT.md', nextPrompt],
  ['LATEST-STATUS.md', latestStatusDoc],
  ['12-SCREEN-REFERENCE-AUDIT.md', screenAudit],
];
for (const [label, content] of currentCheckpointDocs) {
  const checkpoint = content.split(/\n---\n/, 1)[0];
  assert.doesNotMatch(checkpoint, /click\s+\*\*Run workflow\*\*|run workflow_dispatch/i,
    `${label} current checkpoint must not tell the user to run an unavailable workflow-dispatch control.`);
}
assert.doesNotMatch(String(status.handoffSync.nextRequiredAction), /run workflow_dispatch|click\s+.*run workflow/i,
  'Current status JSON must not retain the stale manual-dispatch instruction.');
assert.doesNotMatch(String(results.handoffSync.nextRequiredAction), /run workflow_dispatch|click\s+.*run workflow/i,
  'Latest test-result JSON must not retain the stale manual-dispatch instruction.');

const historyRoot = new URL('../docs/admin-ui-reference/handoff/history/', import.meta.url);
const historyFiles = [];
const walkHistory = directory => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) {
      assert.ok(!entry.name.startsWith('legacy-'), `Obsolete duplicated handoff snapshot folder must not return: ${entry.name}`);
      walkHistory(path);
    } else {
      historyFiles.push(path.pathname);
    }
  }
};
assert.ok(existsSync(historyRoot), 'Compact per-run test history must remain available.');
walkHistory(historyRoot);
assert.equal(historyFiles.filter(path => path.toLowerCase().endsWith('.png')).length, 0,
  'Generated Playwright screenshot matrices must stay in Actions artifacts, not the Git history.');
assert.ok(historyFiles.some(path => path.endsWith('/report.md')) || historyFiles.some(path => path.endsWith('/preview-diagnostics.json')),
  'Keep compact per-run text/JSON evidence while pruning generated screenshot matrices.');

assert.match(masterPrompt, /START-HERE\.md/,
  'The master prompt must point to the same single entry point.');

console.log('PASS: handoff repository/branch, 12-screen statuses, progress, SHA formats and canonical next-chat links remain valid; Action records may advance independently.');
