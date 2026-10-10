import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { formatTransactionAmount } from "@/lib/money";
import { useCurrency } from "@/hooks/use-currency";
import type { AppTransactionRecord } from "@/lib/transactions";

type TransactionCardItem = AppTransactionRecord & {
  id?: string;
};

function formatDate(timestamp: any) {
  if (!timestamp) {
    return "Just now";
  }
  const numericTimestamp = Number(timestamp);
  const date = new Date(
    numericTimestamp > 1e12 ? numericTimestamp : numericTimestamp * 1000,
  );
  return date.toLocaleString();
}

export default function TransactionCard({ tx }: { tx: TransactionCardItem }) {
  const router = useRouter();
  const { effectiveCurrency: currency, rate } = useCurrency();
  const transactionHash = tx.txHash || tx.userOperationHash || "";
  const transactionId = tx.id || transactionHash;
  const displayAmount = formatTransactionAmount(tx, currency, rate);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => {
        router.navigate({
          pathname: "/transaction-details",
          params: {
            id: transactionId,
            txHash: transactionHash,
          },
        });
      }}
      onPressIn={() => [Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)]}
      onPressOut={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      }}
    >
      <View>
        {tx.direction === "credit" ? (
          <View style={{ flexDirection: "row" }}>
            <Ionicons
              style={[styles.primaryBalance, { color: "#00E71F" }]}
              name="arrow-down"
            />
            <Text style={styles.secondaryBalance}>
              Recieved {tx.tokenSymbol}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row" }}>
            <Ionicons
              style={[styles.primaryBalance, { color: "#FF225E" }]}
              name="arrow-up"
            />
            <Text style={styles.secondaryBalance}>Sent {tx.tokenSymbol}</Text>
          </View>
        )}

        <Text style={styles.meta}>
          {(tx.state || "pending").toString()} •{" "}
          {formatDate(tx.timestampMs || tx.timestamp)}
        </Text>
      </View>

      <View>
        <Text style={styles.primaryBalance}>{displayAmount}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
    gap: 6,
    // borderColor: '#2A3143',
    marginBottom: 16,
    justifyContent: "space-between",
  },
  cardPressed: {
    opacity: 0.85,
  },

  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },

  networkBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#60A5FA",
    backgroundColor: "#1E2D4A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: "hidden",
  },
  primaryBalance: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  secondaryBalance: {
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "500",
  },

  address: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    fontFamily: "monospace",
  },

  meta: {
    marginTop: 10,
    fontSize: 12,
    color: "#475569",
  },
});
