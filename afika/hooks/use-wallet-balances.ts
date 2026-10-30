import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchBalances,
  type ApiBalance,
  type ApiCurrency,
} from "@/lib/api";
import { useCurrencyStore } from "@/store/currency";

export type WalletBalance = {
  walletAddress?: string;
  walletId?: string;
  address?: string;
  network?: string;
  tokenType?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  amount?: string;
  balance?: string;
  // Stock tokens: raw human units in amount/balance; share qty in uiAmount.
  uiAmount?: string;
  multiplier?: string;
  usdAmount?: string;
  zarAmount?: string;
  eurAmount?: string;
  fetchedAt?: number;
};

const POLL_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 5;

function toWalletBalance(balance: ApiBalance): WalletBalance {
  return {
    walletAddress: balance.walletAddress,
    walletId: balance.walletId,
    address: balance.walletAddress,
    network: balance.network,
    tokenType: balance.tokenType,
    tokenSymbol: balance.tokenSymbol,
    tokenAddress: balance.tokenAddress,
    amount: balance.amount,
    balance: balance.amount,
    uiAmount: balance.uiAmount,
    multiplier: balance.multiplier,
    usdAmount: balance.usdAmount,
    zarAmount: balance.zarAmount,
    eurAmount: balance.eurAmount,
    fetchedAt: balance.fetchedAt,
  };
}

async function loadBalances(walletAddress: string, signal: AbortSignal) {
  const items: ApiBalance[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await fetchBalances(
      walletAddress,
      { limit: PAGE_LIMIT, cursor },
      { signal },
    );
    items.push(...result.data);
    cursor = result.pagination.nextCursor;
    if (!result.pagination.hasMore || !cursor) break;
  }

  return items;
}

/**
 * Loads a wallet's token balances from the REST API and refreshes them every
 * 30 seconds while the screen is mounted.
 */
export function useWalletBalances(walletAddress?: string | null) {
  const currency = useCurrencyStore((state) => state.currency);
  const { setCurrency: setCurrencyFromStore } = useCurrencyStore();

  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setBalances([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    let firstLoad = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      if (firstLoad) setLoading(true);
      try {
        const items = await fetchBalances(
          walletAddress,
          { limit: PAGE_LIMIT, cursor: undefined, currency },
          { signal },
        );
        if (!active) return;
        setBalances(items.map(toWalletBalance));
        setError(null);
      } catch (cause) {
        if (!active) return;
        console.log("useWalletBalances error:", cause instanceof ApiError
          ? { status: cause.status, code: cause.code, requestId: cause.requestId, message: cause.message }
          : cause);
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Could not load your balances.",
        );
      } finally {
        if (active) {
          setLoading(false);
          firstLoad = false;
        }
      }
    };

    load();
    timer = setInterval(load, POLL_INTERVAL_MS);

    // Sync the currency store when it changes (user picks a new currency)
    useEffect(() => {
      setCurrencyFromStore(currency);
    }, [currency]);

    return () => {
      active = false;
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [walletAddress, currency]);

  const balanceMap = useMemo(() => {
    return balances.reduce<Record<string, WalletBalance>>((acc, balance) => {
      if (balance.tokenSymbol) {
        acc[balance.tokenSymbol.toUpperCase()] = balance;
      }
      return acc;
    }, {});
  }, [balances]);

  return {
    balances,
    balanceMap,
    loading,
    error,
  };
}
