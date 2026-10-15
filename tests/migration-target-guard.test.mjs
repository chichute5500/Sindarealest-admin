import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationScript = readFileSync(new URL("../scripts/apply-ai-image-migrations.mjs", import.meta.url), "utf8");
const setupScript = readFileSync(new URL("../scripts/setup-cloudflare.mjs", import.meta.url), "utf8");

assert.match(migrationScript, /process\.env\.CLOUDFLARE_D1_DATABASE\s*\|\|\s*""/, "D1 target must not default to a database");
assert.match(migrationScript, /CLOUDFLARE_D1_TARGET/, "migration must require an explicit environment target");
assert.match(migrationScript, /target === "preview" && database === knownProductionDatabase/, "known Production D1 must be blocked as Preview");
assert.match(migrationScript, /ALLOW_PRODUCTION_D1_MIGRATIONS !== "true"/, "Production migration must require an explicit opt-in");
assert.match(migrationScript, /CONFIRM_PRODUCTION_D1_DATABASE !== database/, "Production migration must require exact database-name confirmation");
assert.doesNotMatch(migrationScript, /CLOUDFLARE_D1_DATABASE\s*\|\|\s*["']sindarealest-db["']/, "script must never silently default to Production");

assert.match(setupScript, /CLOUDFLARE_D1_TARGET:\s*'production'/, "setup wizard must pass an explicit Production target");
assert.match(setupScript, /ALLOW_PRODUCTION_D1_MIGRATIONS:\s*'true'/, "setup wizard must opt in only through its guarded flow");
assert.match(setupScript, /CONFIRM_PRODUCTION_D1_DATABASE:\s*database/, "setup wizard must pass the exact selected database name");
assert.match(setupScript, /productionDbConfirmation !== dbName/, "setup wizard must require a separate exact database-name confirmation");

console.log("PASS: D1 migration requires an explicit target and fail-closed Production confirmation; setup wizard supplies those flags only after exact confirmation.");
