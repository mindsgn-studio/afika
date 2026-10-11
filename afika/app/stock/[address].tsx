import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import StockLogo from "@/components/ui/StockLogo";
import RangePills from "@/components/ui/RangePills";
import LineChart from "@/shared/ui/charts/line-chart";
import PillButton from "@/components/ui/PillButton";
import IconButton from "@/components/ui/IconButton";
import { useStock } from "@/hooks/use-stocks";
import { useStockHistory } from "@/hooks/use-stock-history";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress } from "@/lib/wallet";
import { getAllowlistedStock, normalizeStockAddress } from "@/constants/stocks";
import { colors, fonts } from "@/theme";
import { useCurrency } from "@/hooks/use-currency";

export default function StockDetails() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const [range, setRange] = useState("1D");
  const normalized = normalizeStockAddress(address);
  const allow = getAllowlistedStock(normalized);
  const { stock } = useStock(normalized);
  const { points } = useStockHistory(normalized, range);
  const { format, rate } = useCurrency();
  const wallet = useWallet();
  const { toggle, has } = useWatchlist(getActiveWalletAddress(wallet));
  const name = stock?.name || allow?.name || "Stock";
  const symbol = stock?.symbol || allow?.ticker || "";
  const price = stock?.price || 0;
  const changePct = stock?.changePct24h || 0;
  const up = changePct >= 0;
  const following = has(normalized);
  const chart = points.map((p) => p.price * rate);

  return (
    <SafeAreaView style={styles.screen} testID="stock-detail-screen">
      <View style={styles.header}>
        <IconButton onPress={() => router.back()} testID="stock-back">
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </IconButton>
        <Text style={styles.title}>Stock Details</Text>
        <IconButton>
          <Ionicons name="share-social-outline" size={20} color={colors.ink} />
        </IconButton>
      </View>

      <View style={styles.summary}>
        <StockLogo name={name} iconUrl={stock?.iconUrl} size={44} bordered={false} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.ticker}>{symbol}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>{format(price)}</Text>
          <Text style={[styles.change, { color: up ? colors.green : colors.red }]}>
            {up ? "↑" : "↓"} {Math.abs(changePct)}%
          </Text>
        </View>
      </View>

      <RangePills value={range} onChange={setRange} />
      <View style={styles.chart}>
        <LineChart.Root
          data={(chart.length ? chart : [price * rate || 0, price * rate || 0]).map((y, x) => ({ x, y }))}
          style={{ height: 190 }}
        >
          <LineChart.Grid count={4} color={colors.line} thickness={1} />
          <LineChart.Area colors={[colors.lime, colors.paper]} opacity={0.12} />
          <LineChart.Line color={colors.limeLine} thickness={3} />
          <LineChart.Indicator color={colors.paper} borderColor={colors.ink} />
          <LineChart.Cursor color={colors.muted} showCrosshair />
          <LineChart.Tooltip format={(point) => format(point.y)} />
        </LineChart.Root>
      </View>

      {stock?.navStale ? (
        <Text style={styles.warn}>Market is closed. The reference price may be stale.</Text>
      ) : null}

      <View style={styles.overview}>
        <View style={styles.overviewHead}>
          <StockLogo name={name} iconUrl={stock?.iconUrl} size={16} bordered={false} />
          <Text style={styles.overviewTitle}>Overview</Text>
          <Feather name="help-circle" size={14} color={colors.muted} style={{ marginLeft: "auto" }} />
        </View>
        <View style={styles.overviewRow}>
          <View>
            <Text style={styles.ovLabel}>Open</Text>
            <Text style={styles.ovValue}>{format(stock?.open || price)}</Text>
          </View>
          <View>
            <Text style={styles.ovLabel}>Day Low</Text>
            <Text style={styles.ovValue}>{format(stock?.dayLow || price)}</Text>
          </View>
          <View>
            <Text style={styles.ovLabel}>Day High</Text>
            <Text style={styles.ovValue}>{format(stock?.dayHigh || price)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <PillButton
          label={following ? "Following" : "Follow"}
          variant="outline"
          testID="follow-button"
          onPress={() => toggle(normalized, symbol)}
        />
        <PillButton
          label="Buy Now"
          testID="buy-now"
          onPress={() => router.push({ pathname: "/trade/[address]", params: { address: normalized, side: "buy" } })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  title: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.canvas,
    borderRadius: 16,
    padding: 12,
    marginTop: 20,
  },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  ticker: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  price: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  change: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  chart: { marginTop: 28 },
  warn: { marginTop: 12, fontFamily: fonts.regular, fontSize: 13, color: colors.red },
  overview: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    marginTop: "auto",
    marginBottom: 20,
  },
  overviewHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  overviewTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  overviewRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  ovLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  ovValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink, marginTop: 4 },
  actions: { flexDirection: "row", gap: 12, marginBottom: 12 },
});
