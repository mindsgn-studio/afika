import { useEffect, useState } from "react";
import { fetchFxRates } from "@/lib/api";
import { useCurrencyStore } from "@/store/currency";

type Rates = { ZAR: number; EUR: number };
const EMPTY_RATES: Rates = { ZAR: 0, EUR: 0 };
let cachedRates = EMPTY_RATES;

function validRate(value: string | undefined) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

/** Loads current conversion rates from Afika's API when currency is selected. */
export function useFxRate() {
  const currency = useCurrencyStore((state) => state.currency);
  const [rates, setRates] = useState<Rates>(cachedRates);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currency === "USD") return;
    let active = true;
    setLoading(true);
    fetchFxRates()
      .then((result) => {
        const next = { ZAR: validRate(result.ZAR), EUR: validRate(result.EUR) };
        cachedRates = next;
        if (active) setRates(next);
      })
      .catch((error) => console.log("useFxRate error:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currency]);

  return { rate: rates.ZAR, eurRate: rates.EUR, loading };
}
