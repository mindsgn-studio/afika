import { collection, onSnapshot, query, where, orderBy, limit, doc, setDoc, updateDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";
import { DEFAULT_SLIPPAGE_BPS } from "@/constants/stocks";

export type OrderSide = "buy" | "sell";
export type OrderStatus = "pending" | "submitted" | "failed" | "confirmed";

export type StockOrder = {
  id: string;
  side: OrderSide;
  stockAddress: string;
  symbol: string;
  sellAmount: string;
  buyAmountExpected?: string;
  slippageBps: number;
  status: OrderStatus;
  userOperationHash?: string;
  txHash?: string;
  filledUsdc?: string;
  filledShares?: string;
  avgPrice?: string;
  errorMessage?: string;
};

function ordersCol(walletAddress: string) {
  const db = getFirestore();
  return collection(db, "wallets", walletAddress.toLowerCase(), "orders");
}

export async function createPendingOrder(
  walletAddress: string,
  payload: {
    side: OrderSide;
    stockAddress: string;
    symbol: string;
    sellAmount: string;
    buyAmountExpected?: string;
    slippageBps?: number;
  }
) {
  const col = ordersCol(walletAddress);
  const ref = doc(col);
  await setDoc(ref, {
    side: payload.side,
    stockAddress: payload.stockAddress.toLowerCase(),
    symbol: payload.symbol,
    sellAmount: payload.sellAmount,
    buyAmountExpected: payload.buyAmountExpected ?? "",
    slippageBps: payload.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function submitOrder(
  walletAddress: string,
  orderId: string,
  userOperationHash: string
) {
  await updateDoc(doc(ordersCol(walletAddress), orderId), {
    status: "submitted",
    userOperationHash,
    updatedAt: serverTimestamp(),
  });
}

export async function failOrder(
  walletAddress: string,
  orderId: string,
  errorMessage: string
) {
  await updateDoc(doc(ordersCol(walletAddress), orderId), {
    status: "failed",
    errorMessage,
    updatedAt: serverTimestamp(),
  });
}
