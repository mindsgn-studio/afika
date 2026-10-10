import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import StockLogo from "@/components/ui/StockLogo";
import { STOCK_ALLOWLIST } from "@/constants/stocks";
import { colors, fonts } from "@/theme";
import { Marquee } from "@/shared/ui/base/marquee";

const rows = [
  STOCK_ALLOWLIST.slice(0, 3),
  STOCK_ALLOWLIST.slice(3, 5),
  STOCK_ALLOWLIST.slice(5, 8),
];
const OFFSETS = [0, -28, 0];

export default function hero() {

  return (
    <View style={{flex: 1, backgroundColor: "blue"}}>
      <Marquee>
        {rows.map((row, r) => (
          <View key={r} style={[styles.row]}>
            {row.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={44} />
                <View>
                  <Text style={styles.tickerName}>{t.name}</Text>
                  <Text style={styles.tickerSymbol}>{t.ticker}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </Marquee>
      <Marquee reverse>
        {rows.map((row, r) => (
          <View key={r} style={[styles.row, { marginLeft: OFFSETS[r] }]}>
            {row.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={44} />
                <View>
                  <Text style={styles.tickerName}>{t.name}</Text>
                  <Text style={styles.tickerSymbol}>{t.ticker}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </Marquee>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper},
  rowsWrap: { maxHeight: 220 },
  rows: { gap: 14, paddingTop: 8, overflow: "hidden" },
  row: { flexDirection: "row", gap: 22 },
  ticker: { flexDirection: "row", alignItems: "center", gap: 10 },
  tickerName: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  tickerSymbol: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  body: { flex: 1, justifyContent: "space-between",  alignItems: ""},
  badge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  badgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink, letterSpacing: 0.2 },
  headline: { fontFamily: fonts.regular, fontSize: 54, lineHeight: 58, color: colors.ink, letterSpacing: -1.5 },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: 32,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaText: { fontFamily: fonts.medium, fontSize: 16, color: colors.lime },
});
