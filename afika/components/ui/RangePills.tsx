import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/theme";

const RANGES = ["1D", "7D", "1M", "1Y"];

type Props = {
  value: string;
  onChange: (range: string) => void;
};

export default function RangePills({ value, onChange }: Props) {
  return (
    <View style={styles.rangeRow} testID="range-pills">
      {RANGES.map((range) => {
        const on = range === value;
        return (
          <Pressable key={range} onPress={() => onChange(range)} style={[styles.pill, on && styles.pillOn]} testID={`range-${range}`}>
            <Text style={[styles.pillText, on && styles.pillTextOn]}>{range}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26 },
  pill: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: colors.ink },
  pillText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  pillTextOn: { color: colors.lime },
});
