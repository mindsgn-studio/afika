import { collection, onSnapshot, query, where, orderBy, limit, doc, setDoc, updateDoc } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import { serverTimestamp } from "@react-native-firebase/firestore";

export type TransactionKind = "send" | "swap";
export type TransactionState = "pending" | "submitted" | "confirmed" | "failed";

export type AppTransactionRecord = {
  kind: TransactionKind;
  state: TransactionState;
  source: "app";
  walletAddress: string;
  network: string;
  direction: "credit" | "debit";
  tokenSymbol: string;
  tokenAddress: string;
  amount: string;
  usdAmount?: string;
  zarAmount?: string;
  fromAddress: string;
  toAddress: string;
  description?: string;
  txHash?: string;
  userOperationHash?: string;
  timestampMs: number;
  timestamp: number;
  fetchedAtMs: number;
  fetchedAt: number;
  buyTokenSymbol?: string;
  buyTokenAddress?: string;
  buyAmountExpected?: string;
  errorMessage?: string;
};

function walletTransactions(walletAddress: string) {
  const db = getFirestore();
  return collection(db, "wallets", walletAddress.toLowerCase(), "transactions");
}

export function buildPendingTransactionId(kind: TransactionKind) {
  return `pending_${kind}_${Date.now()}`;
}

export function buildConfirmedTransactionId(txHash: string, direction: "credit" | "debit") {
  return `${txHash.toLowerCase()}_${direction}`;
}

export async function createPendingTransaction(
  walletAddress: string,
  docId: string,
  payload: AppTransactionRecord
) {
  const record: Record<string, unknown> = {
    kind: payload.kind,
    state: "pending",
    source: "app",
    walletAddress: walletAddress.toLowerCase(),
    network: payload.network,
    direction: payload.direction,
    tokenSymbol: payload.tokenSymbol,
    tokenAddress: payload.tokenAddress,
    amount: payload.amount,
    fromAddress: payload.fromAddress,
    toAddress: payload.toAddress,
    timestampMs: payload.timestampMs,
    timestamp: payload.timestamp,
    updatedAt: serverTimestamp(),
  };
  if (payload.usdAmount) record.usdAmount = payload.usdAmount;
  if (payload.description) record.description = payload.description;
  if (payload.buyTokenSymbol) record.buyTokenSymbol = payload.buyTokenSymbol;
  if (payload.buyTokenAddress) record.buyTokenAddress = payload.buyTokenAddress;
  if (payload.buyAmountExpected) record.buyAmountExpected = payload.buyAmountExpected;
  await setDoc(doc(walletTransactions(walletAddress), docId), record);
  return docId;
}

export async function updateTransaction(
  walletAddress: string,
  docId: string,
  payload: Partial<AppTransactionRecord>
) {
  const next: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (payload.state) next.state = payload.state;
  if (payload.userOperationHash) next.userOperationHash = payload.userOperationHash;
  if (payload.errorMessage) next.errorMessage = payload.errorMessage;
  await walletTransactions(walletAddress).doc(docId).update(next);
}
