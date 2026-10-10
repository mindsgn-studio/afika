import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/theme";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "outline";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

export default function PillButton({
  label,
  onPress,
  variant = "solid",
  disabled,
  loading,
  testID,
}: Props) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, variant === "outline" ? styles.outline : styles.solid, (disabled || loading) && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "solid" ? colors.lime : colors.ink} />
      ) : (
        <Text style={variant === "outline" ? styles.outlineText : styles.solidText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, height: 58, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  solid: { backgroundColor: colors.ink },
  outline: { borderWidth: 1, borderColor: colors.ink, backgroundColor: colors.paper },
  solidText: { fontFamily: fonts.medium, fontSize: 16, color: colors.lime },
  outlineText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  disabled: { opacity: 0.5 },
});
