export const FULFILLMENT_TYPES = Object.freeze(["in_stock", "made_to_order", "unclassified"]);

export function normalizeFulfillmentType(value) {
  return FULFILLMENT_TYPES.includes(value) ? value : "unclassified";
}

export function createOrderAccessToken() {
  // Read-only capability token for one order; store only its SHA-256 hash.
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export async function hashOrderAccessToken(token) {
  const bytes = new TextEncoder().encode(String(token || ""));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map(value => value.toString(16).padStart(2, "0")).join("");
}

export function isValidPaymentBankId(value) { return typeof value === "string" && /^[a-z0-9-]{2,32}$/.test(value); }
export function isValidPaymentAccountNo(value) { return typeof value === "string" && /^\d{6,19}$/.test(value); }
export function isValidPaymentAccountName(value) { return typeof value === "string" && /^[A-Z0-9 ]{5,50}$/.test(value); }

export function validPublicQrImageKey(value) {
  return typeof value === "string" && /^qr-[0-9a-f-]{36}\.(?:png|jpe?g|webp)$/.test(value);
}

export function summarizePaymentRows(rows, total) {
  let received = 0, refunded = 0;
  for (const row of rows || []) {
    const amount = Number(row.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    if (row.direction === "received") received += amount;
    else if (row.direction === "refunded") refunded += amount;
  }
  const netReceived = received - refunded;
  const knownTotal = total === null || total === undefined || total === "" ? null : (Number.isSafeInteger(Number(total)) ? Number(total) : null);
  return {
    receivedAmount: received, refundedAmount: refunded, netReceivedAmount: netReceived,
    remainingBalance: knownTotal === null ? null : Math.max(knownTotal - netReceived, 0),
    overpaidAmount: knownTotal === null ? null : Math.max(netReceived - knownTotal, 0),
  };
}
