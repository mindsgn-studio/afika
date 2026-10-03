import { Image, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/theme";

type Props = {
  name?: string;
  iconUrl?: string | null;
  size?: number;
  ring?: string;
  bordered?: boolean;
};

export default function StockLogo({
  name = "",
  iconUrl,
  size = 40,
  ring,
  bordered = true,
}: Props) {
  const monogram = (name || "?").slice(0, 1).toUpperCase();
  return (
    <View
      testID="stock-logo"
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring ? 2 : bordered ? 1 : 0,
          borderColor: ring ?? colors.line,
        },
      ]}
    >
      {iconUrl ? (
        <Image source={{ uri: iconUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.42, color: colors.ink }}>
          {monogram}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
