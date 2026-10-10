import { useEffect } from "react";
import { getWalletSettings } from "@/lib/firebase";
import { useCurrencyStore } from "@/store/currency";

/**
 * Loads the persisted currency preference for a wallet into the global store
 * so every screen reacts to the same value. Safe to call from multiple screens.
 */
export function useSyncCurrencyPreference(walletAddress?: string | null) {
  const setCurrency = useCurrencyStore((state) => state.setCurrency);

  useEffect(() => {
    if (!walletAddress) return;

    let cancelled = false;

    getWalletSettings(walletAddress)
      .then((settings) => {
        if (!cancelled) {
          setCurrency(settings.preferredCurrency);
        }
      })
      .catch((error) => {
        console.log("useSyncCurrencyPreference error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, setCurrency]);
}
