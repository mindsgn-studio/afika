import { useMemo } from "react";
import {
  STOCK_ALLOWLIST,
  normalizeStockAddress,
} from "@/constants/stocks";

export type StockRecord = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
  isin?: string;
  multiplier: number;
  pausedFeatures?: number[];
  paused: boolean;
  navPrice: number;
  navUpdatedAt?: string;
  navStale: boolean;
  price: number;
  changePct24h: number;
  open: number;
  dayLow: number;
  dayHigh: number;
  marketCap?: number;
  volume24h?: number;
  tradable: boolean;
  updatedAt?: number;
};

/**
 * The markets/stocks REST endpoint does not exist yet, so stocks are exposed
 * from the static allowlist with no live pricing. Trading stays disabled until
 * a market data endpoint is available.
 */
const STUB_STOCKS: StockRecord[] = STOCK_ALLOWLIST.map((stock) => ({
  address: stock.address.toLowerCase(),
  symbol: stock.ticker,
  name: stock.name,
  decimals: stock.decimals,
  iconUrl: stock.logoUrl || undefined,
  multiplier: 1,
  pausedFeatures: [],
  paused: false,
  navPrice: 0,
  navStale: true,
  price: 0,
  changePct24h: 0,
  open: 0,
  dayLow: 0,
  dayHigh: 0,
  tradable: false,
}));

const STUB_BY_ADDRESS = Object.fromEntries(
  STUB_STOCKS.map((stock) => [stock.address, stock]),
) as Record<string, StockRecord>;

export function useStocks() {
  return useMemo(
    () => ({ stocks: STUB_STOCKS, byAddress: STUB_BY_ADDRESS, loading: false }),
    [],
  );
}

export function useStock(address?: string | null) {
  const normalized = normalizeStockAddress(address);
  return {
    stock: normalized ? STUB_BY_ADDRESS[normalized] ?? null : null,
    loading: false,
  };
}
