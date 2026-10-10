import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import { encodeFunctionData, erc20Abi } from "viem";
import { router } from "expo-router";
import { BASE_TOKEN_METADATA, type TokenMetadata } from "@/constants/tokens";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { useKernelClient } from "@/hooks/use-Kernal";
import { formatTokenAmount, parseTokenAmount, sanitizeDecimalInput } from "@/lib/amount";
import { fetchSwapQuote, type ZeroExQuote } from "@/lib/swap";
import {
  buildPendingTransactionId,
  createPendingTransaction,
  updateTransaction,
} from "@/lib/transactions";
import { getActiveWalletAddress } from "@/lib/wallet";
import { useWallet } from "@/store/wallet";
import { colors, fonts } from "@/theme";

type ReviewState = {
  quote: ZeroExQuote;
  amount: string;
  fromToken: TokenMetadata;
  toToken: TokenMetadata;
  expectedBuyAmount: string;
};

export default function SwapScreen() {
  const walletStore = useWallet();
  const activeWalletAddress = getActiveWalletAddress(walletStore);
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets?.[0];
  const { kernelClient, loading: kernelLoading } = useKernelClient(wallet);
  const { balances, balanceMap, loading: balancesLoading } = useWalletBalances(activeWalletAddress);

  const availableTokens = useMemo(() => {
    return balances
      .map((balance) => BASE_TOKEN_METADATA[balance.tokenSymbol?.toUpperCase() || ""])
      .filter((token): token is TokenMetadata => Boolean(token?.swapSupported));
  }, [balances]);

  const [fromToken, setFromToken] = useState<TokenMetadata | null>(null);
  const [toToken, setToToken] = useState<TokenMetadata | null>(null);
  const [amount, setAmount] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!fromToken && availableTokens.length > 0) {
      setFromToken(availableTokens[0]);
    }
    if (!toToken && availableTokens.length > 1) {
      setToToken(availableTokens[1]);
    }
  }, [availableTokens, fromToken, toToken]);

  useEffect(() => {
    setReviewState(null);
  }, [amount, fromToken?.symbol, toToken?.symbol]);

  const fromBalance = fromToken ? balanceMap[fromToken.symbol] : null;
  const toBalance = toToken ? balanceMap[toToken.symbol] : null;

  const validationMessage = useMemo(() => {
    if (!fromToken || !toToken) {
      return "Choose tokens to swap.";
    }
    if (fromToken.symbol === toToken.symbol) {
      return "Choose two different tokens.";
    }
    if (!amount.trim()) {
      return null;
    }
    try {
      const parsedAmount = parseTokenAmount(amount, fromToken.decimals);
      const available = parseTokenAmount(fromBalance?.amount || "0", fromToken.decimals);
      if (parsedAmount <= 0n) {
        return "Please enter a valid amount.";
      }
      if (parsedAmount > available) {
        return "Swap amount cannot exceed your available balance.";
      }
      return null;
    } catch (error) {
      return "Please enter a valid amount.";
    }
  }, [amount, fromBalance?.amount, fromToken, toToken]);

  const switchTokens = () => {
    if (!fromToken || !toToken) return;
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const fetchReviewQuote = async () => {
    if (!fromToken || !toToken || !activeWalletAddress) {
      Alert.alert("Swap unavailable", "Your wallet is still loading. Please try again.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      Alert.alert("Invalid amount", "Please enter an amount to swap.");
      return;
    }

    if (validationMessage) {
      Alert.alert("Invalid swap", validationMessage);
      return;
    }

    try {
      setLoadingQuote(true);
      const normalizedAmount = sanitizeDecimalInput(amount);
      const quote = await fetchSwapQuote({
        sellToken: fromToken,
        buyToken: toToken,
        sellAmount: parseTokenAmount(normalizedAmount, fromToken.decimals).toString(),
        taker: activeWalletAddress,
      });

      setReviewState({
        quote,
        amount: normalizedAmount,
        fromToken,
        toToken,
        expectedBuyAmount: formatTokenAmount(quote.buyAmount, toToken.decimals, 8),
      });
    } catch (error) {
      Alert.alert(
        "Quote failed",
        error instanceof Error ? error.message : "Unable to fetch a swap quote right now."
      );
    } finally {
      setLoadingQuote(false);
    }
  };

  const maybeApproveSellToken = async (quote: ZeroExQuote, sellToken: TokenMetadata) => {
    if (sellToken.isNative) return null;

    const spender = quote.issues?.allowance?.spender || quote.allowanceTarget;
    const actualAllowance = BigInt(quote.issues?.allowance?.actual || "0");
    const requiredAllowance = BigInt(quote.sellAmount);

    if (!spender || actualAllowance >= requiredAllowance) {
      return null;
    }

    const approvalCallData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [spender as `0x${string}`, requiredAllowance],
    });

    const approvalUserOpHash = await kernelClient.sendUserOperation({
      calls: [
        {
          to: sellToken.address,
          data: approvalCallData,
          value: 0n,
        },
      ],
    });

    await kernelClient.waitForUserOperationReceipt({
      hash: approvalUserOpHash,
    });

    return approvalUserOpHash;
  };

  const executeSwap = async () => {
    if (!reviewState || !fromToken || !toToken || !activeWalletAddress || !kernelClient) {
      Alert.alert("Swap unavailable", "Your smart wallet is still loading. Please try again.");
      return;
    }

    const timestampMs = Date.now();
    const pendingDocId = buildPendingTransactionId("swap");

    try {
      setSubmitting(true);

      await createPendingTransaction(activeWalletAddress, pendingDocId, {
        kind: "swap",
        state: "pending",
        source: "app",
        walletAddress: activeWalletAddress,
        network: "base-mainnet",
        direction: "debit",
        tokenSymbol: reviewState.fromToken.symbol,
        tokenAddress: reviewState.fromToken.address,
        amount: reviewState.amount,
        usdAmount:
          reviewState.fromToken.symbol === "USDC" || reviewState.fromToken.symbol === "DAI"
            ? reviewState.amount
            : undefined,
        fromAddress: activeWalletAddress,
        toAddress: reviewState.quote.transaction?.to || "",
        description: `Swapping ${reviewState.amount} ${reviewState.fromToken.symbol} to ${reviewState.toToken.symbol}`,
        timestampMs,
        timestamp: timestampMs,
        fetchedAtMs: timestampMs,
        fetchedAt: timestampMs,
        buyTokenSymbol: reviewState.toToken.symbol,
        buyTokenAddress: reviewState.toToken.address,
        buyAmountExpected: reviewState.expectedBuyAmount,
      });

      router.push({
        pathname: "/transaction/process",
        params: {
          title: "Swapping tokens",
          message: `Swapping ${reviewState.amount} ${reviewState.fromToken.symbol} for ${reviewState.toToken.symbol}.`,
        },
      });

      const approvalUserOpHash = await maybeApproveSellToken(reviewState.quote, reviewState.fromToken);
      const executableQuote = approvalUserOpHash
        ? await fetchSwapQuote({
            sellToken: reviewState.fromToken,
            buyToken: reviewState.toToken,
            sellAmount: parseTokenAmount(reviewState.amount, reviewState.fromToken.decimals).toString(),
            taker: activeWalletAddress,
          })
        : reviewState.quote;

      const userOperationHash = await kernelClient.sendUserOperation({
        calls: [
          {
            to: executableQuote.transaction!.to,
            data: executableQuote.transaction!.data,
            value: BigInt(executableQuote.transaction?.value || "0"),
          },
        ],
      });

      await updateTransaction(activeWalletAddress, pendingDocId, {
        state: "submitted",
        userOperationHash,
      });

      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOperationHash,
      });

      const txHash = receipt?.receipt?.transactionHash;

      router.replace({
        pathname: "/transaction/complete",
        params: {
          title: "Swap complete",
          message: `Swapped ${reviewState.amount} ${reviewState.fromToken.symbol} successfully.`,
          amount: reviewState.amount,
          token: reviewState.fromToken.symbol,
          secondaryAmount: reviewState.expectedBuyAmount,
          secondaryToken: reviewState.toToken.symbol,
          txHash: txHash || userOperationHash,
        },
      });
    } catch (error) {
      console.log(error);
      await updateTransaction(activeWalletAddress, pendingDocId, {
        state: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      }).catch(() => null);

      router.replace({
        pathname: "/transaction/error",
        params: {
          title: "Swap failed",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong while processing your swap.",
          retryPath: "/swap",
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const buttonLabel = reviewState ? "Swap Now" : "Review Swap";
  const estimatedReceive = reviewState
    ? reviewState.expectedBuyAmount
    : amount && fromToken && toToken
      ? "Fetch quote"
      : "0";

  return (
    <SafeAreaView style={styles.container} testID="swap-screen">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Swap</Text>
        <Text style={styles.subtitle}>Trade one token for another</Text>

        <View style={styles.card}>
          <Text style={styles.label}>From</Text>

          <TokenPicker
            tokens={availableTokens}
            selected={fromToken}
            onSelect={setFromToken}
            title="Sell token"
          />

          <Text style={styles.balance}>Balance: {fromBalance?.amount || "0"}</Text>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.switchButton, pressed && styles.buttonPressed]}
          onPress={switchTokens}
        >
          <Text style={styles.switchText}>↓</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.label}>To</Text>

          <TokenPicker
            tokens={availableTokens.filter((token) => token.symbol !== fromToken?.symbol)}
            selected={toToken}
            onSelect={setToToken}
            title="Buy token"
          />

          <Text style={styles.balance}>Balance: {toBalance?.amount || "0"}</Text>

          <Text style={styles.receiveAmount}>
            {estimatedReceive} {toToken?.symbol || ""}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow label="Network" value="Base" />
          <InfoRow label="Gas" value="Sponsored" />
          <InfoRow label="Sell balance" value={`${fromBalance?.amount || "0"} ${fromToken?.symbol || ""}`} />
          {reviewState ? (
            <>
              <InfoRow
                label="Min received"
                value={`${formatTokenAmount(
                  reviewState.quote.minBuyAmount || reviewState.quote.buyAmount,
                  reviewState.toToken.decimals,
                  8
                )} ${reviewState.toToken.symbol}`}
              />
              <InfoRow label="Route ready" value="0x quote loaded" />
            </>
          ) : null}
        </View>

        {validationMessage ? <Text style={styles.errorText}>{validationMessage}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.swapButton,
            pressed && styles.buttonPressed,
            (loadingQuote || submitting || kernelLoading || balancesLoading) && styles.buttonDisabled,
          ]}
          onPress={reviewState ? executeSwap : fetchReviewQuote}
          disabled={loadingQuote || submitting || kernelLoading || balancesLoading}
        >
          {loadingQuote || submitting ? (
            <ActivityIndicator color={colors.lime} />
          ) : (
            <Text style={styles.swapButtonText}>{buttonLabel}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TokenPicker({
  tokens,
  selected,
  onSelect,
  title,
}: {
  tokens: TokenMetadata[];
  selected: TokenMetadata | null;
  onSelect: (token: TokenMetadata) => void;
  title: string;
}) {
  if (tokens.length === 0) {
    return <Text style={styles.emptyText}>No swappable tokens available</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tokenPicker}>
      {tokens.map((token) => {
        const active = selected?.symbol === token.symbol;
        return (
          <Pressable
            key={`${title}-${token.symbol}`}
            style={({ pressed }) => [
              styles.pill,
              active && styles.pillActive,
              pressed && styles.pillPressed,
            ]}
            onPress={() => onSelect(token)}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{token.symbol}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontFamily: fonts.medium, fontSize: 34, color: colors.ink },
  subtitle: { marginTop: 6, marginBottom: 24, fontFamily: fonts.regular, fontSize: 16, color: colors.muted },
  card: { backgroundColor: colors.canvas, borderRadius: 24, padding: 18, marginBottom: 12 },
  label: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: 14 },
  balance: { marginTop: 10, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  input: { marginTop: 20, fontFamily: fonts.medium, fontSize: 36, color: colors.ink },
  receiveAmount: { marginTop: 20, fontFamily: fonts.medium, fontSize: 36, color: colors.ink },
  switchButton: {
    alignSelf: "center",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: -2,
    zIndex: 10,
  },
  switchText: { color: colors.lime, fontSize: 28, fontFamily: fonts.semibold },
  infoCard: { backgroundColor: colors.canvas, borderRadius: 20, padding: 18, marginTop: 8, marginBottom: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, gap: 12 },
  infoLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  infoValue: { flex: 1, textAlign: "right", color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  swapButton: { backgroundColor: colors.ink, paddingVertical: 18, borderRadius: 24, alignItems: "center" },
  swapButtonText: { color: colors.lime, fontFamily: fonts.medium, fontSize: 17 },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: { opacity: 0.85 },
  tokenPicker: { flexDirection: "row" },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.canvas, marginRight: 10 },
  pillActive: { backgroundColor: colors.ink },
  pillPressed: { opacity: 0.85 },
  pillText: { color: colors.ink, fontFamily: fonts.medium },
  pillTextActive: { color: colors.lime },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  errorText: { marginBottom: 12, color: colors.red, fontFamily: fonts.regular, fontSize: 14 },
});
