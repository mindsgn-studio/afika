import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "@/theme";
import { formatTransactionAmount } from "@/lib/money";
import { useCurrency } from "@/hooks/use-currency";
import type { TransactionListItem } from "@/hooks/use-transactions";

function formatDate(timestamp?: number) {
  const value = Number(timestamp || 0);
  if (!value) return "Just now";
  const normalized = value > 1e12 ? value : value * 1000;
  return new Date(normalized).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionRow({ tx }: { tx: TransactionListItem }) {
  const router = useRouter();
  const { effectiveCurrency: currency, rate } = useCurrency();

  const isCredit = tx.direction === "credit";
  const transactionHash = tx.txHash || tx.userOperationHash || "";
  const transactionId = tx.id || transactionHash;
  const amount = formatTransactionAmount(tx, currency, rate);

  return (
    <Pressable
      testID={`transaction-row-${transactionId}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.navigate({
          pathname: "/transaction-details",
          params: { id: transactionId, txHash: transactionHash },
        })
      }
      onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
      onPressOut={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isCredit ? colors.green : colors.red },
        ]}
      >
        <Ionicons
          name={isCredit ? "arrow-down" : "arrow-up"}
          size={16}
          color={colors.paper}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>
          {isCredit ? "Received" : "Sent"} {tx.tokenSymbol}
        </Text>
        <Text style={styles.meta}>
          {(tx.state || "pending").toUpperCase()} • {formatDate(tx.timestampMs || tx.timestamp)}
        </Text>
      </View>

      <Text style={styles.amount}>{amount}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.paper,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.7 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  amount: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
});
