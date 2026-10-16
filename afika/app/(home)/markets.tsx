import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useStocks } from "@/hooks/use-stocks";
import StockLogo from "@/components/ui/StockLogo";
import { colors, fonts } from "@/theme";
import { useCurrency } from "@/hooks/use-currency";

export default function MarketList() {
  const { stocks } = useStocks();
  const { format } = useCurrency();
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
    <SafeAreaView style={styles.screen} testID="market-screen">
      <TextInput
        testID="market-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search markets"
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCapitalize="none"
      />
      <FlashList
        data={filtered}
        keyExtractor={(stock) => stock.address}
        renderItem={({ item: stock }) => {
          const up = stock.changePct24h >= 0;
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/market/${stock.address}`)}
              testID={`market-row-${stock.symbol}`}
            >
              <StockLogo name={stock.name} iconUrl={stock.iconUrl} size={44} bordered={false} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{stock.name}</Text>
                <Text style={styles.symbol}>{stock.symbol}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.price}>{format(stock.price)}</Text>
                <Text style={{ color: up ? colors.green : colors.red, fontFamily: fonts.regular, fontSize: 12 }}>
                  {up ? "↑" : "↓"} {format(Math.abs(stock.price * stock.changePct24h / (100 + stock.changePct24h || 1)))} ({Math.abs(stock.changePct24h).toFixed(2)}%)
                </Text>
                <Text style={styles.updated}>Updated {stock.updatedAt ? new Date(stock.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</Text>
              </View>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  title: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  search: {
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    marginTop: 12,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  symbol: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  price: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  updated: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 2 },
  list: { flex: 1 },
});
