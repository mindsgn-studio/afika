/**
 * Currency conversion rates.
 *
 * The forex worker's Firestore `fxRates` documents are gone. The API stamps
 * historical ZAR/EUR values on balances and transactions, and optional
 * `EXPO_PUBLIC_USD_ZAR_RATE` / `EXPO_PUBLIC_USD_EUR_RATE` values provide a
 * fallback for converting live USD figures. With no rate configured the app
 * displays USD.
 */

function envRate(value: string | undefined) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

const USD_ZAR_RATE = envRate(process.env.EXPO_PUBLIC_USD_ZAR_RATE);
const USD_EUR_RATE = envRate(process.env.EXPO_PUBLIC_USD_EUR_RATE);

export function useFxRate() {
  return {
    /** Live USD → ZAR rate, or 0 when not configured. */
    rate: USD_ZAR_RATE,
    /** Live USD → EUR rate, or 0 when not configured. */
    eurRate: USD_EUR_RATE,
    loading: false,
  };
}
