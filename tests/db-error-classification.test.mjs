import assert from "node:assert/strict";
import { genericDbError } from "../functions/_lib.js";

const originalConsoleError = console.error;
const logEntries = [];
console.error = (...args) => logEntries.push(args);

try {
  const duplicate = await genericDbError(
    new Error("D1_ERROR: UNIQUE constraint failed: products.sku"),
    "admin.products.update",
  );
  assert.equal(duplicate.status, 409);
  assert.match((await duplicate.json()).error, /SKU/i);

  const missingColumn = await genericDbError(
    new Error("D1_ERROR: no such column: products.sku_verified"),
    "admin.products.update",
  );
  assert.equal(missingColumn.status, 503);
  assert.match((await missingColumn.json()).error, /Cấu trúc D1/i);

  const genericD1Failure = await genericDbError(
    new Error("D1_ERROR: transient database execution failure"),
    "admin.products.update",
  );
  assert.equal(genericD1Failure.status, 500);
  assert.doesNotMatch((await genericD1Failure.json()).error, /chạy hai tệp SQL/i);

  assert.equal(logEntries.length, 3, "each caught database error should be logged once");
  assert.equal(logEntries[0][0], "[SinDarealest] Database operation failed");
  assert.equal(logEntries[0][1].operation, "admin.products.update");
  assert.match(logEntries[0][1].errorMessage, /UNIQUE constraint failed/);
  assert.ok(logEntries[0][1].errorMessage.length <= 500, "logged error message must be bounded");
  console.log("PASS: database errors are logged with bounded technical context and classified narrowly.");
} finally {
  console.error = originalConsoleError;
}
