import { router } from "expo-router";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";

export default function SendScreen() {
  return (
    <SafeAreaView style={styles.container} testID="send-screen">
      <Text style={styles.title}>Send Money</Text>
      <Text style={styles.subtitle}>Send USDC to another wallet on Base.</Text>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push("/send/address")}
        testID="send-wallet-address"
      >
        <Text style={styles.cardTitle}>Wallet Address</Text>
        <Text style={styles.cardText}>Enter or scan a wallet address</Text>
      </Pressable>
      <Pressable style={styles.disabledCard} disabled>
        <Text style={styles.cardTitle}>Contacts</Text>
        <Text style={styles.cardText}>Coming soon</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.paper },
  title: { fontFamily: fonts.medium, fontSize: 34, color: colors.ink },
  subtitle: { marginTop: 6, marginBottom: 24, fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  card: { backgroundColor: colors.canvas, borderRadius: 24, padding: 20, marginBottom: 14 },
  cardPressed: { opacity: 0.85 },
  disabledCard: { backgroundColor: colors.canvas, opacity: 0.5, borderRadius: 24, padding: 20 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  cardText: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
});
