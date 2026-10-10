import { useCallback, useMemo } from "react";
import { useCurrencyStore } from "@/store/currency";
import { useFxRate } from "@/hooks/use-fx-rate";
import { currencySymbol, formatMoney, type CurrencyCode } from "@/lib/money";

/**
 * Shared currency display state.
 *
 * Reads the user's preferred currency and the live USD/ZAR and USD/EUR rates,
 * and exposes helpers to convert USD-denominated values (balances, holdings,
 * portfolio summaries) into the active currency for display.
 */
export function useCurrency() {
  const currency = useCurrencyStore((state) => state.currency);
  const setCurrency = useCurrencyStore((state) => state.setCurrency);
  const { rate: usdZarRate, eurRate: usdEurRate, loading } = useFxRate();

  const rates = useMemo<Record<CurrencyCode, number>>(
    () => ({ USD: 1, ZAR: usdZarRate, EUR: usdEurRate }),
    [usdZarRate, usdEurRate],
  );

  const hasRate = Number.isFinite(rates[currency]) && rates[currency] > 0;
  // Until a rate is available we fall back to showing USD rather than a
  // misleading converted figure.
  const effectiveCurrency: CurrencyCode =
    currency !== "USD" && hasRate ? currency : "USD";
  const symbol = currencySymbol(effectiveCurrency);
  const rate = rates[effectiveCurrency];

  const convert = useCallback(
    (usd: number) => (effectiveCurrency === "USD" ? usd : usd * rate),
    [effectiveCurrency, rate],
  );

  const format = useCallback(
    (usd: number, digits = 2) =>
      `${symbol}${formatMoney(convert(usd), digits)}`,
    [symbol, convert],
  );

  return {
    currency,
    effectiveCurrency,
    setCurrency,
    rate,
    rates,
    hasRate,
    loading,
    symbol,
    convert,
    format,
  };
}
