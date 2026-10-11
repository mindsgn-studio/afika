import { useEffect, useState } from "react";
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";

export type PortfolioSummary = {
  totalValue: number;
  netWorth: number;
  dayPnl: number;
  allTimePnl: number;
  usdc: number;
  eurc: number;
  zarp: number;
  stocks: number;
  other: number;
  dayPct: number;
  weekPct: number;
  monthPct: number;
  yearPct: number;
  dayAbs: number;
  weekAbs: number;
  monthAbs: number;
  yearAbs: number;
};

const EMPTY_SUMMARY: PortfolioSummary = {
  totalValue: 0,
  netWorth: 0,
  dayPnl: 0,
  allTimePnl: 0,
  usdc: 0,
  eurc: 0,
  zarp: 0,
  stocks: 0,
  other: 0,
  dayPct: 0,
  weekPct: 0,
  monthPct: 0,
  yearPct: 0,
  dayAbs: 0,
  weekAbs: 0,
  monthAbs: 0,
  yearAbs: 0,
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Subscribes to `wallets/{address}/portfolio/summary`, which is written by the
 * orders worker (value + PnL) and the balance worker (net worth breakdown and
 * performance over 1D/7D/1M/1Y).
 */
export function usePortfolio(walletAddress?: string | null) {
  const [summary, setSummary] = useState<PortfolioSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setSummary(EMPTY_SUMMARY);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "wallets", walletAddress.toLowerCase(), "portfolio", "summary"),
      (doc) => {
        const data = doc.data() || {};
        const totalValue = num(data.totalValue);
        setSummary({
          totalValue,
          netWorth: num(data.netWorth) || totalValue,
          dayPnl: num(data.dayPnl),
          allTimePnl: num(data.allTimePnl),
          usdc: num(data.usdcValue),
          eurc: num(data.eurcValue),
          zarp: num(data.zarpValue),
          stocks: num(data.stocksValue),
          other: num(data.otherValue),
          dayPct: num(data.dayPct),
          weekPct: num(data.weekPct),
          monthPct: num(data.monthPct),
          yearPct: num(data.yearPct),
          dayAbs: num(data.dayAbs),
          weekAbs: num(data.weekAbs),
          monthAbs: num(data.monthAbs),
          yearAbs: num(data.yearAbs),
        });
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [walletAddress]);

  return { summary, loading };
}
