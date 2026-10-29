import { useCallback, useEffect, useState } from "react";
import { readLocal, writeLocal } from "@/lib/local-store";

export type WatchlistItem = {
  stockAddress: string;
  symbol: string;
};

function watchlistKey(walletAddress: string) {
  return `watchlist.${walletAddress.trim().toLowerCase()}`;
}

/**
 * Watchlist stored on the device. The API has no watchlist endpoint yet, so it
 * no longer syncs across devices.
 */
export function useWatchlist(walletAddress?: string | null) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    let active = true;

    if (!walletAddress) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    readLocal<WatchlistItem[]>(watchlistKey(walletAddress), [])
      .then((stored) => {
        if (active) setItems(Array.isArray(stored) ? stored : []);
      })
      .catch((error) => {
        console.log("useWatchlist error:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [walletAddress]);

  const toggle = useCallback(
    async (stockAddress: string, symbol: string) => {
      if (!walletAddress) return;

      const normalized = stockAddress.trim().toLowerCase();
      const storageKey = watchlistKey(walletAddress);
      const stored = await readLocal<WatchlistItem[]>(storageKey, []);
      const current = Array.isArray(stored) ? stored : [];
      const exists = current.some((item) => item.stockAddress === normalized);
      const next = exists
        ? current.filter((item) => item.stockAddress !== normalized)
        : [...current, { stockAddress: normalized, symbol }];

      await writeLocal(storageKey, next);
      setItems(next);
    },
    [walletAddress],
  );

  const has = useCallback(
    (stockAddress?: string | null) =>
      items.some(
        (item) => item.stockAddress === (stockAddress ?? "").trim().toLowerCase(),
      ),
    [items],
  );

  return { items, loading, toggle, has };
}
