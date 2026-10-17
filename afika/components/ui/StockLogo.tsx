import { StyleSheet, View } from "react-native";
import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";
import { colors, fonts } from "@/theme";
import { Image } from 'expo-image';

type Props = {
  name?: string;
  iconUrl?: string | null;
  icon?: ComponentType<SvgProps>;
  size?: number;
  ring?: string;
  bordered?: boolean;
};

export default function StockLogo({
  name = "",
  iconUrl,
  icon: Icon,
  size = 100,
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
        },
      ]}
    >
      {Icon ? (
        <Icon width={size} height={size} />
      ) : (
        <Image
          source={iconUrl ?? undefined}
          style={{ backgroundColor: "none", width: size, height: size,  }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
