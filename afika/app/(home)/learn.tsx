import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";

const cards = [
  {
    title: "What you own",
    body: "Afika lets you buy Coinbase B20 tokenized stocks on Base with USDC. Each token represents economic exposure to a listed company, not a traditional brokerage share certificate.",
  },
  {
    title: "Multipliers",
    body: "Corporate actions such as splits and dividends update a multiplier. One token is not always one share. Afika shows share quantities using the current multiplier.",
  },
  {
    title: "Who can trade",
    body: "These tokens are available to eligible investors outside the United States. US persons cannot buy or sell them in this app.",
  },
  {
    title: "How trades work",
    body: "A buy swaps USDC for the stock token on Base. A sell swaps the stock token back to USDC. Gas is sponsored. The final fill is confirmed by the orders worker from on-chain receipts.",
  },
];

export default function Learn() {
  return (
    <SafeAreaView style={styles.screen} testID="learn-screen">
      <Text style={styles.title}>Learn</Text>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 32 }}>
        {cards.map((card) => (
          <View key={card.title} style={styles.card}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardBody}>{card.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink, marginTop: 8, marginBottom: 16 },
  card: { backgroundColor: colors.canvas, borderRadius: 18, padding: 16 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, marginBottom: 8 },
  cardBody: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
});
