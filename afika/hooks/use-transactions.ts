import { useEffect, useState } from "react";
import { collection, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import type { AppTransactionRecord } from "@/lib/transactions";

export type TransactionListItem = AppTransactionRecord & {
  id: string;
};

/**
 * Subscribes to a wallet's transaction feed, newest first.
 * Pass `limit` to only keep the most recent N entries (e.g. the home feed).
 */
export function useTransactions(
  walletAddress?: string | null,
  limit?: number,
) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, "wallets", walletAddress.toLowerCase(), "transactions"),
      (snapshot) => {
        const next = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as AppTransactionRecord),
          }))
          .sort((a, b) => {
            const aTime = Number(a.timestampMs || a.timestamp || 0);
            const bTime = Number(b.timestampMs || b.timestamp || 0);
            return bTime - aTime;
          });

        setTransactions(typeof limit === "number" ? next.slice(0, limit) : next);
        setLoading(false);
      },
      (error) => {
        console.log("useTransactions error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [walletAddress, limit]);

  return { transactions, loading };
}
