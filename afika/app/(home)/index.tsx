import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePrivy, useEmbeddedEthereumWallet } from "@privy-io/expo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { useKernelClient } from "@/hooks/use-Kernal";
import { useFirebaseSession } from "@/hooks/use-firebase-session";
import { useWallet } from "@/store/wallet";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { useHoldings } from "@/hooks/use-holdings";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useStocks } from "@/hooks/use-stocks";
import { useWatchlist } from "@/hooks/use-watchlist";
import { getActiveWalletAddress } from "@/lib/wallet";
import { DEFAULT_WALLET_NETWORK, upsertWallet } from "@/lib/firebase";
import { parseNumber } from "@/lib/money";
import HeroHeader from "@/components/ui/HeroHeader";
import Sheet from "@/components/ui/Sheet";
import StatCard from "@/components/ui/StatCard";
import HoldingRow from "@/components/ui/HoldingRow";
import StockLogo from "@/components/ui/StockLogo";
import { colors, fonts } from "@/theme";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export default function Portfolio() {
  const [isReady, setIsReady] = useState(false);
  const { setWallet } = useWallet();
  const walletStore = useWallet();
  const { user } = usePrivy();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const wallet = wallets?.[0];
  const { kernelAddress } = useKernelClient(wallet);
  const router = useRouter();
  useFirebaseSession();

  const activeWalletAddress = getActiveWalletAddress(walletStore);
  const { balanceMap } = useWalletBalances(activeWalletAddress);
  const { holdings } = useHoldings(activeWalletAddress);
  const { summary } = usePortfolio(activeWalletAddress);
  const { byAddress, stocks } = useStocks();
  const { items: watchlist } = useWatchlist(activeWalletAddress);

  useEffect(() => {
    if (user && wallets.length === 0) {
      create();
    }
  }, [wallets, user, create]);

  useFocusEffect(
    useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      };
    }, [])
  );

  useEffect(() => {
    let mounted = true;
    const checkDeployed = async () => {
      if (!kernelAddress || !wallet?.address) return;
      try {
        const code = await publicClient.getCode({ address: kernelAddress });
        if (mounted) {
          setWallet({
            smartContractDeployed: code !== "0x",
            address: wallet.address,
            smartAdress: kernelAddress,
          });
          setIsReady(true);
        }
      } catch (error) {
        console.warn("Failed to check smart account deployment:", error);
      }
    };
    checkDeployed();
    return () => {
      mounted = false;
    };
  }, [kernelAddress, wallet?.address, setWallet]);

  useEffect(() => {
    const address = (kernelAddress || "").trim().toLowerCase();
    if (!address) {
      return;
    }
    upsertWallet(address, {
      address,
      network: DEFAULT_WALLET_NETWORK,
    });
  }, [kernelAddress, wallet?.address]);

  const usdc = parseNumber(balanceMap.USDC?.usdAmount || balanceMap.USDC?.amount);
  const holdingsValue = holdings.reduce((sum, holding) => {
    const stock = byAddress[holding.stockAddress];
    return sum + holding.qty * (stock?.price || holding.avgCost);
  }, 0);
  const total = summary.totalValue || usdc + holdingsValue;

  const quick = useMemo(() => {
    if (watchlist.length) {
      return watchlist
        .map((item) => byAddress[item.stockAddress])
        .filter(Boolean)
        .slice(0, 5);
    }
    return stocks.slice(0, 4);
  }, [watchlist, byAddress, stocks]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="portfolio-screen">
      <HeroHeader balance={total} onAddMoney={() => router.push("/top-up")}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick}>
          <Pressable style={styles.quickItem} onPress={() => router.push("/explore")} testID="quick-add">
            <View style={styles.addCircle}>
              <Feather name="plus" size={26} color={colors.lime} />
            </View>
            <Text style={styles.quickLabel}> </Text>
          </Pressable>
          {quick.map((stock) => (
            <Pressable
              key={stock.address}
              style={styles.quickItem}
              onPress={() => router.push(`/stock/${stock.address}`)}
              testID={`quick-${stock.symbol}`}
            >
              <StockLogo name={stock.name} iconUrl={stock.iconUrl} size={64} ring={colors.lime} />
              <Text style={styles.quickLabel}>{stock.symbol}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </HeroHeader>

      <Sheet>
        <View style={styles.statRow}>
          <StatCard value={summary.dayPnl} label="Per day" />
          <StatCard value={summary.allTimePnl} label="All time" />
        </View>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Pressable onPress={() => router.push("/explore")}>
            <Text style={styles.seeAll}>see all</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {holdings.filter((h) => h.qty > 0).length === 0 ? (
            <Text style={styles.empty}>Buy your first stock from Explore.</Text>
          ) : (
            holdings
              .filter((h) => h.qty > 0)
              .map((holding) => {
                const stock = byAddress[holding.stockAddress];
                const price = stock?.price || holding.avgCost;
                const totalValue = holding.qty * price;
                const pnl = totalValue - holding.costBasis;
                const pnlPct = holding.costBasis ? Number(((pnl / holding.costBasis) * 100).toFixed(2)) : 0;
                return (
                  <HoldingRow
                    key={holding.stockAddress}
                    name={stock?.name || holding.symbol || "Stock"}
                    iconUrl={stock?.iconUrl}
                    qty={holding.qty}
                    avg={holding.avgCost}
                    total={totalValue}
                    pnl={pnl}
                    pnlPct={pnlPct}
                    onPress={() => router.push(`/stock/${holding.stockAddress}`)}
                  />
                );
              })
          )}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  quick: { gap: 14, paddingTop: 30 },
  quickItem: { alignItems: "center", gap: 8 },
  addCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.limeLine,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.paper },
  statRow: { flexDirection: "row", gap: 12 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  seeAll: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, paddingVertical: 20 },
});
