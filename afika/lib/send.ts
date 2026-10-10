/**
 * Pure helpers for the send-money flow (recipient + amount validation).
 *
 * Kept dependency-free so it can run in the node test runner and be reused by
 * the send tray UI and the transaction builder.
 */

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DECIMAL_INPUT = /^\d*\.?\d+$/;

export function normalizeAmountInput(value: string) {
  return value.replace(/,/g, ".").trim();
}

export function normalizeRecipient(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEvmAddress(value: string) {
  return EVM_ADDRESS.test(value.trim());
}

/** Returns an error message, or null when the recipient is usable. */
export function validateRecipient(
  recipient: string,
  ownAddress?: string | null,
): string | null {
  const trimmed = recipient.trim();
  if (!trimmed) {
    return "Enter a recipient address.";
  }
  if (!isValidEvmAddress(trimmed)) {
    return "Enter a valid wallet address.";
  }
  if (
    ownAddress &&
    normalizeRecipient(ownAddress) === normalizeRecipient(trimmed)
  ) {
    return "You cannot send to your own wallet.";
  }
  return null;
}

export function decimalPlaces(value: string) {
  const normalized = normalizeAmountInput(value);
  const [, fraction = ""] = normalized.split(".");
  return fraction.length;
}

/**
 * Compares two non-negative decimal strings without floating point so large
 * balances and tiny amounts stay exact. Returns -1, 0 or 1.
 */
export function compareDecimal(a: string, b: string) {
  const [aWhole, aFraction = ""] = normalizeAmountInput(a).split(".");
  const [bWhole, bFraction = ""] = normalizeAmountInput(b).split(".");
  const width = Math.max(aFraction.length, bFraction.length);
  const aScaled = BigInt((aWhole || "0") + aFraction.padEnd(width, "0"));
  const bScaled = BigInt((bWhole || "0") + bFraction.padEnd(width, "0"));
  if (aScaled < bScaled) return -1;
  if (aScaled > bScaled) return 1;
  return 0;
}

export function isPositiveAmount(value: string) {
  const normalized = normalizeAmountInput(value);
  return DECIMAL_INPUT.test(normalized) && compareDecimal(normalized, "0") > 0;
}

/** Returns an error message, or null when the amount is sendable. */
export function validateSendAmount(
  amount: string,
  balance: string,
  decimals: number,
): string | null {
  const normalized = normalizeAmountInput(amount);
  if (!normalized) {
    return "Enter an amount.";
  }
  if (!DECIMAL_INPUT.test(normalized)) {
    return "Enter a valid amount.";
  }
  if (!isPositiveAmount(normalized)) {
    return "Enter an amount greater than zero.";
  }
  if (decimals >= 0 && decimalPlaces(normalized) > decimals) {
    return `Use no more than ${decimals} decimal places.`;
  }
  if (compareDecimal(normalized, normalizeAmountInput(balance || "0")) > 0) {
    return "Amount exceeds your available balance.";
  }
  return null;
}

export function isSendable(
  recipient: string,
  amount: string,
  balance: string,
  decimals: number,
  ownAddress?: string | null,
) {
  return (
    validateRecipient(recipient, ownAddress) === null &&
    validateSendAmount(amount, balance, decimals) === null
  );
}
