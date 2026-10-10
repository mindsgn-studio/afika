import { StyleSheet, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";

const topUpMethods = [
  { provider: "MTN MOMO", enabled: false },
  { provider: "VODABUCKS", enabled: false },
  { provider: "BITCOIN", enabled: false },
  { provider: "BANK DIRECT DEPOSIT", enabled: false },
];

export default function TopUp() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} testID="top-up-screen">
      <Text style={styles.title}>Add money</Text>
      <Text style={styles.subtitle}>Fiat on-ramps are coming. For now, send USDC to your Base address.</Text>
      <Pressable style={styles.card} onPress={() => router.push("/receive")} testID="top-up-receive">
        <Text style={styles.provider}>Receive USDC</Text>
        <Text style={styles.disabledText}>Available now</Text>
      </Pressable>
      <View style={styles.grid}>
        {topUpMethods.map((method) => (
          <Pressable key={method.provider} disabled style={[styles.card, styles.cardDisabled]}>
            <Text style={styles.provider}>{method.provider}</Text>
            <Text style={styles.disabledText}>Coming soon</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: colors.paper },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink, marginTop: 12, marginBottom: 8 },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginBottom: 24 },
  grid: { gap: 16 },
  card: {
    width: "100%",
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: colors.canvas,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardDisabled: { opacity: 0.45 },
  provider: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  disabledText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
