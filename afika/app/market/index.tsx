import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useStocks } from "@/hooks/use-stocks";
import StockRow from "@/components/ui/StockRow";
import IconButton from "@/components/ui/IconButton";
import { colors, fonts } from "@/theme";

export default function MarketList() {
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
    <SafeAreaView style={styles.screen} testID="market-screen">
      <View style={styles.header}>
        <IconButton onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </IconButton>
        <Text style={styles.title}>Markets</Text>
        <View style={{ width: 40 }} />
      </View>
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
        renderItem={({ item: stock }) => (
          <StockRow
            name={stock.name}
            symbol={stock.symbol}
            iconUrl={stock.iconUrl}
            price={stock.price}
            changePct24h={stock.changePct24h}
            onPress={() => router.push(`/market/${stock.address}`)}
            testID={`market-row-${stock.symbol}`}
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
  list: { flex: 1 },
});