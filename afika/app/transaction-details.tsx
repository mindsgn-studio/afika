import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, onSnapshot } from "@react-native-firebase/firestore";

import { Button } from "@/components/shared/button";
import { colors } from "@/theme";
import { getFirestore } from "@/lib/firestore";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress, shortenAddress } from "@/lib/wallet";
import { formatTransactionAmount } from "@/lib/money";
import { useCurrency } from "@/hooks/use-currency";
import type { AppTransactionRecord } from "@/lib/transactions";
import ReceiptCard from "@/shared/ui/pieces/receipt-card";

type TransactionDetailsRecord = AppTransactionRecord & {
  id: string;
};

const RECEIPT_PALETTE = {
  paper: colors.paper,
  ink: colors.ink,
  muted: colors.muted,
  rule: colors.line,
  leader: colors.muted,
  accent: colors.ink,
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

function formatAmount(value?: string | null, prefix = "") {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  return `${prefix}${value}`;
}

function formatHash(value?: string | null) {
  return value ? shortenAddress(value) : "Not available";
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

export default function TransactionDetailsScreen() {
  const { id, txHash } = useLocalSearchParams<{
    id?: string;
    txHash?: string;
  }>();
  const wallet = useWallet();
  const activeWalletAddress = getActiveWalletAddress(wallet);
  const { effectiveCurrency: currency, rate } = useCurrency();
  const { width: screenWidth } = useWindowDimensions();
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
  const fetchedAt = Number(transaction.fetchedAtMs || transaction.fetchedAt || 0);
  const directionLabel = rowLabelForDirection(transaction.direction);
  const stateLabel = (transaction.state || "pending").toUpperCase();
  const displayAmount = transaction.amount
    ? `${transaction.amount} ${transaction.tokenSymbol}`
    : transaction.tokenSymbol;
  const currencyAmount = formatTransactionAmount(transaction, currency, rate);
  const secondaryAmount = transaction.buyAmountExpected
    ? `${transaction.buyAmountExpected} ${transaction.buyTokenSymbol || ""}`.trim()
    : "Not available";
  const receiptWidth = Math.min(340, screenWidth - 40);

  return (
    <SafeAreaView style={styles.container}>
      <View contentContainerStyle={styles.content}>
        <ReceiptCard width={receiptWidth} palette={RECEIPT_PALETTE}>
          <ReceiptCard.TornEdge key="edge-top" side="top" />

          <ReceiptCard.Header key="header">
            <ReceiptCard.Store>Afika</ReceiptCard.Store>
            <ReceiptCard.Meta>
              {directionLabel} · {stateLabel} on Base
            </ReceiptCard.Meta>
          </ReceiptCard.Header>

          <ReceiptCard.Separator key="sep-overview" />

          <ReceiptCard.Items key="overview">
            <ReceiptCard.Item
              label="Network"
              value={formatValue(transaction.network)}
            />
            <ReceiptCard.Item
              label="Type"
              value={formatValue(transaction.kind)}
            />
            <ReceiptCard.Item label="Date" value={formatDate(timestamp)} />
          </ReceiptCard.Items>

          <ReceiptCard.Separator key="sep-amounts" />

          <ReceiptCard.Items key="amounts">
            <ReceiptCard.Item
              label="Token"
              value={formatValue(displayAmount)}
            />
            <ReceiptCard.Item
              label="USD"
              value={formatAmount(transaction.usdAmount, "$")}
            />
            <ReceiptCard.Item
              label="ZAR"
              value={formatAmount(transaction.zarAmount, "R")}
            />
            <ReceiptCard.Item
              label="EUR"
              value={formatAmount(transaction.eurAmount, "€")}
            />
            {transaction.kind === "swap" ? (
              <ReceiptCard.Item label="Expected" value={secondaryAmount} />
            ) : null}
          </ReceiptCard.Items>

          <ReceiptCard.Separator key="sep-chain" />

          <ReceiptCard.Items key="chain">
            <ReceiptCard.Item
              label="Tx hash"
              value={formatHash(resolvedTxHash)}
            />
            <ReceiptCard.Item
              label="UserOp"
              value={formatHash(transaction.userOperationHash)}
            />
            <ReceiptCard.Item
              label="From"
              value={formatHash(transaction.fromAddress)}
            />
            <ReceiptCard.Item
              label="To"
              value={formatHash(transaction.toAddress)}
            />
            <ReceiptCard.Item
              label="Token"
              value={formatHash(transaction.tokenAddress)}
            />
            {transaction.buyTokenAddress ? (
              <ReceiptCard.Item
                label="Buy token"
                value={formatHash(transaction.buyTokenAddress)}
              />
            ) : null}
          </ReceiptCard.Items>

          <ReceiptCard.Separator key="sep-record" />

          <ReceiptCard.Items key="record">
            <ReceiptCard.Item label="Ref" value={formatHash(transaction.id)} />
            <ReceiptCard.Item
              label="Wallet"
              value={formatHash(transaction.walletAddress)}
            />
            <ReceiptCard.Item label="Fetched" value={formatDate(fetchedAt)} />
          </ReceiptCard.Items>

          <ReceiptCard.Separator key="sep-total" variant="solid" />

          <ReceiptCard.Total
            key="total"
            label={directionLabel}
            value={currencyAmount}
          />

          {transaction.errorMessage ? (
            <ReceiptCard.Note key="note-error">
              Error: {transaction.errorMessage}
            </ReceiptCard.Note>
          ) : null}
          <ReceiptCard.Note key="note-description">
            {transaction.description || "Base transaction details"}
          </ReceiptCard.Note>

          <ReceiptCard.Barcode
            key="barcode"
            code={resolvedTxHash || transaction.id}
            showCode={false}
          />

          <ReceiptCard.TornEdge key="edge-bottom" side="bottom" />
        </ReceiptCard>

        {
          /*
          <Button
            label={baseScanUrl ? "Open in Basescan" : "Awaiting tx hash"}
            onPress={handleOpenBaseScan}
            width={receiptWidth}
            backgroundColor={baseScanUrl ? colors.buttonBackground : colors.line}
            color={baseScanUrl ? colors.buttonTextBackground : colors.muted}
          />
          */
        }


      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
    padding: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: "center",
    gap: 24,
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
    color: colors.muted,
  },
});
