import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFirestore, doc, onSnapshot } from "@react-native-firebase/firestore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button } from "@/components/shared/button";
import { colors } from "@/theme/colors";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress, shortenAddress } from "@/lib/wallet";
import type { AppTransactionRecord } from "@/lib/transactions";

type TransactionDetailsRecord = AppTransactionRecord & {
  id: string;
};

function formatDate(timestamp?: number) {
  if (!timestamp) {
    return "Not available";
  }

  const normalized = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(normalized).toLocaleString();
}

function formatValue(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  return String(value);
}

function rowLabelForDirection(direction?: "credit" | "debit") {
  return direction === "credit" ? "Received" : "Sent";
}

function buildBaseScanUrl(txHash?: string) {
  if (!txHash) {
    return null;
  }

  return `https://basescan.org/tx/${txHash.toLowerCase()}`;
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono ? styles.mono : null]}>
        {value}
      </Text>
    </View>
  );
}

export default function TransactionDetailsScreen() {
  const { id, txHash } = useLocalSearchParams<{
    id?: string;
    txHash?: string;
  }>();
  const wallet = useWallet();
  const activeWalletAddress = getActiveWalletAddress(wallet);
  const [transaction, setTransaction] =
    useState<TransactionDetailsRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWalletAddress || !id) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "wallets", activeWalletAddress, "transactions", id as string),
        (snapshot) => {
          if (snapshot.exists()) {
            setTransaction({
              id: snapshot.id,
              ...(snapshot.data() as AppTransactionRecord),
            });
          } else {
            setTransaction(null);
          }
          setLoading(false);
        },
        (error) => {
          console.log(error);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, [activeWalletAddress, id]);

  const resolvedTxHash =
    transaction?.txHash || transaction?.userOperationHash || txHash;
  const baseScanUrl = useMemo(
    () => buildBaseScanUrl(resolvedTxHash),
    [resolvedTxHash],
  );

  const handleOpenBaseScan = async () => {
    if (!baseScanUrl) {
      Alert.alert(
        "Transaction pending",
        "This transaction does not have a Base transaction hash yet.",
      );
      return;
    }

    const supported = await Linking.canOpenURL(baseScanUrl);
    if (!supported) {
      Alert.alert(
        "Unable to open link",
        "Basescan could not be opened on this device.",
      );
      return;
    }

    await Linking.openURL(baseScanUrl);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>Transaction not found</Text>
        <Text style={styles.emptyText}>
          We could not find the transaction details for this wallet.
        </Text>
        <Button label="Go Back" onPress={() => router.back()} width={180} />
      </SafeAreaView>
    );
  }

  const timestamp = Number(
    transaction.timestampMs || transaction.timestamp || 0,
  );
  const displayAmount = transaction.amount
    ? `${transaction.amount} ${transaction.tokenSymbol}`
    : transaction.tokenSymbol;
  const secondaryAmount = transaction.buyAmountExpected
    ? `${transaction.buyAmountExpected} ${transaction.buyTokenSymbol || ""}`.trim()
    : "Not available";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons
            name={
              transaction.direction === "credit" ? "arrow-down" : "arrow-up"
            }
            size={26}
            color={transaction.direction === "credit" ? "#00E71F" : "#FF225E"}
          />
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>
              {rowLabelForDirection(transaction.direction)}{" "}
              {transaction.tokenSymbol}
            </Text>
            <Text style={styles.subtitle}>
              {(transaction.state || "pending").toUpperCase()} on Base
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.amountText}>{displayAmount}</Text>
          <Text style={styles.descriptionText}>
            {transaction.description || "Base transaction details"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <DetailRow label="Status" value={formatValue(transaction.state)} />
          <DetailRow label="Type" value={formatValue(transaction.kind)} />
          <DetailRow
            label="Direction"
            value={formatValue(transaction.direction)}
          />
          <DetailRow label="Network" value={formatValue(transaction.network)} />
          <DetailRow label="Date" value={formatDate(timestamp)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amounts</Text>
          <DetailRow label="Token amount" value={formatValue(displayAmount)} />
          <DetailRow
            label="USD amount"
            value={
              transaction.usdAmount
                ? `$${transaction.usdAmount}`
                : "Not available"
            }
          />
          <DetailRow
            label="ZAR amount"
            value={
              transaction.zarAmount
                ? `R${transaction.zarAmount}`
                : "Not available"
            }
          />
          {transaction.kind === "swap" ? (
            <DetailRow label="Expected receive" value={secondaryAmount} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Base chain data</Text>
          <DetailRow
            label="Tx hash"
            value={formatValue(transaction.txHash)}
            mono
          />
          <DetailRow
            label="UserOp hash"
            value={formatValue(transaction.userOperationHash)}
            mono
          />
          <DetailRow
            label="From"
            value={formatValue(transaction.fromAddress)}
            mono
          />
          <DetailRow
            label="To"
            value={formatValue(transaction.toAddress)}
            mono
          />
          <DetailRow
            label="Token address"
            value={formatValue(transaction.tokenAddress)}
            mono
          />
          {transaction.buyTokenAddress ? (
            <DetailRow
              label="Buy token"
              value={transaction.buyTokenAddress}
              mono
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record</Text>
          <DetailRow label="Document id" value={transaction.id} mono />
          <DetailRow
            label="Wallet"
            value={formatValue(transaction.walletAddress)}
            mono
          />
          <DetailRow
            label="Fetched at"
            value={formatDate(
              Number(transaction.fetchedAtMs || transaction.fetchedAt || 0),
            )}
          />
          {transaction.errorMessage ? (
            <DetailRow label="Error" value={transaction.errorMessage} />
          ) : null}
        </View>

        <Button
          label={baseScanUrl ? `Open in Basescan` : "Awaiting tx hash"}
          onPress={handleOpenBaseScan}
          width={Dimensions.get("screen").width - 20}
          backgroundColor={baseScanUrl ? colors.buttonBackground : "#CBD5E1"}
          color={baseScanUrl ? colors.buttonTextBackground : "#475569"}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FA",
    padding: 24,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  amountText: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#475569",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  detailRow: {
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    textAlign: "center",
    color: "#64748B",
  },
  hashHint: {
    marginTop: 10,
    textAlign: "center",
    color: "#64748B",
    fontSize: 13,
  },
});
