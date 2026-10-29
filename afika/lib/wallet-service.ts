/**
 * Wallet registration and device-local wallet settings.
 *
 * Wallet rows are registered with `PUT /v1/wallet`. Preferences, push details,
 * and the outgoing notification queue have no REST endpoint yet, so they are
 * stored on the device instead of Firestore.
 */
import {
  ApiError,
  DEFAULT_WALLET_NETWORK,
  normalizeAddress,
  upsertWallet as upsertWalletRequest,
} from "@/lib/api";
import { readLocal, removeLocal, writeLocal } from "@/lib/local-store";
import { walletIdentityFields } from "@/lib/wallet-identity";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import {
  buildQueuedPushNotification,
  type PushNotificationPayload,
} from "@/lib/notification-queue";

export {
  DEFAULT_WALLET_NETWORK,
  normalizeWalletAddress,
  walletIdentityFields,
} from "@/lib/wallet-identity";

export interface UpsertData {
  address?: string;
  network?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PreferredCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface WalletSettings {
  preferredCurrency: PreferredCurrency;
}

export interface PushNotificationDetails {
  enabled: boolean;
  permissionStatus: string;
  platform: string;
  expoPushToken?: string | null;
  devicePushToken?: string | null;
  devicePushTokenType?: string | null;
}

const UPSERT_ATTEMPTS = 3;

let upsertInFlightAddress: string | null = null;
let upsertInFlight: Promise<void> | null = null;
let upsertCompletedAddress: string | null = null;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown) {
  if (!(error instanceof ApiError)) return true;
  return error.code === "NETWORK_ERROR" || error.status >= 500 || error.status === 0;
}

/**
 * Registers the wallet address with the API. Safe to call repeatedly: the
 * address is the wallet row key, and a completed address is skipped until the
 * app reloads.
 */
export async function upsertWallet(walletAddress: string, data?: UpsertData) {
  const { address, network } = walletIdentityFields(walletAddress, data);
  if (!address) {
    return;
  }
  if (upsertCompletedAddress === address) {
    return;
  }
  if (upsertInFlight && upsertInFlightAddress === address) {
    return upsertInFlight;
  }

  upsertInFlightAddress = address;
  upsertInFlight = (async () => {
    try {
      for (let attempt = 0; attempt < UPSERT_ATTEMPTS; attempt++) {
        try {
          await upsertWalletRequest(address, network);
          upsertCompletedAddress = address;
          return;
        } catch (error) {
          console.log("upsertWallet error:", error);
          if (!isRetryable(error) || attempt === UPSERT_ATTEMPTS - 1) {
            return;
          }
          await wait(300 * 2 ** attempt);
        }
      }
    } finally {
      if (upsertInFlightAddress === address) {
        upsertInFlightAddress = null;
        upsertInFlight = null;
      }
    }
  })();

  return upsertInFlight;
}

const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  preferredCurrency: "USD",
};

function settingsKey(address: string) {
  return `wallet-settings.${normalizeAddress(address)}`;
}

function pushDetailsKey(address: string) {
  return `push-details.${normalizeAddress(address)}`;
}

const SUPPORTED_PREFERRED_CURRENCIES: readonly PreferredCurrency[] =
  SUPPORTED_CURRENCIES;

function normalizePreferredCurrency(value: unknown): PreferredCurrency {
  return SUPPORTED_PREFERRED_CURRENCIES.includes(value as PreferredCurrency)
    ? (value as PreferredCurrency)
    : DEFAULT_WALLET_SETTINGS.preferredCurrency;
}

export async function getWalletSettings(
  walletAddress: string,
): Promise<WalletSettings> {
  if (!walletAddress) {
    return DEFAULT_WALLET_SETTINGS;
  }

  const stored = await readLocal<Partial<WalletSettings>>(
    settingsKey(walletAddress),
    {},
  );
  return {
    preferredCurrency: normalizePreferredCurrency(stored.preferredCurrency),
  };
}

export async function setWalletCurrencyPreference(
  walletAddress: string,
  preferredCurrency: PreferredCurrency,
) {
  if (!walletAddress) return;
  await writeLocal(settingsKey(walletAddress), {
    preferredCurrency,
    updatedAt: Date.now(),
  });
}

export async function hasPushNotificationDetails(walletAddress: string) {
  if (!walletAddress) return false;
  const stored = await readLocal<PushNotificationDetails | null>(
    pushDetailsKey(walletAddress),
    null,
  );
  return Boolean(stored?.enabled);
}

export async function getPushNotificationDetails(
  walletAddress: string,
): Promise<PushNotificationDetails | null> {
  if (!walletAddress) return null;
  return readLocal<PushNotificationDetails | null>(
    pushDetailsKey(walletAddress),
    null,
  );
}

export async function savePushNotificationDetails(
  walletAddress: string,
  details: PushNotificationDetails,
) {
  if (!walletAddress) return;
  await writeLocal(pushDetailsKey(walletAddress), {
    ...details,
    updatedAt: Date.now(),
  });
}

export async function deletePushNotificationDetails(walletAddress: string) {
  if (!walletAddress) return;
  await removeLocal(pushDetailsKey(walletAddress));
}

type QueuedPushNotification = ReturnType<typeof buildQueuedPushNotification> & {
  id: string;
};

function notificationQueueKey() {
  return "push-queue";
}

/**
 * Queues a push notification locally. Delivery needs a REST endpoint (or the
 * existing notifications worker), so the queue is device-local for now.
 * Returns the new queue id.
 */
export async function enqueuePushNotification(
  walletAddress: string,
  payload: PushNotificationPayload,
): Promise<string | null> {
  if (!walletAddress) return null;

  const queued: QueuedPushNotification = {
    id: `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...buildQueuedPushNotification(walletAddress, payload, Date.now()),
  };
  const existing = await readLocal<QueuedPushNotification[]>(
    notificationQueueKey(),
    [],
  );
  await writeLocal(notificationQueueKey(), [...existing, queued]);
  return queued.id;
}
