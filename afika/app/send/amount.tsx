import { useMemo, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from "react-native";
import { encodeFunctionData, erc20Abi } from "viem";
import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import { SEND_TOKEN } from "@/constants/tokens";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { useKernelClient } from "@/hooks/use-Kernal";
import { parseTokenAmount, sanitizeDecimalInput } from "@/lib/amount";
import {
  buildPendingTransactionId,
  createPendingTransaction,
  updateTransaction,
} from "@/lib/transactions";
import { shortenAddress, getActiveWalletAddress } from "@/lib/wallet";
import { useWallet } from "@/store/wallet";
import { KeyboardAvoidingView } from "react-native";
import AmountInput from "@/components/amount-input";

export default function SendAmountScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets?.[0];
  const { kernelClient, loading: kernelLoading } = useKernelClient(wallet);
  const walletStore = useWallet();
  const activeWalletAddress = getActiveWalletAddress(walletStore);
  const { balanceMap, loading: balancesLoading } =
    useWalletBalances(activeWalletAddress);
  const usdcBalance = balanceMap.USDC;

  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  const shortAddress = useMemo(() => shortenAddress(address), [address]);
  const availableAmount = usdcBalance?.amount || "0";

  const validateAmount = () => {
    try {
      const parsedAmount = parseTokenAmount(amount, SEND_TOKEN.decimals);
      const parsedBalance = parseTokenAmount(
        availableAmount,
        SEND_TOKEN.decimals,
      );

      if (parsedAmount <= 0n) {
        return "Please enter a valid USDC amount.";
      }
      if (parsedAmount > parsedBalance) {
        return "Send amount cannot exceed your available USDC balance.";
      }
      return null;
    } catch {
      return "Please enter a valid USDC amount.";
    }
  };

  const handleSend = async () => {
    const validationError = validateAmount();
    if (validationError) {
      Alert.alert("Invalid amount", validationError);
      return;
    }

    if (!address?.trim() || !activeWalletAddress || !kernelClient) {
      Alert.alert(
        "Wallet not ready",
        "Your smart wallet is still loading. Please try again.",
      );
      return;
    }

    const normalizedAmount = sanitizeDecimalInput(amount);
    const timestampMs = Date.now();
    const pendingDocId = buildPendingTransactionId("send");

    try {
      setSending(true);

      await createPendingTransaction(activeWalletAddress, pendingDocId, {
        kind: "send",
        state: "pending",
        source: "app",
        walletAddress: activeWalletAddress,
        network: "base-mainnet",
        direction: "debit",
        tokenSymbol: SEND_TOKEN.symbol,
        tokenAddress: SEND_TOKEN.address,
        amount: normalizedAmount,
        usdAmount: normalizedAmount,
        fromAddress: activeWalletAddress,
        toAddress: address.toLowerCase(),
        description: `Sending ${normalizedAmount} USDC`,
        timestampMs,
        timestamp: timestampMs,
        fetchedAtMs: timestampMs,
        fetchedAt: timestampMs,
      });

      router.push({
        pathname: "/transaction/process",
        params: {
          title: "Sending USDC",
          message: `Sending ${normalizedAmount} USDC to ${shortAddress}.`,
        },
      });

      const callData = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          address as `0x${string}`,
          parseTokenAmount(normalizedAmount, SEND_TOKEN.decimals),
        ],
      });

      const userOperationHash = await kernelClient.sendUserOperation({
        calls: [
          {
            to: SEND_TOKEN.address,
            data: callData,
            value: 0n,
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
          title: "USDC sent",
          message: `You sent ${normalizedAmount} USDC successfully.`,
          amount: normalizedAmount,
          token: "USDC",
          target: address,
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
          title: "Send failed",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong while sending USDC.",
          retryPath: `/send/amount?address=${address}`,
        },
      });
    } finally {
      setSending(false);
    }
  };

  const amountError = amount ? validateAmount() : null;

  return (
    <KeyboardAvoidingView style={styles.container} testID="send-amount-screen">
      {/*
        <View style={styles.header}>
          <Text style={styles.title}>Send USDC</Text>
          <Text style={styles.subtitle}>Sending to {shortAddress}</Text>
          <Text style={styles.balanceText}>
            Available: {availableAmount} USDC
          </Text>
          {amountError ? (
            <Text style={styles.errorText}>{amountError}</Text>
          ) : null}
        </View>
       */}
      <AmountInput
        amount={amount}
        currency={"USDC"}
        onChange={setAmount}
        name={shortAddress}
        handleCompleteSwipe={handleSend}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F4F5F7",
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    color: "#666",
  },
  balanceText: {
    marginTop: 10,
    fontSize: 14,
    color: "#475569",
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: "#B91C1C",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: "#1D4878",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#1D4878",
    paddingVertical: 18,
    borderRadius: 24,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
