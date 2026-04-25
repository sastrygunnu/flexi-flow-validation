import crypto from "node:crypto";

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function createMockArcTxHash() {
  return `0x${randomHex(32)}`;
}

export function createMockNanopaymentId() {
  return `np_${randomHex(8)}`;
}

export function createMockInvoiceId() {
  return `inv_${randomHex(6)}`;
}

