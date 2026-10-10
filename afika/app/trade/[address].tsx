import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import { parseUnits } from "viem";
import IconButton from "@/components/ui/IconButton";
import PillButton from "@/components/ui/PillButton";
import StockLogo from "@/components/ui/StockLogo";
import { useStock } from "@/hooks/use-stocks";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { useHoldings } from "@/hooks/use-holdings";
import { useKernelClient } from "@/hooks/use-Kernal";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress } from "@/lib/wallet";
import { eligibilityMessage, isEligibleToTrade } from "@/lib/eligibility";
import {
  buildTradeCalls,
  fetchFirmQuote,
  fetchIndicativePrice,
  stockTokenMetadata,
  usdcTokenMetadata,
  uiToRaw,
} from "@/lib/trade";
import { createPendingOrder, failOrder, submitOrder } from "@/lib/orders";
import { DEFAULT_SLIPPAGE_BPS, normalizeStockAddress } from "@/constants/stocks";
import { formatMoney, parseNumber } from "@/lib/money";
import { sanitizeDecimalInput } from "@/lib/amount";
import { colors, fonts } from "@/theme";

export default function TradeScreen() {
  const { address, side: sideParam } = useLocalSearchParams<{ address: string; side?: string }>();
  const router = useRouter();
  const side = sideParam === "sell" ? "sell" : "buy";
  const normalized = normalizeStockAddress(address);
  const { stock } = useStock(normalized);
  const uid = auth().currentUser?.uid;
  const { profile, saveEligibility } = useUserProfile(uid);
  const walletStore = useWallet();
  const activeWalletAddress = getActiveWalletAddress(walletStore);
  const { balanceMap } = useWalletBalances(activeWalletAddress);
  const { holdings } = useHoldings(activeWalletAddress);
  const { wallets } = useEmbeddedEthereumWallet();
  const { kernelClient } = useKernelClient(wallets?.[0]);
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState(profile?.country || "");
  const [quoteLabel, setQuoteLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const holding = holdings.find((h) => h.stockAddress === normalized);
  const usdc = parseNumber(balanceMap.USDC?.amount || balanceMap.USDC?.usdAmount);
  const eligible = isEligibleToTrade(profile);

  const sellToken = side === "buy" ? usdcTokenMetadata() : stockTokenMetadata(normalized, stock?.symbol || "STOCK", stock?.decimals);
  const buyToken = side === "buy" ? stockTokenMetadata(normalized, stock?.symbol || "STOCK", stock?.decimals) : usdcTokenMetadata();

  const sellAmountRaw = useMemo(() => {
    const clean = sanitizeDecimalInput(amount);
    if (!clean) return "";
    try {
      if (side === "buy") {
        return parseUnits(clean, 6).toString();
      }
      return uiToRaw(clean, stock?.multiplier || 1, stock?.decimals || 8).toString();
    } catch {
      return "";
    }
  }, [amount, side, stock?.multiplier, stock?.decimals]);

  useEffect(() => {
    if (!sellAmountRaw || !activeWalletAddress || !stock) {
      setQuoteLabel("");
      return;
    }
    const handle = setTimeout(() => {
      fetchIndicativePrice({
        sellToken,
        buyToken,
        sellAmount: sellAmountRaw,
        taker: activeWalletAddress,
      })
        .then((price) => {
          setQuoteLabel(
            side === "buy"
              ? `≈ ${formatMoney(Number(price.buyAmount) / 10 ** (stock.decimals || 8), 4)} shares`
              : `≈ $${formatMoney(Number(price.buyAmount) / 1e6)}`
          );
        })
        .catch(() => setQuoteLabel("Quote unavailable"));
    }, 400);
    return () => clearTimeout(handle);
  }, [sellAmountRaw, activeWalletAddress, stock?.address, side]);

  const blocked = stock && (!stock.tradable || stock.paused);

  const attest = async () => {
    const code = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      Alert.alert("Country required", "Enter a two-letter country code.");
      return;
    }
    if (code === "US") {
      Alert.alert("Not available", "Coinbase tokenized stocks are not available to US persons.");
      return;
    }
    try {
      await saveEligibility(code);
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Try again.");
    }
  };

  const submit = async () => {
    if (!stock || !activeWalletAddress || !kernelClient || !sellAmountRaw) {
      Alert.alert("Not ready", "Wallet or quote is still loading.");
      return;
    }
    if (blocked) {
      Alert.alert("Unavailable", "This stock is paused or not tradable.");
      return;
    }
    if (side === "buy" && parseNumber(amount) > usdc) {
      Alert.alert("Insufficient USDC", "Top up USDC before buying.");
      return;
    }
    if (side === "sell" && parseNumber(amount) > (holding?.qty || 0)) {
      Alert.alert("Insufficient shares", "You do not have that many shares.");
      return;
    }

    let orderId = "";
    try {
      setSubmitting(true);
      orderId = await createPendingOrder(activeWalletAddress, {
        side,
        stockAddress: normalized,
        symbol: stock.symbol,
        sellAmount: sellAmountRaw,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });
      router.push({
        pathname: "/transaction/process",
        params: {
          title: side === "buy" ? "Buying stock" : "Selling stock",
          message: `${side === "buy" ? "Buying" : "Selling"} ${stock.symbol}.`,
        },
      });
      const quote = await fetchFirmQuote({
        sellToken,
        buyToken,
        sellAmount: sellAmountRaw,
        taker: activeWalletAddress,
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });
      const calls = buildTradeCalls(quote, sellToken);
      const userOperationHash = await kernelClient.sendUserOperation({ calls });
      await submitOrder(activeWalletAddress, orderId, userOperationHash);
      const receipt = await kernelClient.waitForUserOperationReceipt({ hash: userOperationHash });
      router.replace({
        pathname: "/transaction/complete",
        params: {
          title: side === "buy" ? "Buy submitted" : "Sell submitted",
          message: "Your order is submitted. Confirmation happens on-chain.",
          amount,
          token: side === "buy" ? "USDC" : stock.symbol,
          txHash: receipt?.receipt?.transactionHash || userOperationHash,
        },
      });
    } catch (error) {
      if (orderId && activeWalletAddress) {
        await failOrder(activeWalletAddress, orderId, error instanceof Error ? error.message : "Unknown error").catch(() => null);
      }
      router.replace({
        pathname: "/transaction/error",
        params: {
          title: "Trade failed",
          message: error instanceof Error ? error.message : "Something went wrong.",
          retryPath: `/trade/${normalized}?side=${side}`,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} testID="trade-screen">
      <View style={styles.header}>
        <IconButton onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </IconButton>
        <Text style={styles.title}>{side === "buy" ? "Buy" : "Sell"} {stock?.symbol || ""}</Text>
        <View style={{ width: 40 }} />
      </View>

      {!eligible ? (
        <View style={styles.gate} testID="eligibility-gate">
          <Text style={styles.gateTitle}>Confirm eligibility</Text>
          <Text style={styles.gateBody}>{eligibilityMessage(profile)}</Text>
          <TextInput
            testID="country-input"
            value={country}
            onChangeText={setCountry}
            placeholder="Country code, e.g. ZA"
            autoCapitalize="characters"
            maxLength={2}
            style={styles.input}
          />
          <PillButton label="I am not a US person" testID="attest-eligibility" onPress={attest} />
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <StockLogo name={stock?.name} iconUrl={stock?.iconUrl} size={44} bordered={false} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{stock?.name}</Text>
              <Text style={styles.meta}>
                {side === "buy" ? `${formatMoney(usdc)} USDC available` : `${holding?.qty || 0} shares`}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.setParams({ address: normalized, side: side === "buy" ? "sell" : "buy" })
              }
              testID="toggle-side"
            >
              <Text style={styles.sideToggle}>{side === "buy" ? "Sell instead" : "Buy instead"}</Text>
            </Pressable>
          </View>

          <TextInput
            testID="trade-amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={side === "buy" ? "USDC amount" : "Share quantity"}
            style={styles.amount}
          />
          {side === "sell" ? (
            <Pressable onPress={() => setAmount(String(holding?.qty || 0))} testID="trade-max">
              <Text style={styles.max}>Max</Text>
            </Pressable>
          ) : null}
          <Text style={styles.quote}>{quoteLabel}</Text>
          {stock?.navStale ? <Text style={styles.warn}>Market is closed. Prices may move.</Text> : null}
          {blocked ? <Text style={styles.warn}>This stock is not tradable right now.</Text> : null}

          <View style={styles.review} testID="trade-review">
            <Text style={styles.reviewTitle}>Review</Text>
            <Text style={styles.reviewLine}>Slippage {DEFAULT_SLIPPAGE_BPS / 100}%</Text>
            <Text style={styles.reviewLine}>Network Base • Gas sponsored</Text>
          </View>
          <View style={{ marginTop: "auto", marginBottom: 12 }}>
            <PillButton
              label={side === "buy" ? "Buy now" : "Sell now"}
              testID="submit-trade"
              loading={submitting}
              disabled={!sellAmountRaw || Boolean(blocked)}
              onPress={submit}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  title: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  gate: { marginTop: 32, gap: 14 },
  gateTitle: { fontFamily: fonts.medium, fontSize: 22, color: colors.ink },
  gateBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, lineHeight: 22 },
  input: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.canvas,
    paddingHorizontal: 16,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24 },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  sideToggle: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  amount: { marginTop: 32, fontFamily: fonts.medium, fontSize: 40, color: colors.ink },
  max: { marginTop: 8, fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  quote: { marginTop: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  warn: { marginTop: 8, fontFamily: fonts.regular, fontSize: 13, color: colors.red },
  review: { marginTop: 28, backgroundColor: colors.canvas, borderRadius: 16, padding: 16, gap: 6 },
  reviewTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  reviewLine: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
