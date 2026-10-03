import { useState } from "react";
import { router } from "expo-router";
import { View, Text, TextInput, StyleSheet, Alert, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PillButton from "@/components/ui/PillButton";
import { colors, fonts } from "@/theme";

function isValidWalletAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export default function SendAddressScreen() {
  const [walletAddress, setWalletAddress] = useState("");

  const handleContinue = () => {
    const cleanAddress = walletAddress.trim();
    if (!isValidWalletAddress(cleanAddress)) {
      Alert.alert("Invalid address", "Please enter a valid wallet address.");
      return;
    }
    router.push({ pathname: "/send/amount", params: { address: cleanAddress } });
  };

  return (
    <SafeAreaView style={styles.container} testID="send-address-screen">
      <Text style={styles.title}>Recipient</Text>
      <Text style={styles.subtitle}>Enter the wallet address you want to send USDC to.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Wallet Address</Text>
        <TextInput
          testID="recipient-address"
          value={walletAddress}
          onChangeText={setWalletAddress}
          placeholder="0x..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      <View style={{ width: Dimensions.get("screen").width - 40 }}>
        <PillButton label="Continue" onPress={handleContinue} testID="continue-send" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.paper },
  title: { fontFamily: fonts.medium, fontSize: 34, color: colors.ink },
  subtitle: { marginTop: 6, marginBottom: 24, fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  card: { flex: 1, backgroundColor: colors.canvas, borderRadius: 24, padding: 20 },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: 12 },
  input: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12 },
});
