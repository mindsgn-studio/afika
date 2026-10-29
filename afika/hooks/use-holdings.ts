import { useMemo } from "react";
import { getAllowlistedStock, normalizeStockAddress } from "@/constants/stocks";
import { parseNumber } from "@/lib/money";
import type { WalletBalance } from "@/hooks/use-wallet-balances";

export type HoldingRecord = {
  stockAddress: string;
  qty: number;
  avgCost: number;
  costBasis: number;
  realizedPnl: number;
  symbol?: string;
};

/** Derives stock holdings from the API balance feed. */
export function deriveHoldings(balances: WalletBalance[]): HoldingRecord[] {
  return balances
    .filter((balance) => getAllowlistedStock(balance.tokenAddress))
    .map((balance) => {
      const allow = getAllowlistedStock(balance.tokenAddress);
      const qty = parseNumber(balance.uiAmount || balance.amount);
      const value = parseNumber(balance.usdAmount);
      return {
        stockAddress: normalizeStockAddress(balance.tokenAddress),
        qty,
        // Average cost and realised PnL need the orders/holdings worker. Until
        // there is a REST endpoint we only expose current quantity and value.
        avgCost: qty > 0 ? value / qty : 0,
        costBasis: value,
        realizedPnl: 0,
        symbol: balance.tokenSymbol || allow?.ticker,
      };
    })
    .filter((holding) => holding.qty > 0 || holding.costBasis > 0);
}

export function useHoldings(
  walletAddress?: string | null,
  balances: WalletBalance[] = [],
) {
  const holdings = useMemo(() => {
    if (!walletAddress) return [];
    return deriveHoldings(balances);
  }, [walletAddress, balances]);

  return { holdings, loading: false };
}
