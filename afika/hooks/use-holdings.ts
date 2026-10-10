import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";

export type HoldingRecord = {
  stockAddress: string;
  qty: number;
  avgCost: number;
  costBasis: number;
  realizedPnl: number;
  symbol?: string;
};

export function useHoldings(walletAddress?: string | null) {
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setHoldings([]);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, "wallets", walletAddress.toLowerCase(), "holdings"),
        (snapshot) => {
          setHoldings(
            snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                stockAddress: doc.id.toLowerCase(),
                qty: Number(data.qty || 0),
                avgCost: Number(data.avgCost || 0),
                costBasis: Number(data.costBasis || 0),
                realizedPnl: Number(data.realizedPnl || 0),
                symbol: data.symbol ? String(data.symbol) : undefined,
              };
            })
          );
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, [walletAddress]);

  return { holdings, loading };
}
