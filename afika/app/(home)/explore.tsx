import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStocks } from "@/hooks/use-stocks";
import StockLogo from "@/components/ui/StockLogo";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";

export default function Explore() {
  const { stocks } = useStocks();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q)
    );
  }, [stocks, query]);

  return (
    <SafeAreaView style={styles.screen} testID="explore-screen">
      <Text style={styles.title}>Explore</Text>
      <TextInput
        testID="explore-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search stocks"
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCapitalize="none"
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((stock) => {
          const up = stock.changePct24h >= 0;
          return (
            <Pressable
              key={stock.address}
              style={styles.row}
              onPress={() => router.push(`/stock/${stock.address}`)}
              testID={`stock-row-${stock.symbol}`}
            >
              <StockLogo name={stock.name} iconUrl={stock.iconUrl} size={44} bordered={false} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{stock.name}</Text>
                <Text style={styles.symbol}>{stock.symbol}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.price}>${formatMoney(stock.price)}</Text>
                <Text style={{ color: up ? colors.green : colors.red, fontFamily: fonts.regular, fontSize: 12 }}>
                  {up ? "↑" : "↓"} {Math.abs(stock.changePct24h)}%
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink, marginTop: 8, marginBottom: 16 },
  search: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  symbol: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  price: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
});
