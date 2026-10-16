/**
 * Pure helpers for the send-money flow (recipient + amount validation).
 *
 * Kept dependency-free so it can run in the node test runner and be reused by
 * the send tray UI and the transaction builder.
 */

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DECIMAL_INPUT = /^\d*\.?\d+$/;

/** Currencies the send amount input can be denominated in. */
export const SEND_AMOUNT_CURRENCIES = ["USDC", "ZAR", "EUR"] as const;

export type SendAmountCurrency = (typeof SEND_AMOUNT_CURRENCIES)[number];

export function isSendAmountCurrency(
  value: string,
): value is SendAmountCurrency {
  return (SEND_AMOUNT_CURRENCIES as readonly string[]).includes(value);
}

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

function stripTrailingZeros(value: string) {
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

/**
 * Formats a positive number to at most `decimals` places, truncating (never
 * rounding up) so a converted amount can never exceed the value it came from.
 */
function truncateToDecimals(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const [whole, fraction = ""] = value.toFixed(decimals + 6).split(".");
  const kept = fraction.slice(0, decimals);
  return stripTrailingZeros(kept ? `${whole}.${kept}` : whole);
}

/**
 * Converts an amount the user typed in `currency` into USDC (1 USDC = 1 USD).
 * `rate` is the USD → local rate (e.g. 18 ZAR per USD) published by the forex
 * worker. Conversion truncates to `decimals` places so the result is never
 * more than the amount entered.
 */
export function toUsdcAmount(
  amount: string,
  currency: SendAmountCurrency,
  rate: number,
  decimals = 6,
): string {
  const normalized = normalizeAmountInput(amount);
  if (!DECIMAL_INPUT.test(normalized)) return "0";
  if (currency === "USDC") return normalized;
  if (!Number.isFinite(rate) || rate <= 0) return "0";
  return truncateToDecimals(Number(normalized) / rate, decimals);
}

/**
 * Converts a USDC amount into `currency` for display and for "use max".
 * Truncates so a local amount can never convert back to more than the balance.
 */
export function fromUsdcAmount(
  usdc: string,
  currency: SendAmountCurrency,
  rate: number,
  decimals = 2,
): string {
  const normalized = normalizeAmountInput(usdc);
  if (!DECIMAL_INPUT.test(normalized)) return "0";
  if (currency === "USDC") return normalized;
  if (!Number.isFinite(rate) || rate <= 0) return "0";
  return truncateToDecimals(Number(normalized) * rate, decimals);
}

/**
 * Validates an amount entered in `currency` against a USDC balance by first
 * converting it to USDC. Returns an error message, or null when sendable.
 */
export function validateCurrencySendAmount(
  amount: string,
  currency: SendAmountCurrency,
  balance: string,
  decimals: number,
  rate: number,
): string | null {
  const normalized = normalizeAmountInput(amount);
  if (!normalized) return "Enter an amount.";
  if (!DECIMAL_INPUT.test(normalized)) return "Enter a valid amount.";
  if (!isPositiveAmount(normalized)) return "Enter an amount greater than zero.";
  if (currency !== "USDC" && (!Number.isFinite(rate) || rate <= 0)) {
    return "Exchange rate unavailable. Try again shortly.";
  }

  const usdc = toUsdcAmount(normalized, currency, rate, decimals);
  if (decimals >= 0 && decimalPlaces(usdc) > decimals) {
    return `Use no more than ${decimals} decimal places.`;
  }
  if (compareDecimal(usdc, normalizeAmountInput(balance || "0")) > 0) {
    return "Amount exceeds your available balance.";
  }
  return null;
}
