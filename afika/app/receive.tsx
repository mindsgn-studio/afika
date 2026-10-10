import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import QRCodeStyled from "react-native-qrcode-styled";
import { useWallet } from "@/store/wallet";
import { colors, fonts } from "@/theme";
import { shortenAddress } from "@/lib/wallet";

export default function Receive() {
  const { smartAdress } = useWallet();

  useFocusEffect(
    useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} testID="receive-screen">
      <Text style={styles.title}>Receive USDC</Text>
      <Text style={styles.subtitle}>Share this Base smart account address.</Text>
      <View style={styles.card}>
        <QRCodeStyled data={`${smartAdress || ""}`} padding={25} pieceBorderRadius={"50%"} color={colors.ink} />
        <Text style={styles.address}>{shortenAddress(smartAdress, 10, 8)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, alignItems: "center" },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink, marginTop: 12, alignSelf: "flex-start" },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 24, alignSelf: "flex-start" },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 16,
  },
  address: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
});
