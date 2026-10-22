import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readText = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const readJson = path => JSON.parse(readText(path));
const status = readJson('../docs/admin-ui-reference/handoff/current-status.json');
const results = readJson('../docs/admin-ui-reference/handoff/latest-test-results.json');
const startHere = readText('../docs/admin-ui-reference/handoff/START-HERE.md');
const nextPrompt = readText('../docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md');
const masterPrompt = readText('../docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md');

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

for (const [label, sha] of [
  ['current status codeTestSha', status.codeTestSha],
  ['test results codeTestSha', results.codeTestSha],
  ['testedCommitSha', results.testedCommitSha],
  ['latestCodeCommitSha', results.latestCodeCommitSha]
]) {
  assert.match(String(sha), /^[0-9a-f]{40}$/i, `${label} must be a complete Git SHA`);
}
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
assert.match(masterPrompt, /START-HERE\.md/,
  'The master prompt must point to the same single entry point.');

console.log('PASS: handoff repository/branch, 12-screen statuses, progress, SHA formats and canonical next-chat links remain valid; Action records may advance independently.');
