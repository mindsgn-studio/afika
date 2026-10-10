import { StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import EmptyTransactionCard from "@/components/empty-transaction-card";
import TransactionCard from "@/components/transaction-card";
import TransactionHeader from "@/components/transaction-header";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress } from "@/lib/wallet";
import { useTransactions } from "@/hooks/use-transactions";

export default function TransactionList() {
  const wallet = useWallet();
  const activeWalletAddress = getActiveWalletAddress(wallet);
  const { transactions } = useTransactions(activeWalletAddress);

  return (
    <View style={styles.container} testID="transaction-list">
      <FlashList
        data={transactions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyTransactionCard />}
        ListHeaderComponent={
          transactions.length === 0 ? null : <TransactionHeader />
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
