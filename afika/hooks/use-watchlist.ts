import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, deleteDoc, setDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";

export type WatchlistItem = {
  stockAddress: string;
  symbol: string;
};

export function useWatchlist(walletAddress?: string | null) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(Boolean(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setItems([]);
      setLoading(false);
      return;
    }
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, "wallets", walletAddress.toLowerCase(), "watchlist"),
        (snapshot) => {
          setItems(
            snapshot.docs.map((doc) => ({
              stockAddress: doc.id.toLowerCase(),
              symbol: String(doc.data().symbol || ""),
            }))
          );
          setLoading(false);
        },
        () => setLoading(false)
      );
    return unsubscribe;
  }, [walletAddress]);

  const toggle = async (stockAddress: string, symbol: string) => {
    if (!walletAddress) return;
    const db = getFirestore();
    const ref = doc(db, "wallets", walletAddress.toLowerCase(), "watchlist", stockAddress.toLowerCase());
    const existing = items.find((item) => item.stockAddress === stockAddress.toLowerCase());
    if (existing) {
      await deleteDoc(ref);
      return;
    }
    await setDoc(ref, {
      symbol,
      createdAt: serverTimestamp(),
    });
  };

  const has = (stockAddress?: string | null) =>
    items.some((item) => item.stockAddress === (stockAddress ?? "").toLowerCase());

  return { items, loading, toggle, has };
}
