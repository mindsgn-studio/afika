import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import { getAllowlistedStock, normalizeStockAddress } from "@/constants/stocks";

export type StockRecord = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
  isin?: string;
  multiplier: number;
  pausedFeatures?: number[];
  paused: boolean;
  navPrice: number;
  navUpdatedAt?: string;
  navStale: boolean;
  price: number;
  changePct24h: number;
  open: number;
  dayLow: number;
  dayHigh: number;
  tradable: boolean;
};

function mapStock(id: string, data: Record<string, unknown>): StockRecord {
  const allow = getAllowlistedStock(id);
  return {
    address: normalizeStockAddress(id),
    symbol: String(data.symbol || allow?.ticker || ""),
    name: String(data.name || allow?.name || ""),
    decimals: Number(data.decimals || allow?.decimals || 8),
    iconUrl: data.iconUrl ? String(data.iconUrl) : undefined,
    isin: data.isin ? String(data.isin) : undefined,
    multiplier: Number(data.multiplier || 1),
    pausedFeatures: Array.isArray(data.pausedFeatures) ? (data.pausedFeatures as number[]) : [],
    paused: Boolean(data.paused),
    navPrice: Number(data.navPrice || 0),
    navUpdatedAt: data.navUpdatedAt ? String(data.navUpdatedAt) : undefined,
    navStale: Boolean(data.navStale),
    price: Number(data.price || data.navPrice || 0),
    changePct24h: Number(data.changePct24h || 0),
    open: Number(data.open || 0),
    dayLow: Number(data.dayLow || 0),
    dayHigh: Number(data.dayHigh || 0),
    tradable: data.tradable !== false && !data.paused,
  };
}

export function useStocks() {
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, "stocks"),
        (snapshot) => {
          setStocks(snapshot.docs.map((doc) => mapStock(doc.id, doc.data())));
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, []);

  const byAddress = useMemo(() => {
    return Object.fromEntries(stocks.map((stock) => [stock.address, stock]));
  }, [stocks]);

  return { stocks, byAddress, loading };
}

export function useStock(address?: string | null) {
  const [stock, setStock] = useState<StockRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const normalized = normalizeStockAddress(address);

  useEffect(() => {
    if (!normalized) {
      setStock(null);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "stocks", normalized),
        (doc) => {
          setStock(doc.exists() ? mapStock(doc.id, doc.data() || {}) : null);
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, [normalized]);

  return { stock, loading };
}
