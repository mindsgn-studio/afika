import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useStocks } from "@/hooks/use-stocks";
import StockRow from "@/components/ui/StockRow";
import { colors, fonts } from "@/theme";

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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Explore</Text>
        <Pressable onPress={() => router.push("/market")} testID="view-markets">
          <Text style={styles.link}>View markets</Text>
        </Pressable>
      </View>
      <TextInput
        testID="explore-search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search stocks"
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCapitalize="none"
      />
      <FlashList
        data={filtered}
        keyExtractor={(stock) => stock.address}
        renderItem={({ item: stock }) => (
          <StockRow
            name={stock.name}
            symbol={stock.symbol}
            iconUrl={stock.iconUrl}
            price={stock.price}
            changePct24h={stock.changePct24h}
            onPress={() => router.push(`/stock/${stock.address}`)}
            testID={`stock-row-${stock.symbol}`}
          />
        )}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 16 },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink },
  link: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
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
  list: { flex: 1 },
});
