import { Pressable, StyleSheet, Text, View } from "react-native";
import StockLogo from "./StockLogo";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";

type Props = {
  name: string;
  iconUrl?: string;
  qty: number;
  avg: number;
  total: number;
  pnl: number;
  pnlPct: number;
  onPress?: () => void;
};

export default function HoldingRow({ name, iconUrl, qty, avg, total, pnl, pnlPct, onPress }: Props) {
  const loss = pnl < 0;
  return (
    <Pressable style={styles.holding} onPress={onPress} testID={`holding-${name}`}>
      <StockLogo name={name} iconUrl={iconUrl} size={44} bordered={false} />
      <View style={{ flex: 1 }}>
        <Text style={styles.holdName}>{name}</Text>
        <Text style={styles.holdMeta}>
          {qty}x • ${formatMoney(avg)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.holdTotal}>${formatMoney(total)}</Text>
        <Text style={[styles.holdPnl, { color: loss ? colors.red : colors.green }]}>
          {loss ? "-" : "+"}${formatMoney(Math.abs(pnl)).replace(/\.00$/, "")} ({pnlPct}%)
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  holding: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10 },
  holdName: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  holdMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  holdTotal: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  holdPnl: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
});
