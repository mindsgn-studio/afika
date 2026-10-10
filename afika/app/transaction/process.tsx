import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { colors, fonts } from "@/theme";

export default function TransactionProcessScreen() {
  const { title, message } = useLocalSearchParams<{ title?: string; message?: string }>();

  return (
    <SafeAreaView style={styles.container} testID="tx-process-screen">
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.ink} />
        <Text style={styles.title}>{title || "Processing transaction"}</Text>
        <Text style={styles.message}>
          {message || "Please keep this screen open while we submit your transaction."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", backgroundColor: colors.paper, borderRadius: 28, padding: 24, alignItems: "center", gap: 16 },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink, textAlign: "center" },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: "center" },
});
