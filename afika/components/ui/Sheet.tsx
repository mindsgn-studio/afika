import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/theme";

export default function Sheet({ children }: { children: ReactNode }) {
  return <View style={styles.sheet}>{children}</View>;
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 20 },
});
