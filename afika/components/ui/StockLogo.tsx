import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/theme";
import logoPath from '@/assets/stocks/usdc.svg';
import { Image } from 'expo-image';

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
      <Image
        source={iconUrl}
        style={{ backgroundColor: "none", width: size, height: size,  }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
