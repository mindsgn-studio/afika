import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts } from "@/theme";
import Hero from "@/components/hero"
import { ChromaRing } from "@/shared/ui/organisms/chroma-ring";
import Reanimated from "react-native-reanimated"
import { useState, useCallback } from "react";
import { useLoginWithOAuth, OAuthProviderID } from "@privy-io/expo";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

export default function Onboarding() {
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
    <View style={styles.screen} testID="onboarding-screen">
      <Hero />
      <Reanimated.View style={styles.body}>
        <Text style={styles.headline}>A GLOBAL WALLET FOR A GLOBAL MARKET</Text>
        <ChromaRing style={{alignSelf: "center",  marginTop: 40}} base={colors.ink} >
          <Pressable style={{ width: "100%", height: "100%", justifyContent: "center"}} onPress={() => handleSignIn(Platform.OS === "ios" ? "apple" : "google")} testID="get-started">
            <Text style={styles.ctaText}>{ Platform.OS === "android"? "SIGN IN WITH GOOGLE" : "SIGN IN WITH APPLE"}</Text>
          </Pressable>
        </ChromaRing>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  rowsWrap: { maxHeight: 220 },
  rows: { gap: 14, paddingTop: 8, overflow: "hidden" },
  row: { flexDirection: "row", gap: 22 },
  ticker: { flexDirection: "row", alignItems: "center", gap: 10 },
  tickerName: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  tickerSymbol: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  body: { paddingTop: 40, justifyContent: "space-between",  paddingHorizontal: 20, paddingVertical: 20, backgroundColor: colors.ink, borderTopRightRadius: 40, borderTopLeftRadius: 40},
  badge: { flexDirection: "row", alignItems: "center",},
  badgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink, letterSpacing: 0.2 },
  headline: { fontFamily: fonts.medium , fontSize: 54, lineHeight: 58, color: colors.paper, letterSpacing: -1.5 },
  cta: {
    alignSelf: "center",
    backgroundColor: colors.ink,
    borderRadius: 32,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.lime
  },
  ctaText: { fontFamily: fonts.medium, fontSize: 16, color: colors.lime, alignSelf: "center" },
});
