import { View, StyleSheet } from "react-native";
import StockLogo from "@/components/ui/StockLogo";
import { STOCK_ALLOWLIST } from "@/constants/stocks";
import { colors, fonts } from "@/theme";
import { Marquee } from "@/shared/ui/base/marquee";
import UsdcLogo from "@/assets/stocks/usdc.svg";
import EurcLogo from "@/assets/stocks/eurc.svg";
import BitcoinLogo from "@/assets/stocks/bitcoin.svg";
import ZarpLogo from "@/assets/stocks/zarp.svg";
import BaseLogo from "@/assets/stocks/base.svg";

const rows = [
  STOCK_ALLOWLIST.slice(0, 3),
];

const rowLogos = [UsdcLogo, EurcLogo, BitcoinLogo, ZarpLogo, BaseLogo];

export default function Hero() {

  return (
    <View style={styles.screen}>
      {rowLogos.map((Logo, rowIndex) => (
        <Marquee key={rowIndex}>
          {STOCK_ALLOWLIST.map((t) => (
            <View key={t.ticker} style={styles.ticker}>
              <StockLogo name={t.name} size={100} icon={Logo} />
            </View>
          ))}
        </Marquee>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper
  },
  row: {
    paddingVertical: 20
  },
  ticker: {
    margin: 20,
  },
  rows: {
    paddingVertical: 20,
  },
  ctaText: { fontFamily: fonts.medium, fontSize: 16, color: colors.lime },
});
