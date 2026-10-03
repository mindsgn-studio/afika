import { StyleSheet, View, Text, Platform, ActivityIndicator, Pressable } from "react-native";
import { useLoginWithOAuth, OAuthProviderID } from "@privy-io/expo";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";

export default function SignIn() {
  const router = useRouter();
  const [progress, setProgress] = useState(false);
  const { login } = useLoginWithOAuth();

  async function handleSignIn(provider: OAuthProviderID) {
    setProgress(true);
    try {
      await login({ provider });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(home)");
    } catch (error) {
      console.log(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProgress(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} testID="sign-in-screen">
      <View style={styles.body}>
        <Text style={styles.kicker}>AFIKA</Text>
        <Text style={styles.headline}>A global wallet for a global market</Text>
        <Text style={styles.copy}>Hold USDC on Base. Buy tokenized stocks with one tap.</Text>
      </View>
      {progress ? (
        <ActivityIndicator size={40} color={colors.lime} />
      ) : (
        <Pressable
          testID="sign-in-button"
          style={styles.cta}
          onPress={() => handleSignIn(Platform.OS === "ios" ? "apple" : "google")}
        >
          <Text style={styles.ctaText}>
            Continue with {Platform.OS === "ios" ? "Apple" : "Google"}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingHorizontal: 20, justifyContent: "space-between", paddingBottom: 20 },
  body: { flex: 1, justifyContent: "center" },
  kicker: { fontFamily: fonts.medium, fontSize: 13, color: colors.lime, letterSpacing: 1.4, marginBottom: 16 },
  headline: { fontFamily: fonts.regular, fontSize: 44, lineHeight: 50, color: colors.paper, letterSpacing: -1 },
  copy: { marginTop: 16, fontFamily: fonts.regular, fontSize: 16, color: colors.muted, lineHeight: 22 },
  cta: {
    backgroundColor: colors.inkSoft,
    borderWidth: 1,
    borderColor: colors.limeLine,
    borderRadius: 32,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontFamily: fonts.medium, fontSize: 16, color: colors.lime },
});
