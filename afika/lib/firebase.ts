import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
} from "@react-native-firebase/firestore";

import { walletIdentityFields } from "@/lib/wallet-identity";

export {
  DEFAULT_WALLET_NETWORK,
  normalizeWalletAddress,
  walletIdentityFields,
} from "@/lib/wallet-identity";

export interface UpsertData {
  address?: string;
  network?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type PreferredCurrency = "USD" | "ZAR";

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

const UPSERT_RETRYABLE = new Set([
  "firestore/unavailable",
  "firestore/deadline-exceeded",
]);
const UPSERT_ATTEMPTS = 3;

let upsertInFlightAddress: string | null = null;
let upsertInFlight: Promise<void> | null = null;
let upsertCompletedAddress: string | null = null;

function firestoreErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code);
  }
  return "";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createWalletIdentity(address: string, network: string) {
  try {
    await setDoc(doc(getFirestore("afika-db"), "wallets", address), {
      address,
      network,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (firestoreErrorCode(error) === "firestore/already-exists") {
      return;
    }
    throw error;
  }
}

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
          await createWalletIdentity(address, network);
          upsertCompletedAddress = address;
          return;

        } catch (error) {
          console.log(error);
          const retryable = UPSERT_RETRYABLE.has(firestoreErrorCode(error));
          if (!retryable || attempt === UPSERT_ATTEMPTS - 1) {
            console.log("upsertWallet error:", error);
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

export async function getWallet(address: string) {
  try {
    const db = getFirestore();
    const balancesRef = collection(
      db,
      "wallets",
      address.toLocaleLowerCase(),
      "balances",
    );
    const data = await getDocs(balancesRef);
    return data;
  } catch (error) {
    console.log("upsertWallet error:", error);
    return null;
  } finally {
  }
}

export async function getTransaction(address: string) {
  try {
    const db = getFirestore();
    const txRef = collection(
      db,
      "wallets",
      address.toLocaleLowerCase(),
      "transactions",
    );
    const q = query(txRef, where("tokenSymbol", "==", "USDC"));
    const data = await getDocs(q);
    return data;
  } catch (error) {
    console.log("upsertWallet error:", error);
    return null;
  } finally {
  }
}

const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  preferredCurrency: "USD",
};

function walletDetailsDoc(address: string, detailId: string) {
  const db = getFirestore();
  return doc(db, "wallets", address.toLowerCase(), "details", detailId);
}

export async function getWalletSettings(
  walletAddress: string,
): Promise<WalletSettings> {
  if (!walletAddress) {
    return DEFAULT_WALLET_SETTINGS;
  }

  try {
    const settingsDoc = await getDoc(
      walletDetailsDoc(walletAddress, "preferences"),
    );

    if (!settingsDoc.exists()) {
      return DEFAULT_WALLET_SETTINGS;
    }

    const data = settingsDoc.data() as Partial<WalletSettings> | undefined;

    return {
      preferredCurrency:
        data?.preferredCurrency === "ZAR"
          ? "ZAR"
          : DEFAULT_WALLET_SETTINGS.preferredCurrency,
    };
  } catch (error) {
    console.log("getWalletSettings error:", error);
    return DEFAULT_WALLET_SETTINGS;
  }
}

export async function setWalletCurrencyPreference(
  walletAddress: string,
  preferredCurrency: PreferredCurrency,
) {
  if (!walletAddress) return;

  try {
    await setDoc(
      walletDetailsDoc(walletAddress, "preferences"),
      {
        preferredCurrency,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.log("setWalletCurrencyPreference error:", error);
    throw error;
  }
}

export async function hasPushNotificationDetails(walletAddress: string) {
  if (!walletAddress) return false;

  try {
    const pushDoc = await getDoc(
      walletDetailsDoc(walletAddress, "push-notifications"),
    );
    return pushDoc.exists();
  } catch (error) {
    console.log("hasPushNotificationDetails error:", error);
    return false;
  }
}

export async function savePushNotificationDetails(
  walletAddress: string,
  details: PushNotificationDetails,
) {
  if (!walletAddress) return;

  try {
    await setDoc(
      walletDetailsDoc(walletAddress, "push-notifications"),
      {
        ...details,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.log("savePushNotificationDetails error:", error);
    throw error;
  }
}

export async function deletePushNotificationDetails(walletAddress: string) {
  if (!walletAddress) return;

  try {
    await deleteDoc(walletDetailsDoc(walletAddress, "push-notifications"));
  } catch (error) {
    console.log("deletePushNotificationDetails error:", error);
    throw error;
  }
}
