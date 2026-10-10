import { View, StyleSheet } from "react-native";
import StockLogo from "@/components/ui/StockLogo";
import { STOCK_ALLOWLIST } from "@/constants/stocks";
import { colors, fonts } from "@/theme";
import { Marquee } from "@/shared/ui/base/marquee";
import { Aurora } from "@/shared/ui/molecules/aurora";

const rows = [
  STOCK_ALLOWLIST.slice(0, 3),
];

export default function Hero() {

  return (
    <View style={styles.screen}>
      <Marquee>
            {STOCK_ALLOWLIST.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={100} iconUrl={"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Circle_USDC_Logo.svg/1280px-Circle_USDC_Logo.svg.png?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=thumbnail"}/>
              </View>
            ))}
      </Marquee>
      <Marquee>
            {STOCK_ALLOWLIST.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={100} iconUrl={"https://s2.coinmarketcap.com/static/img/coins/200x200/20641.png"}/>
              </View>
            ))}
      </Marquee>
      <Marquee>
            {STOCK_ALLOWLIST.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={100} iconUrl={"https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/3840px-Bitcoin.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail"}/>
              </View>
            ))}
      </Marquee>
      <Marquee>
            {STOCK_ALLOWLIST.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={100} iconUrl={"https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/tesla-icon.png"}/>
              </View>
            ))}
      </Marquee>
      <Marquee>
            {STOCK_ALLOWLIST.map((t) => (
              <View key={t.ticker} style={styles.ticker}>
                <StockLogo name={t.name} size={100} iconUrl={""}/>
              </View>
            ))}
      </Marquee>
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
