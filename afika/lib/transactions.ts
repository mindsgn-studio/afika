/**
 * Local pending/confirmed transaction records.
 *
 * The API is read-only for transaction history, so the app keeps its own
 * pending send/swap records on the device until a REST write endpoint exists.
 * `useTransactions` merges these records with the API feed.
 */
import { readLocal, writeLocal } from "@/lib/local-store";

export type TransactionKind = "send" | "receive" | "swap";
export type TransactionState = "pending" | "submitted" | "confirmed" | "failed";

export type AppTransactionRecord = {
  kind: TransactionKind;
  state: TransactionState;
  source: "app" | "chain";
  walletAddress: string;
  network: string;
  direction: "credit" | "debit";
  tokenSymbol: string;
  tokenAddress: string;
  amount: string;
  usdAmount?: string;
  zarAmount?: string;
  eurAmount?: string;
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
  updatedAt?: number;
};

/** A local record plus the id it was stored under. */
export type LocalTransactionRecord = AppTransactionRecord & { id: string };

type StoredTransaction = {
  id: string;
  record: AppTransactionRecord;
};

const records = new Map<string, AppTransactionRecord>();
const listeners = new Set<() => void>();
const hydrated = new Set<string>();
const writes = new Map<string, Promise<void>>();

function normalizeWallet(walletAddress: string) {
  return walletAddress.trim().toLowerCase();
}

function storageKey(walletAddress: string) {
  return `local-transactions.${normalizeWallet(walletAddress)}`;
}

function recordKey(walletAddress: string, id: string) {
  return `${normalizeWallet(walletAddress)}|${id}`;
}

function entryPrefix(walletAddress: string) {
  return `${normalizeWallet(walletAddress)}|`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function schedulePersist(walletAddress: string) {
  const address = normalizeWallet(walletAddress);
  const prefix = entryPrefix(address);
  const next: StoredTransaction[] = [...records.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, record]) => ({ id: key.slice(prefix.length), record }));

  const previous = writes.get(address) ?? Promise.resolve();
  const write = previous
    .catch(() => undefined)
    .then(() => writeLocal(storageKey(address), next));
  writes.set(address, write);
  return write;
}

export function subscribeLocalTransactions(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Returns every in-memory record for a wallet, with its local id. */
export function getLocalTransactions(walletAddress: string): LocalTransactionRecord[] {
  const address = normalizeWallet(walletAddress);
  const prefix = entryPrefix(address);
  return [...records.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, record]) => ({ id: key.slice(prefix.length), ...record }));
}

/** Loads persisted local records once per wallet address. */
export async function hydrateLocalTransactions(walletAddress: string) {
  const address = normalizeWallet(walletAddress);
  if (!address || hydrated.has(address)) return;
  hydrated.add(address);

  const stored = await readLocal<unknown>(storageKey(address), []);
  if (!Array.isArray(stored)) return;

  let changed = false;
  for (const entry of stored) {
    if (!entry || typeof entry !== "object") continue;

    const candidate = entry as Partial<StoredTransaction> & AppTransactionRecord;
    const record = (candidate.record ?? candidate) as AppTransactionRecord | undefined;
    if (!record?.walletAddress) continue;

    const id =
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : `${record.timestampMs}_${record.tokenSymbol}_${record.direction}`;
    const key = recordKey(address, id);
    if (!records.has(key)) {
      records.set(key, { ...record, walletAddress: address });
      changed = true;
    }
  }
  if (changed) notify();
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
  payload: AppTransactionRecord,
) {
  const address = normalizeWallet(walletAddress);
  records.set(recordKey(address, docId), {
    ...payload,
    walletAddress: address,
    state: payload.state ?? "pending",
    updatedAt: Date.now(),
  } as AppTransactionRecord);
  notify();
  await schedulePersist(address);
  return docId;
}

export async function updateTransaction(
  walletAddress: string,
  docId: string,
  payload: Partial<AppTransactionRecord>,
) {
  const address = normalizeWallet(walletAddress);
  const key = recordKey(address, docId);
  const existing = records.get(key);
  if (!existing) {
    return;
  }

  records.set(key, {
    ...existing,
    ...payload,
    walletAddress: address,
    updatedAt: Date.now(),
  } as AppTransactionRecord);
  notify();
  await schedulePersist(address);
}
