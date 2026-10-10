export function formatMoney(value?: number | string | null, digits = 2) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatSignedMoney(value?: number | null) {
  const n = value ?? 0;
  const abs = formatMoney(Math.abs(n));
  if (n < 0) return `-$${abs}`;
  if (n > 0) return `+$${abs}`;
  return `$${abs}`;
}

export function parseNumber(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export const SUPPORTED_CURRENCIES = ["USD", "ZAR", "EUR"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function currencySymbol(currency: CurrencyCode = "USD") {
  if (currency === "ZAR") return "R";
  if (currency === "EUR") return "€";
  return "$";
}

export function formatCurrency(
  value?: number | string | null,
  currency: CurrencyCode = "USD",
  digits = 2,
) {
  return `${currencySymbol(currency)}${formatMoney(value, digits)}`;
}

type TransactionAmountSource = {
  usdAmount?: string | number | null;
  zarAmount?: string | number | null;
  eurAmount?: string | number | null;
  amount?: string | number | null;
  tokenSymbol?: string;
};

/**
 * Resolves the amount to show for a transaction in the active currency.
 * Prefers the historical ZAR/EUR value stamped by the backend, then falls back
 * to converting the USD value with the live rate, then to the raw token amount.
 */
export function formatTransactionAmount(
  tx: TransactionAmountSource,
  currency: CurrencyCode = "USD",
  rate = 0,
) {
  const usd = parseNumber(tx.usdAmount);
  const hasRate = Number.isFinite(rate) && rate > 0;

  if (currency === "ZAR") {
    const storedZar = parseNumber(tx.zarAmount);
    if (storedZar > 0) return formatCurrency(storedZar, "ZAR");
    if (usd > 0 && hasRate) return formatCurrency(usd * rate, "ZAR");
  } else if (currency === "EUR") {
    const storedEur = parseNumber(tx.eurAmount);
    if (storedEur > 0) return formatCurrency(storedEur, "EUR");
    if (usd > 0 && hasRate) return formatCurrency(usd * rate, "EUR");
  } else if (usd > 0) {
    return formatCurrency(usd, "USD");
  }

  const amount = parseNumber(tx.amount);
  if (amount > 0 && tx.tokenSymbol) {
    return `${formatMoney(amount, 2).replace(/\.00$/, "")} ${tx.tokenSymbol}`;
  }

  return tx.tokenSymbol || "Pending";
}
