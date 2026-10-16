import { Pressable, StyleSheet, Text, View } from "react-native";
import StockLogo from "./StockLogo";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";

type Props = {
  name: string;
  symbol: string;
  iconUrl?: string;
  price: number;
  changePct24h: number;
  onPress?: () => void;
  testID?: string;
};

export default function StockRow({
  name,
  symbol,
  iconUrl,
  price,
  changePct24h,
  onPress,
  testID,
}: Props) {
  const up = changePct24h >= 0;

  return (
    <Pressable style={styles.row} onPress={onPress} testID={testID}>
      <StockLogo name={name} iconUrl={iconUrl} size={44} bordered={false} />
      <View style={styles.copy}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.symbol}>{symbol}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.price}>${formatMoney(price)}</Text>
        <Text style={[styles.change, { color: up ? colors.green : colors.red }]}>
          {up ? "↑" : "↓"} {Math.abs(changePct24h)}%
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  copy: { flex: 1 },
  stats: { alignItems: "flex-end" },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  symbol: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  price: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  change: { fontFamily: fonts.regular, fontSize: 12 },
});
