import { useEffect, useRef } from "react";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress } from "@/lib/wallet";
import { useTransactions } from "@/hooks/use-transactions";
import { readLocal, writeLocal } from "@/lib/local-store";
import {
  enqueuePushNotification,
  getPushNotificationDetails,
  hasPushNotificationDetails,
} from "@/lib/wallet-service";

const SEEN_KEY_PREFIX = "incoming-seen";

function getSeenKey(walletAddress: string) {
  return `${SEEN_KEY_PREFIX}.${walletAddress.trim().toLowerCase()}`;
}

async function getSeenSet(walletAddress: string): Promise<Set<string>> {
  const stored = await readLocal<string[]>(getSeenKey(walletAddress), []);
  return new Set(Array.isArray(stored) ? stored : []);
}

async function saveSeenSet(walletAddress: string, set: Set<string>) {
  await writeLocal(getSeenKey(walletAddress), Array.from(set));
}

/**
 * Pure builder for the incoming payment notification payload (no RN/expo imports).
 * Used for testing.
 */
export function buildIncomingPaymentNotification(tx: {
  id: string;
  amount?: string;
  tokenSymbol?: string;
  usdAmount?: string;
  direction?: string;
}) {
  const amount = tx.amount || "0";
  const token = tx.tokenSymbol || "";
  const usd = tx.usdAmount ? ` ($${tx.usdAmount})` : "";
  const body = `You received ${amount} ${token}${usd}.`;
  return {
    title: "Money received",
    body,
    data: {
      type: "incoming_payment",
      txId: tx.id,
      tokenSymbol: token,
    },
  } as const;
}

export async function shouldSendIncomingPaymentNotification(
  walletAddress: string,
  tx: {
    id: string;
    direction?: string;
    state?: string;
  },
): Promise<boolean> {
  if (!walletAddress || !tx?.id) return false;
  if (tx.direction !== "credit") return false;
  const seen = await getSeenSet(walletAddress);
  if (seen.has(tx.id)) return false;
  const hasDetails = await hasPushNotificationDetails(walletAddress);
  if (!hasDetails) return false;
  const details = await getPushNotificationDetails(walletAddress);
  if (!details?.enabled) return false;
  return true;
}

export async function markIncomingPaymentSeen(walletAddress: string, txId: string) {
  if (!walletAddress || !txId) return;
  const seen = await getSeenSet(walletAddress);
  seen.add(txId);
  await saveSeenSet(walletAddress, seen);
}

export async function sendIncomingPaymentNotification(
  walletAddress: string,
  tx: {
    id: string;
    amount?: string;
    tokenSymbol?: string;
    usdAmount?: string;
    direction?: string;
    state?: string;
  },
) {
  if (!(await shouldSendIncomingPaymentNotification(walletAddress, tx))) {
    return false;
  }
  const payload = buildIncomingPaymentNotification(tx);
  try {
    const queueId = await enqueuePushNotification(walletAddress, {
      title: payload.title,
      body: payload.body,
      data: { ...payload.data },
    });
    if (!queueId) return false;
    await markIncomingPaymentSeen(walletAddress, tx.id);
    return true;
  } catch (error) {
    console.log("sendIncomingPaymentNotification error:", error);
    return false;
  }
}

/**
 * Watches transactions and queues a local notification when a new incoming
 * (credit) payment is detected, if push notifications are enabled. Delivery
 * needs a REST endpoint, so messages stay in the device queue for now.
 */
export function useIncomingPaymentNotifications(limit?: number) {
  const walletStore = useWallet();
  const walletAddress = getActiveWalletAddress(walletStore);
  const { transactions } = useTransactions(walletAddress, limit);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    if (!walletAddress) return;

    getSeenSet(walletAddress).then((seen) => {
      if (mounted) seenRef.current = seen;
    });

    const process = async () => {
      for (const tx of transactions) {
        if (tx.direction !== "credit") continue;
        if (seenRef.current.has(tx.id)) continue;
        const hasDetails = await hasPushNotificationDetails(walletAddress);
        if (!hasDetails) continue;
        const details = await getPushNotificationDetails(walletAddress);
        if (!details?.enabled) continue;
        const payload = buildIncomingPaymentNotification(tx);
        let queued = false;
        try {
          const queueId = await enqueuePushNotification(walletAddress, {
            title: payload.title,
            body: payload.body,
            data: { ...payload.data },
          });
          queued = Boolean(queueId);
        } catch (error) {
          console.log("incoming notif error", error);
        }
        if (!queued) continue;
        seenRef.current.add(tx.id);
        await saveSeenSet(walletAddress, seenRef.current);
      }
    };

    process();
    return () => {
      mounted = false;
    };
  }, [walletAddress, transactions]);
}
