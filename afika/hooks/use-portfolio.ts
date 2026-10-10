import { useEffect, useState } from "react";
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";

export type PortfolioSummary = {
  totalValue: number;
  dayPnl: number;
  allTimePnl: number;
};

export function usePortfolio(walletAddress?: string | null) {
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    dayPnl: 0,
    allTimePnl: 0,
  });
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setSummary({ totalValue: 0, dayPnl: 0, allTimePnl: 0 });
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "wallets", walletAddress.toLowerCase(), "portfolio", "summary"),
        (doc) => {
          const data = doc.data() || {};
          setSummary({
            totalValue: Number(data.totalValue || 0),
            dayPnl: Number(data.dayPnl || 0),
            allTimePnl: Number(data.allTimePnl || 0),
          });
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, [walletAddress]);

  return { summary, loading };
}
