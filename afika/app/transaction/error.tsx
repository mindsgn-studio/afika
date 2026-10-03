import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PillButton from "@/components/ui/PillButton";
import { colors, fonts } from "@/theme";

export default function TransactionErrorScreen() {
  const { title, message, retryPath } = useLocalSearchParams<{
    title?: string;
    message?: string;
    retryPath?: string;
  }>();

  return (
    <SafeAreaView style={styles.container} testID="tx-error-screen">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Error</Text>
        <Text style={styles.title}>{title || "Transaction failed"}</Text>
        <Text style={styles.message}>
          {message || "Something went wrong while processing your transaction."}
        </Text>
        <PillButton
          label="Try Again"
          onPress={() => {
            if (retryPath) {
              router.replace(retryPath as any);
              return;
            }
            router.back();
          }}
        />
        <PillButton label="Back Home" variant="outline" onPress={() => router.replace("/")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", backgroundColor: colors.paper, borderRadius: 28, padding: 24, gap: 18 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 14, color: colors.red, textTransform: "uppercase" },
  title: { fontFamily: fonts.medium, fontSize: 30, color: colors.ink },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.muted },
});
