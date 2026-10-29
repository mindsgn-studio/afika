import { useMemo } from "react";
import { getAllowlistedStock } from "@/constants/stocks";
import { parseNumber } from "@/lib/money";
import type { WalletBalance } from "@/hooks/use-wallet-balances";

export type PortfolioSummary = {
  totalValue: number;
  netWorth: number;
  dayPnl: number;
  allTimePnl: number;
  usdc: number;
  eurc: number;
  zarp: number;
  stocks: number;
  other: number;
  dayPct: number;
  weekPct: number;
  monthPct: number;
  yearPct: number;
  dayAbs: number;
  weekAbs: number;
  monthAbs: number;
  yearAbs: number;
};

export const EMPTY_SUMMARY: PortfolioSummary = {
  totalValue: 0,
  netWorth: 0,
  dayPnl: 0,
  allTimePnl: 0,
  usdc: 0,
  eurc: 0,
  zarp: 0,
  stocks: 0,
  other: 0,
  dayPct: 0,
  weekPct: 0,
  monthPct: 0,
  yearPct: 0,
  dayAbs: 0,
  weekAbs: 0,
  monthAbs: 0,
  yearAbs: 0,
};

function usdValue(balance: WalletBalance) {
  return parseNumber(balance.usdAmount || balance.amount);
}

/**
 * Builds the portfolio summary from the API balance feed.
 *
 * Performance (PnL) has no REST endpoint yet, so the percentage/absolute change
 * fields are zero. The value breakdown and net worth are accurate.
 */
export function summarizePortfolio(balances: WalletBalance[]): PortfolioSummary {
  if (!balances.length) {
    return EMPTY_SUMMARY;
  }

  let totalValue = 0;
  let usdc = 0;
  let eurc = 0;
  let zarp = 0;
  let stocks = 0;

  for (const balance of balances) {
    const value = usdValue(balance);
    totalValue += value;

    const symbol = (balance.tokenSymbol || "").toUpperCase();
    if (symbol === "USDC") {
      usdc += value;
    } else if (symbol === "EURC") {
      eurc += value;
    } else if (symbol === "ZARP") {
      zarp += value;
    } else if (getAllowlistedStock(balance.tokenAddress)) {
      stocks += value;
    }
  }

  const other = Math.max(totalValue - (usdc + eurc + zarp + stocks), 0);

  return {
    ...EMPTY_SUMMARY,
    totalValue,
    netWorth: totalValue,
    usdc,
    eurc,
    zarp,
    stocks,
    other,
  };
}

/**
 * Net worth and asset breakdown derived from the API balances. PnL is zero
 * until the API exposes performance history.
 */
export function usePortfolio(
  walletAddress?: string | null,
  balances: WalletBalance[] = [],
) {
  const summary = useMemo(() => {
    if (!walletAddress) return EMPTY_SUMMARY;
    return summarizePortfolio(balances);
  }, [walletAddress, balances]);

  return { summary, loading: false };
}
