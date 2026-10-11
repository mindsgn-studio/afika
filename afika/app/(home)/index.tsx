import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { usePrivy, useEmbeddedEthereumWallet } from "@privy-io/expo";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { useKernelClient } from "@/hooks/use-Kernal";
import { useFirebaseSession } from "@/hooks/use-firebase-session";
import { useWallet } from "@/store/wallet";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { useHoldings } from "@/hooks/use-holdings";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useStocks } from "@/hooks/use-stocks";
import { useTransactions } from "@/hooks/use-transactions";
import { useSyncCurrencyPreference } from "@/hooks/use-currency-preference";
import { getActiveWalletAddress } from "@/lib/wallet";
import { DEFAULT_WALLET_NETWORK, upsertWallet } from "@/lib/firebase";
import { parseNumber } from "@/lib/money";
import HeroHeader from "@/components/ui/HeroHeader";
import Sheet from "@/components/ui/Sheet";
import PortfolioCard from "@/components/ui/PortfolioCard";
import TransactionRow from "@/components/ui/TransactionRow";
import EmptyTransactionCard from "@/components/empty-transaction-card";
import SendTray from "@/components/send/send-tray";
import { colors, fonts } from "@/theme";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const RECENT_TRANSACTIONS_LIMIT = 8;

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
  useSyncCurrencyPreference(activeWalletAddress);
  const { balanceMap } = useWalletBalances(activeWalletAddress);
  const { holdings } = useHoldings(activeWalletAddress);
  const { summary } = usePortfolio(activeWalletAddress);
  const { byAddress } = useStocks();
  const { transactions } = useTransactions(
    activeWalletAddress,
    RECENT_TRANSACTIONS_LIMIT,
  );

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
  const total = summary.netWorth || summary.totalValue || (usdc + holdingsValue);

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
        <View style={styles.actions}>
          <SendTray />
        </View>
      </HeroHeader>

      <Sheet>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Pressable onPress={() => router.push("/activity")} testID="see-all-transactions">
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          <FlashList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TransactionRow tx={item} />}
            ListEmptyComponent={<EmptyTransactionCard />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 20, color: colors.ink },
  seeAll: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  actions: { alignItems: "center", marginTop: 18 },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
});
