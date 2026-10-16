import { StyleSheet, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";
import QRCodeStyled from "react-native-qrcode-styled";
import { useWallet } from "@/store/wallet";
import * as Clipboard from 'expo-clipboard';

const topUpMethods = [
  { provider: "MTN MOMO", enabled: false },
  { provider: "VODABUCKS", enabled: false },
  { provider: "BITCOIN", enabled: false },
  { provider: "BANK DIRECT DEPOSIT", enabled: false },
];

export default function TopUp() {
  const { smartAdress } = useWallet();
  const router = useRouter();

  const copyToClipboard = async () => {
      await Clipboard.setStringAsync(`${smartAdress}`);
  };


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
      <View style={styles.card}>
        <Text style={styles.title}>Add money</Text>
        <Text style={styles.subtitle}>send Tokens to your address.</Text>
        <QRCodeStyled data={`${smartAdress || ""}`} padding={25} pieceBorderRadius={"50%"} color={colors.ink} />
        <Pressable onPress={copyToClipboard}>
          <Text>tap this to Copy wallet address</Text>
        </Pressable>
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardDisabled: { opacity: 0.45 },
  provider: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  disabledText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
