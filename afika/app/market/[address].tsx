import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/shared/button";
import StockLogo from "@/components/ui/StockLogo";
import { useStock } from "@/hooks/use-stocks";
import { formatMoney } from "@/lib/money";
import { normalizeStockAddress } from "@/constants/stocks";
import { colors, fonts } from "@/theme";

export default function MarketDetailsScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const normalized = normalizeStockAddress(address);
  const { stock } = useStock(normalized);
  const up = (stock?.changePct24h || 0) >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.summary}>
        <StockLogo name={stock?.name || ""} iconUrl={stock?.iconUrl} size={48} bordered={false} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{stock?.name}</Text>
          <Text style={styles.symbol}>{stock?.symbol}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>${formatMoney(stock?.price || 0)}</Text>
          <Text style={{ color: up ? colors.green : colors.red, fontFamily: fonts.regular, fontSize: 13 }}>
            {up ? "↑" : "↓"} {Math.abs(stock?.changePct24h || 0)}%
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current Price</Text>
        <Text style={styles.value}>${formatMoney(stock?.price || 0)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>24h Change</Text>
        <Text style={[styles.value, { color: up ? colors.green : colors.red }]}>
          {up ? "+" : "-"}
          {Math.abs(stock?.changePct24h || 0).toFixed(2)}%
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Market Cap</Text>
        <Text style={styles.value}>${formatMoney(stock?.marketCap || 0)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Volume (24h)</Text>
        <Text style={styles.value}>${formatMoney(stock?.volume24h || 0)}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Buy with USDC"
          onPress={() =>
            router.push({ pathname: "/trade/[address]", params: { address: normalized, side: "buy" } })
          }
          testID="market-buy-usdc"
        />
        <Button
          label="Sell for USDC"
          backgroundColor="none"
          color={colors.ink}
          onPress={() =>
            router.push({ pathname: "/trade/[address]", params: { address: normalized, side: "sell" } })
          }
          testID="market-sell-usdc"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: 20,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  title: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.canvas,
    borderRadius: 16,
    padding: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  symbol: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  price: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  value: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink, marginTop: 8 },
  actions: { gap: 12, marginTop: "auto", marginBottom: 20 },
});
