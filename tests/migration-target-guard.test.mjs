import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationScript = readFileSync(new URL("../scripts/apply-ai-image-migrations.mjs", import.meta.url), "utf8");

assert.match(migrationScript, /process\.env\.CLOUDFLARE_D1_DATABASE\s*\|\|\s*""/, "D1 target must not default to a database");
assert.match(migrationScript, /CLOUDFLARE_D1_TARGET/, "migration must require an explicit environment target");
assert.match(migrationScript, /target === "preview" && database === knownProductionDatabase/, "known Production D1 must be blocked as Preview");
assert.match(migrationScript, /ALLOW_PRODUCTION_D1_MIGRATIONS !== "true"/, "Production migration must require an explicit opt-in");
assert.match(migrationScript, /CONFIRM_PRODUCTION_D1_DATABASE !== database/, "Production migration must require exact database-name confirmation");
assert.doesNotMatch(migrationScript, /CLOUDFLARE_D1_DATABASE\s*\|\|\s*["']sindarealest-db["']/, "script must never silently default to Production");

console.log("PASS: D1 migration requires an explicit target and fail-closed Production confirmation.");
