import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";

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
  fetchedAt?: number;
};

export function useWalletBalances(walletAddress?: string | null) {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setBalances([]);
      return;
    }

    setLoading(true);
    const db = getFirestore();
    const unsubscribe = onSnapshot(
      collection(db, "wallets", walletAddress.toLowerCase(), "balances"),
        (snapshot) => {
          const nextBalances = snapshot.docs.map((doc) => doc.data() as WalletBalance);
          setBalances(nextBalances);
          setLoading(false);
        },
        (error) => {
          console.log("useWalletBalances error:", error);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, [walletAddress]);

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
  };
}
