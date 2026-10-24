import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPut as updatePaymentQr } from "../functions/api/admin/payment-qr.js";

const SECRET = "payment-qr-activation-race-session-secret-long-enough";
const PASSWORD = "payment-qr-activation-race-admin-password";
const session = await createSession(SECRET);
const PENDING_A = "qr-11111111-1111-4111-8111-111111111111.png";
const PENDING_B = "qr-22222222-2222-4222-8222-222222222222.png";
const ACTIVE_OLD = "qr-33333333-3333-4333-8333-333333333333.png";

function makeDB({ raceDuringHead = false } = {}) {
  const state = new Map(Object.entries({
    payment_qr_active: "0",
    payment_qr_active_key: ACTIVE_OLD,
    payment_qr_pending_key: PENDING_A,
    payment_qr_bank_name: "Ngân hàng cũ",
    payment_qr_account_number: "0000000000",
    payment_qr_account_name: "NGUYEN VAN CU",
    payment_qr_instructions: "Thông tin cũ",
    payment_qr_draft_bank_name: "Ngân hàng thử mới",
    payment_qr_draft_account_number: "1234567890",
    payment_qr_draft_account_name: "NGUYEN VAN A",
    payment_qr_draft_instructions: "Chuyển khoản đúng nội dung",
  }));
  const calls = { batches: [], statements: [] };
  const DB = {
    state, calls,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async all() {
          if (sql.startsWith("SELECT key,value FROM settings")) {
            return { results: this.values.filter(key => state.has(key)).map(key => ({ key, value: state.get(key) })) };
          }
          throw new Error("Unexpected query in payment QR race test: " + sql);
        },
      };
      return statement;
    },
    async batch(statements) {
      const snapshots = statements.map(statement => ({ sql: statement.sql, values: statement.values }));
      calls.batches.push(snapshots);
      calls.statements.push(...snapshots);
      const results = [];
      let previousChanges = 0;
      for (const statement of statements) {
        const { sql, values } = statement;
        let changes = 0;
        if (/^UPDATE settings SET value=''/.test(sql)) {
          const [expectedPending, bankName, accountNumber, accountName, instructions] = values;
          const guardPassed =
            state.get("payment_qr_pending_key") === expectedPending &&
            state.get("payment_qr_draft_bank_name") === bankName &&
            state.get("payment_qr_draft_account_number") === accountNumber &&
            state.get("payment_qr_draft_account_name") === accountName &&
            state.get("payment_qr_draft_instructions") === instructions;
          if (guardPassed) {
            state.set("payment_qr_pending_key", "");
            changes = 1;
          }
        } else if (sql.startsWith("INSERT INTO settings") && /WHERE changes\(\)=1/.test(sql)) {
          if (previousChanges === 1) {
            state.set(values[0], String(values[1]));
            changes = 1;
          }
        } else if (sql.startsWith("INSERT INTO settings")) {
          // Simulate the pre-fix unconditional upsert. This makes the race test
          // fail against the old handler: it activates stale QR data and clears B.
          state.set(values[0], String(values[1]));
          changes = 1;
        } else if (sql.startsWith("INSERT INTO audit_logs")) {
          if (!/WHERE changes\(\)=1/.test(sql) || previousChanges === 1) changes = 1;
        } else {
          throw new Error("Unexpected batch SQL in payment QR race test: " + sql);
        }
        results.push({ success: true, meta: { changes } });
        previousChanges = changes;
      }
      return results;
    },
  };
  const IMAGES = {
    async head(key) {
      assert.equal(key, PENDING_A, "activation must inspect the pending key read at preflight");
      if (raceDuringHead) state.set("payment_qr_pending_key", PENDING_B);
      return { key, size: 256 };
    },
  };
  return { DB, IMAGES, state, calls };
}

async function activate(db, IMAGES) {
  return updatePaymentQr({
    request: new Request("https://shop.example/api/admin/payment-qr", {
      method: "PUT",
      headers: {
        Cookie: "sd_admin_session=" + session,
        Origin: "https://shop.example",
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "activate", verified: true }),
    }),
    env: { DB: db, IMAGES, ADMIN_PASSWORD: PASSWORD, SESSION_SECRET: SECRET },
  });
}

{
  const fixture = makeDB({ raceDuringHead: true });
  const response = await activate(fixture.DB, fixture.IMAGES);
  assert.equal(response.status, 409,
    "activation must refuse if a concurrent upload replaces the pending QR after preflight");
  assert.equal(fixture.state.get("payment_qr_pending_key"), PENDING_B,
    "a concurrent new pending QR must not be erased by activation of the stale key");
  assert.equal(fixture.state.get("payment_qr_active_key"), ACTIVE_OLD,
    "a stale activation must not replace the active QR key");
  assert.equal(fixture.state.get("payment_qr_active"), "0",
    "a stale activation must not enable the QR");
  assert.equal(fixture.state.get("payment_qr_bank_name"), "Ngân hàng cũ",
    "a stale activation must not overwrite active bank details");
  assert.equal(fixture.calls.batches.length, 1);
  assert.match(fixture.calls.batches[0][0].sql,
    /^UPDATE settings SET value=''[\s\S]*payment_qr_pending_key[\s\S]*payment_qr_draft_bank_name/,
    "the atomic compare-and-swap must claim the expected pending image and confirm the bank draft snapshot");
}

{
  const fixture = makeDB();
  const response = await activate(fixture.DB, fixture.IMAGES);
  assert.equal(response.status, 200, "a valid unchanged QR draft should still activate");
  assert.equal(fixture.state.get("payment_qr_active_key"), PENDING_A);
  assert.equal(fixture.state.get("payment_qr_active"), "1");
  assert.equal(fixture.state.get("payment_qr_pending_key"), "");
  assert.equal(fixture.state.get("payment_qr_bank_name"), "Ngân hàng thử mới");
  assert.equal(fixture.state.get("payment_qr_account_number"), "1234567890");
}

console.log("PASS: QR activation protects a concurrent pending upload and preserves valid activation.");
