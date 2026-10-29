/**
 * Device-local stock orders.
 *
 * Orders used to live in `wallets/{addr}/orders` so the orders worker could
 * confirm them. There is no REST write endpoint yet, so the app only keeps the
 * pending/submitted/failed record locally for the trade flow.
 */
import { readLocal, writeLocal } from "@/lib/local-store";
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
  createdAt: number;
  updatedAt: number;
};

function ordersKey(walletAddress: string) {
  return `orders.${walletAddress.trim().toLowerCase()}`;
}

async function readOrders(walletAddress: string): Promise<StockOrder[]> {
  const stored = await readLocal<StockOrder[]>(ordersKey(walletAddress), []);
  return Array.isArray(stored) ? stored : [];
}

async function updateOrder(
  walletAddress: string,
  orderId: string,
  patch: Partial<StockOrder>,
) {
  const orders = await readOrders(walletAddress);
  const next = orders.map((order) =>
    order.id === orderId
      ? { ...order, ...patch, updatedAt: Date.now() }
      : order,
  );
  await writeLocal(ordersKey(walletAddress), next);
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
  },
) {
  const now = Date.now();
  const order: StockOrder = {
    id: `order_${now}_${Math.random().toString(36).slice(2, 8)}`,
    side: payload.side,
    stockAddress: payload.stockAddress.toLowerCase(),
    symbol: payload.symbol,
    sellAmount: payload.sellAmount,
    buyAmountExpected: payload.buyAmountExpected ?? "",
    slippageBps: payload.slippageBps ?? DEFAULT_SLIPPAGE_BPS,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const orders = await readOrders(walletAddress);
  await writeLocal(ordersKey(walletAddress), [...orders, order]);
  return order.id;
}

export async function submitOrder(
  walletAddress: string,
  orderId: string,
  userOperationHash: string,
) {
  await updateOrder(walletAddress, orderId, {
    status: "submitted",
    userOperationHash,
  });
}

export async function failOrder(
  walletAddress: string,
  orderId: string,
  errorMessage: string,
) {
  await updateOrder(walletAddress, orderId, {
    status: "failed",
    errorMessage,
  });
}

/** Returns the device-local orders for a wallet, newest first. */
export async function getOrders(walletAddress: string) {
  const orders = await readOrders(walletAddress);
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}
