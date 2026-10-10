import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, where, query, orderBy, limit } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import { normalizeStockAddress } from "@/constants/stocks";

export type HistoryPoint = { t: number; price: number };

const RANGE_MS: Record<string, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
};

export function useStockHistory(address?: string | null, range = "1D") {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const normalized = normalizeStockAddress(address);
  const since = useMemo(() => {
    const window = RANGE_MS[range] ?? RANGE_MS["1D"];
    return Date.now() - window;
  }, [range]);

  useEffect(() => {
    if (!normalized) {
      setPoints([]);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const q = query(
      collection(db, "stocks", normalized, "history"),
      where("t", ">=", since),
      orderBy("t", "asc"),
      limit(500),
    );
    const unsubscribe = onSnapshot(q,
        (snapshot) => {
          setPoints(
            snapshot.docs.map((doc) => {
              const data = doc.data();
              return { t: Number(data.t || doc.id), price: Number(data.price || 0) };
            })
          );
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, [normalized, since]);

  return { points, loading };
}
