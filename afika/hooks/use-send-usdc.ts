import { useCallback, useRef, useState } from "react";
import { encodeFunctionData, erc20Abi } from "viem";
import { useEmbeddedEthereumWallet } from "@privy-io/expo";

import { SEND_TOKEN } from "@/constants/tokens";
import { useKernelClient } from "@/hooks/use-Kernal";
import { useWalletBalances } from "@/hooks/use-wallet-balances";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress } from "@/lib/wallet";
import { parseTokenAmount, sanitizeDecimalInput } from "@/lib/amount";
import {
  buildPendingTransactionId,
  createPendingTransaction,
  updateTransaction,
} from "@/lib/transactions";

export type SendResult = { userOperationHash: string; txHash?: string };

/**
 * Sends the configured stablecoin (USDC on Base) from the active smart wallet
 * to another address, recording pending → submitted/failed states in Firestore.
 */
export function useSendUsdc() {
  const { wallets } = useEmbeddedEthereumWallet();
  const wallet = wallets?.[0];
  const { kernelClient } = useKernelClient(wallet);
  const walletStore = useWallet();
  const activeWalletAddress = getActiveWalletAddress(walletStore);
  const { balanceMap } = useWalletBalances(activeWalletAddress);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const available = balanceMap.USDC?.amount || "0";

  const send = useCallback(
    async (recipient: string, amount: string): Promise<SendResult> => {
      // Guard against double taps creating two transfers.
      if (inFlight.current) {
        throw new Error("A transfer is already in progress.");
      }
      if (!recipient?.trim() || !activeWalletAddress || !kernelClient) {
        throw new Error("Your wallet is still loading. Please try again.");
      }

      const normalizedAmount = sanitizeDecimalInput(amount);
      const toAddress = recipient.trim().toLowerCase() as `0x${string}`;
      const timestampMs = Date.now();
      const pendingDocId = buildPendingTransactionId("send");

      inFlight.current = true;
      setSending(true);
      setError(null);

      let result: SendResult | null = null;
      let failure: Error | null = null;

      try {
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
          toAddress,
          description: `Sending ${normalizedAmount} ${SEND_TOKEN.symbol}`,
          timestampMs,
          timestamp: timestampMs,
          fetchedAtMs: timestampMs,
          fetchedAt: timestampMs,
        });

        const callData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [
            toAddress,
            parseTokenAmount(normalizedAmount, SEND_TOKEN.decimals),
          ],
        });

        const userOperationHash = await kernelClient.sendUserOperation({
          calls: [
            { to: SEND_TOKEN.address, data: callData, value: BigInt(0) },
          ],
        });

        await updateTransaction(activeWalletAddress, pendingDocId, {
          state: "submitted",
          userOperationHash,
        });

        const receipt = await kernelClient.waitForUserOperationReceipt({
          hash: userOperationHash,
        });

        result = {
          userOperationHash,
          txHash: receipt?.receipt?.transactionHash,
        };
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Something went wrong.";
        await updateTransaction(activeWalletAddress, pendingDocId, {
          state: "failed",
          errorMessage: message,
        }).catch(() => null);
        setError(message);
        failure = cause instanceof Error ? cause : new Error(message);
      }

      inFlight.current = false;
      setSending(false);

      if (failure) {
        throw failure;
      }

      return result as SendResult;
    },
    [activeWalletAddress, kernelClient],
  );

  const resetError = useCallback(() => setError(null), []);

  return {
    available,
    decimals: SEND_TOKEN.decimals,
    tokenSymbol: SEND_TOKEN.symbol,
    sending,
    error,
    resetError,
    send,
  };
}
