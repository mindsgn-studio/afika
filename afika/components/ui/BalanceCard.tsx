import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";
import { useCurrency } from "@/hooks/use-currency";

type Props = {
  balance: number;
  label?: string;
};

/**
 * Wallet balance card. Reads the active currency from the shared currency
 * store so it updates everywhere when the preference changes.
 */
export default function BalanceCard({ balance, label = "Total balance" }: Props) {
  const { currency, symbol, convert } = useCurrency();

  return (
    <View style={styles.card} testID="balance-card">
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.chip} testID="balance-currency">
          <Text style={styles.chipText}>{currency}</Text>
        </View>
      </View>
      <Text style={styles.amount} testID="portfolio-balance">
        <Text style={styles.symbol}>{symbol} </Text>
        {formatMoney(convert(balance))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: 8 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  chip: {
    borderWidth: 1,
    borderColor: colors.limeLine,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 11, color: colors.lime, letterSpacing: 0.4 },
  amount: { fontFamily: fonts.medium, fontSize: 48, color: colors.paper, letterSpacing: -1 },
  symbol: { fontSize: 22, color: colors.lime },
});
