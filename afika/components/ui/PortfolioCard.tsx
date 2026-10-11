import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";
import type { PortfolioSummary } from "@/hooks/use-portfolio";

const RANGES = [
  { key: "1D", pct: "dayPct", abs: "dayAbs" },
  { key: "7D", pct: "weekPct", abs: "weekAbs" },
  { key: "1M", pct: "monthPct", abs: "monthAbs" },
  { key: "1Y", pct: "yearPct", abs: "yearAbs" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

type Props = {
  summary: PortfolioSummary;
};

/**
 * Net worth performance and asset breakdown for the portfolio screen.
 * Performance colours follow the app convention: green up, red down.
 */
export default function PortfolioCard({ summary }: Props) {
  const [range, setRange] = useState<RangeKey>("1D");
  const active = RANGES.find((item) => item.key === range) ?? RANGES[0];
  const pct = summary[active.pct];
  const abs = summary[active.abs];
  const up = pct >= 0;

  const assets = [
    { label: "USDC", value: summary.usdc },
    { label: "EURC", value: summary.eurc },
    { label: "ZARP", value: summary.zarp },
    { label: "Stocks", value: summary.stocks },
  ];
  if (summary.other > 0) {
    assets.push({ label: "Other", value: summary.other });
  }

  return (
    <View style={styles.card} testID="portfolio-card">
      <View style={styles.head}>
        <Text style={styles.title}>Net worth</Text>
        <Text style={styles.netWorth} testID="portfolio-net-worth">
          ${formatMoney(summary.netWorth)}
        </Text>
      </View>

      <View style={styles.rangeRow} testID="portfolio-ranges">
        {RANGES.map((item) => {
          const on = item.key === range;
          return (
            <Pressable
              key={item.key}
              onPress={() => setRange(item.key)}
              style={[styles.pill, on && styles.pillOn]}
              testID={`portfolio-range-${item.key}`}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{item.key}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.changeRow} testID="portfolio-change">
        <Feather
          name={up ? "arrow-up-right" : "arrow-down-right"}
          size={20}
          color={up ? colors.green : colors.red}
        />
        <Text style={[styles.changeValue, { color: up ? colors.green : colors.red }]}>
          {up ? "+" : "-"}${formatMoney(Math.abs(abs))}
        </Text>
        <Text style={[styles.changePct, { color: up ? colors.green : colors.red }]}>
          ({up ? "+" : "-"}
          {Math.abs(pct).toFixed(2)}%)
        </Text>
        <Text style={styles.changeLabel}>past {active.key.toLowerCase()}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.title}>Portfolio</Text>
      <View style={styles.breakdown} testID="portfolio-breakdown">
        {assets.map((asset) => (
          <View key={asset.label} style={styles.assetRow} testID={`portfolio-asset-${asset.label.toLowerCase()}`}>
            <Text style={styles.assetLabel}>{asset.label}</Text>
            <Text style={styles.assetValue}>${formatMoney(asset.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    marginBottom: 20,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  netWorth: { fontFamily: fonts.semibold, fontSize: 24, color: colors.ink },
  rangeRow: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  pillTextOn: { color: colors.lime, fontFamily: fonts.medium },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  changeValue: { fontFamily: fonts.medium, fontSize: 18 },
  changePct: { fontFamily: fonts.medium, fontSize: 15 },
  changeLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginLeft: "auto" },
  divider: { height: 1, backgroundColor: colors.line },
  breakdown: { gap: 10 },
  assetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  assetLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  assetValue: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
});
