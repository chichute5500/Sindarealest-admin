export function createOrderAccessToken() {
  // Read-only capability token for one order; store only its SHA-256 hash.
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export async function hashOrderAccessToken(token) {
  const bytes = new TextEncoder().encode(String(token || ""));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map(value => value.toString(16).padStart(2, "0")).join("");
}

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
