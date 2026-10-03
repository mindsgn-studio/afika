import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import EmptyTransactionCard from "@/components/empty-transaction-card";
import TransactionCard from "@/components/transaction-card";
import TransactionHeader from "@/components/transaction-header";
import { useState, useEffect } from "react";
import { useWallet } from "@/store/wallet";
import { collection, onSnapshot, query, where, orderBy, limit, doc } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import { getActiveWalletAddress } from "@/lib/wallet";
import type { AppTransactionRecord } from "@/lib/transactions";

type TransactionListItem = AppTransactionRecord & {
  id: string;
};

function onTransactionError(error: unknown) {
  console.log(error);
}

export default function TransactionList() {
  const wallet = useWallet();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);

  const onResult = (data: any) => {
    const transactionArray: TransactionListItem[] = [];

    data?.forEach((transaction: any) => {
      transactionArray.push({
        id: transaction.id,
        ...(transaction.data() as AppTransactionRecord),
      });
    });

    transactionArray.sort((a, b) => {
      const aTime = Number(a.timestampMs || a.timestamp || 0);
      const bTime = Number(b.timestampMs || b.timestamp || 0);
      return bTime - aTime;
    });

    setTransactions(transactionArray);
  };

  const getallTransaction = () => {
    const activeWalletAddress = getActiveWalletAddress(wallet);

    if (!activeWalletAddress) {
      return null;
    }

    try {
      const db = getFirestore("afika-db");
      return onSnapshot(
        collection(db, "wallets", activeWalletAddress, "transactions"),
        onResult,
        onTransactionError,
      );
    } catch (error) {
      console.log(error);
    } finally {
    }
  };

  useEffect(() => {
    const unsubscribe = getallTransaction();
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  return (
    <View style={styles.container} testID="transaction-list">
      <FlashList
        data={transactions}
        ListEmptyComponent={<EmptyTransactionCard />}
        ListHeaderComponent={
          transactions.length == 0 ? null : <TransactionHeader />
        }
        renderItem={({ item }) => <TransactionCard tx={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
  },
});
