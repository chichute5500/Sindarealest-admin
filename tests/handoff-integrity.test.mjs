import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readText = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const readJson = path => JSON.parse(readText(path));
const status = readJson('../docs/admin-ui-reference/handoff/current-status.json');
const results = readJson('../docs/admin-ui-reference/handoff/latest-test-results.json');
const startHere = readText('../docs/admin-ui-reference/handoff/START-HERE.md');
const nextPrompt = readText('../docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md');
const masterPrompt = readText('../docs/admin-ui-reference/MASTER-PROMPT-AUTO-HANDOFF.md');

assert.equal(status.repository, results.repository, 'Handoff JSON files must identify the same repository.');
assert.equal(status.activeBranch, results.targetBranch, 'Handoff JSON files must identify the same writable branch.');
assert.equal(status.codeTestSha, results.codeTestSha, 'Current status and test results must agree on the exact tested SHA.');
assert.equal(status.codeTestSha, results.testedCommitSha, 'The tested SHA alias must match codeTestSha.');
assert.equal(status.codeTestSha, results.latestCodeCommitSha, 'The latest-code SHA alias must match codeTestSha.');
assert.equal(status.progressPercent, results.progressPercent, 'Product progress must match across handoff JSON files.');
assert.equal(status.progressStatus, results.progressStatus, 'Progress confidence must match across handoff JSON files.');
assert.equal(status.latestActionsRun.id, results.latestRun.id, 'The status artifact and latest test record must reference the same UI evidence run.');
assert.equal(status.latestActionsRun.testedSha, results.latestRun.headSha, 'UI evidence run SHA must match across handoff JSON files.');
assert.equal(status.latestActionsRun.artifactId, results.latestRun.artifact.id, 'Artifact ID must match across handoff JSON files.');

const statusScreens = Object.keys(status.screenStatuses).sort();
const resultScreens = Object.keys(results.screens).sort();
assert.deepEqual(statusScreens, resultScreens, 'Both handoff JSON files must cover the same screen inventory.');
for (const key of statusScreens) {
  assert.equal(status.screenStatuses[key].status, results.screens[key].status, `Screen status drift: ${key}`);
}
assert.equal(statusScreens.length, 12, 'The current acceptance scope must include all 12 admin screens.');
assert.equal(status.handoffSync.entryPoint, 'docs/admin-ui-reference/handoff/START-HERE.md', 'START-HERE must remain the single handoff entry point.');
assert.equal(status.handoffSync.nextChatPrompt, 'docs/admin-ui-reference/handoff/PROMPT-NEXT-CHAT.md', 'The next-chat prompt path must resolve to the canonical file.');
assert.match(startHere, /PROMPT-NEXT-CHAT\.md/, 'START-HERE must link the next-chat prompt.');
assert.match(startHere, /fetch live/i, 'START-HERE must require a live-state fetch rather than trusting historical checkpoints.');
assert.match(nextPrompt, /START-HERE\.md/, 'The next-chat prompt must point back to the single entry point.');
assert.match(masterPrompt, /START-HERE\.md/, 'The master prompt must use the same single entry point.');

console.log('PASS: handoff JSON/test evidence, 12-screen statuses, progress, artifact pointers and single-entry-point links stay internally consistent.');
