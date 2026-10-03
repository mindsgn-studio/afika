import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PillButton from "@/components/ui/PillButton";
import { shortenAddress } from "@/lib/wallet";
import { colors, fonts } from "@/theme";

export default function TransactionCompleteScreen() {
  const { title, message, txHash, amount, token, secondaryAmount, secondaryToken, target } =
    useLocalSearchParams<{
      title?: string;
      message?: string;
      txHash?: string;
      amount?: string;
      token?: string;
      secondaryAmount?: string;
      secondaryToken?: string;
      target?: string;
    }>();

  return (
    <SafeAreaView style={styles.container} testID="tx-complete-screen">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Complete</Text>
        <Text style={styles.title}>{title || "Transaction complete"}</Text>
        <Text style={styles.message}>{message || "Your transaction was submitted successfully."}</Text>
        {(amount || secondaryAmount || target) && (
          <View style={styles.summary}>
            {amount ? <SummaryRow label="Sent" value={`${amount} ${token || ""}`.trim()} /> : null}
            {secondaryAmount ? (
              <SummaryRow label="Received" value={`${secondaryAmount} ${secondaryToken || ""}`.trim()} />
            ) : null}
            {target ? <SummaryRow label="Recipient" value={shortenAddress(target)} /> : null}
          </View>
        )}
        {txHash ? <Text style={styles.hash}>Tx: {shortenAddress(txHash, 10, 8)}</Text> : null}
        <PillButton label="Back Home" onPress={() => router.replace("/")} testID="back-home" />
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", backgroundColor: colors.paper, borderRadius: 28, padding: 24, gap: 18 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 14, color: colors.green, textTransform: "uppercase" },
  title: { fontFamily: fonts.medium, fontSize: 30, color: colors.ink },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.muted },
  summary: { backgroundColor: colors.canvas, borderRadius: 20, padding: 16, gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  rowValue: { flex: 1, textAlign: "right", fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  hash: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
