import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchTransactions,
  type ApiTransaction,
} from "@/lib/api";
import {
  getLocalTransactions,
  hydrateLocalTransactions,
  subscribeLocalTransactions,
  type AppTransactionRecord,
  type LocalTransactionRecord,
  type TransactionState,
} from "@/lib/transactions";

export type TransactionListItem = LocalTransactionRecord;

const POLL_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 100;

function mapState(state?: string): TransactionState {
  const normalized = (state ?? "").toLowerCase();
  if (normalized === "completed" || normalized === "confirmed" || normalized === "success") {
    return "confirmed";
  }
  if (normalized === "failed" || normalized === "error") {
    return "failed";
  }
  if (normalized === "pending") {
    return "pending";
  }
  return "submitted";
}

/** Maps an API transaction onto the app's transaction record shape. */
export function apiTransactionToRecord(tx: ApiTransaction): AppTransactionRecord {
  return {
    kind: tx.direction === "credit" ? "receive" : "send",
    state: mapState(tx.state),
    source: "chain",
    walletAddress: tx.walletAddress.trim().toLowerCase(),
    network: tx.network,
    direction: tx.direction,
    tokenSymbol: tx.tokenSymbol,
    tokenAddress: tx.tokenAddress,
    amount: tx.amount,
    usdAmount: tx.usdAmount,
    zarAmount: tx.zarAmount,
    eurAmount: tx.eurAmount,
    fromAddress: tx.fromAddress,
    toAddress: tx.toAddress,
    txHash: tx.txHash,
    timestampMs: tx.timestampMs,
    timestamp: tx.timestamp,
    fetchedAtMs: tx.fetchedAtMs,
    fetchedAt: tx.fetchedAt,
  };
}

function transactionTime(tx: TransactionListItem) {
  return Number(tx.timestampMs || tx.timestamp || 0);
}

/**
 * Combines the API transaction feed with local pending/submitted records, newest
 * first. Pass `limit` to only keep the most recent N entries (e.g. the home
 * feed). The API feed is refreshed every 30 seconds while mounted.
 */
export function useTransactions(
  walletAddress?: string | null,
  limit?: number,
) {
  const [chainTransactions, setChainTransactions] = useState<TransactionListItem[]>([]);
  const [localTransactions, setLocalTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setChainTransactions([]);
      setLocalTransactions([]);
      setLoading(false);
      return;
    }

    const normalized = walletAddress.trim().toLowerCase();
    const controller = new AbortController();
    let active = true;
    let firstLoad = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const refreshLocal = () => {
      if (!active) return;
      setLocalTransactions(getLocalTransactions(normalized));
    };

    const loadChain = async () => {
      if (firstLoad) setLoading(true);
      try {
        const result = await fetchTransactions(
          normalized,
          { limit: PAGE_LIMIT },
          { signal: controller.signal },
        );
        if (!active) return;
        setChainTransactions(
          result.data.map((tx) => ({
            id: `${tx.txHash.toLowerCase()}_${tx.direction}`,
            ...apiTransactionToRecord(tx),
          })),
        );
      } catch (cause) {
        if (!active) return;
        console.log("useTransactions error:", cause);
        if (cause instanceof ApiError && cause.code === "NOT_FOUND") {
          setChainTransactions([]);
        }
      } finally {
        if (active) {
          setLoading(false);
          firstLoad = false;
        }
      }
    };

    hydrateLocalTransactions(normalized).then(refreshLocal).catch((error) => {
      console.log("hydrateLocalTransactions error:", error);
    });

    const unsubscribe = subscribeLocalTransactions(refreshLocal);

    loadChain();
    timer = setInterval(loadChain, POLL_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      if (timer) clearInterval(timer);
      unsubscribe();
    };
  }, [walletAddress]);

  const transactions = useMemo(() => {
    const merged = new Map<string, TransactionListItem>();
    const chainHashes = new Set<string>();

    for (const tx of chainTransactions) {
      merged.set(tx.id, tx);
      if (tx.txHash) chainHashes.add(tx.txHash.toLowerCase());
    }

    // Local records win, so a pending send shows immediately and keeps its
    // submitted/failed state. Once the chain feed catches up with the same
    // hash, the local row is dropped to avoid showing the transaction twice.
    for (const tx of localTransactions) {
      if (tx.txHash && chainHashes.has(tx.txHash.toLowerCase())) continue;
      merged.set(tx.id, tx);
    }

    const sorted = [...merged.values()].sort(
      (a, b) => transactionTime(b) - transactionTime(a),
    );
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  }, [chainTransactions, localTransactions, limit]);

  return { transactions, loading };
}
