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
} from "@react-native-firebase/firestore";

export interface UpsertData {
  address?: string;
  network?: string;
  createdAt?: any;
  updatedAt?: any;
  PhoneNumber?: string | null;
  IsVerified?: boolean;
  UserLevel?: number;
  PhoneLinkedAt?: any | null;
}

export async function upsertWallet(walletAddress: string, data: UpsertData) {
  if (!walletAddress) return;

  try {
    const db = getFirestore();
    const docRef = doc(db, "wallets", walletAddress.toLowerCase());
    const document = await getDoc(docRef);
    if (document.exists()) return;

    await setDoc(
      docRef,
      {
        ...data,
        address: data.address ?? walletAddress,
        updatedAt: serverTimestamp(),
        createdAt: data.createdAt ?? serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.log("upsertWallet error:", error);
  }
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
