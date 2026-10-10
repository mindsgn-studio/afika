import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import Transactions from "@/components/transactions";
import { colors, fonts } from "@/theme";

export default function Activity() {
  return (
    <SafeAreaView style={styles.screen} testID="activity-screen">
      <Text style={styles.title}>Activity</Text>
      <View style={{ flex: 1 }}>
        <Transactions />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink, marginTop: 8, marginBottom: 12 },
});
