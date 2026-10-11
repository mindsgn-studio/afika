import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useWallet } from "@/store/wallet";
import { getActiveWalletAddress } from "@/lib/wallet";
import { useTransactions } from "@/hooks/use-transactions";
import {
  getPushNotificationDetails,
  hasPushNotificationDetails,
} from "@/lib/firebase";

const SEEN_KEY_PREFIX = "afika.incoming.seen";

function getSeenKey(walletAddress: string) {
  return `${SEEN_KEY_PREFIX}:${walletAddress.toLowerCase()}`;
}

async function getSeenSet(walletAddress: string): Promise<Set<string>> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(getSeenKey(walletAddress));
      if (raw) {
        return new Set(JSON.parse(raw) as string[]);
      }
      return new Set();
    }
  } catch {
    // ignore
  }
  try {
    // @ts-ignore
    const AsyncStorage: any = require("@react-native-async-storage/async-storage");
    const inst = AsyncStorage?.default ?? AsyncStorage;
    if (inst && typeof inst.getItem === "function") {
      const raw = await inst.getItem(getSeenKey(walletAddress));
      if (raw) return new Set(JSON.parse(raw) as string[]);
    }
  } catch (e) {
    // ignore
  }
  return new Set();
}

async function saveSeenSet(walletAddress: string, set: Set<string>) {
  const data = JSON.stringify(Array.from(set));
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(getSeenKey(walletAddress), data);
      return;
    }
  } catch {
    // ignore
  }
  try {
    // @ts-ignore
    const AsyncStorage: any = require("@react-native-async-storage/async-storage");
    const inst = AsyncStorage?.default ?? AsyncStorage;
    if (inst && typeof inst.setItem === "function") {
      await inst.setItem(getSeenKey(walletAddress), data);
    }
  } catch (e) {
    // ignore
  }
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
  }
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
  }
) {
  if (!(await shouldSendIncomingPaymentNotification(walletAddress, tx))) {
    return false;
  }
  const payload = buildIncomingPaymentNotification(tx);
  try {
    await Notifications.scheduleNotificationAsync({
      content: payload,
      trigger: null,
    });
    await markIncomingPaymentSeen(walletAddress, txIdKey(tx));
    return true;
  } catch (error) {
    console.log("sendIncomingPaymentNotification error:", error);
    return false;
  }
}

function txIdKey(tx: { id: string }) {
  return tx.id;
}

/**
 * Watches transactions and sends a push notification when a new incoming (credit)
 * payment is detected, if push notifications are enabled.
 */
export function useIncomingPaymentNotifications(limit?: number) {
  const walletStore = useWallet();
  const walletAddress = getActiveWalletAddress(walletStore);
  const { transactions } = useTransactions(walletAddress, limit);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    if (!walletAddress) return;

    getSeenSet(walletAddress).then((s) => {
      if (mounted) seenRef.current = s;
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
        try {
          await Notifications.scheduleNotificationAsync({
            content: payload,
            trigger: null,
          });
        } catch (e) {
          console.log("incoming notif error", e);
        }
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