import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";

type Props = { value: number; label: string };

export default function StatCard({ value, label }: Props) {
  const down = value < 0;
  return (
    <View style={styles.stat} testID={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Text style={styles.statValue}>${formatMoney(Math.abs(value), value >= 100 ? 1 : 2)}</Text>
      <Feather name={down ? "arrow-down" : "arrow-up"} size={18} color={down ? colors.red : colors.green} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: 18,
    padding: 16,
    height: 88,
    justifyContent: "space-between",
  },
  statValue: { fontFamily: fonts.medium, fontSize: 22, color: colors.ink },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
