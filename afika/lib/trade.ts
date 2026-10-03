import { encodeFunctionData, erc20Abi, formatUnits } from "viem";
import {
  BASE_CHAIN_ID,
  DEFAULT_SLIPPAGE_BPS,
  STOCK_DECIMALS,
  USDC_ADDRESS,
} from "@/constants/stocks";
import { NATIVE_TOKEN_PLACEHOLDER, type TokenMetadata } from "@/constants/tokens";
import type { ZeroExQuote } from "@/lib/swap";
import { needsApproval, rawToUi, uiToRaw } from "./trade-math";

export { rawToUi, uiToRaw };

const API_BASE_URL = "https://api.0x.org";

export type TradeCall = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

export type IndicativePrice = {
  sellAmount: string;
  buyAmount: string;
  price: number;
};

function getApiKey() {
  const apiKey = process.env.EXPO_PUBLIC_0X_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_0X_API_KEY");
  }
  return apiKey;
}

function toZeroExToken(token: TokenMetadata) {
  return token.isNative ? NATIVE_TOKEN_PLACEHOLDER : token.address;
}

export function stockTokenMetadata(address: string, symbol: string, decimals = STOCK_DECIMALS): TokenMetadata {
  return {
    symbol,
    name: symbol,
    address: address as `0x${string}`,
    decimals,
    swapSupported: true,
  };
}

export function usdcTokenMetadata(): TokenMetadata {
  return {
    symbol: "USDC",
    name: "USD Coin",
    address: USDC_ADDRESS,
    decimals: 6,
    swapSupported: true,
  };
}

async function fetchZeroEx(
  path: string,
  params: Record<string, string>
): Promise<ZeroExQuote> {
  const search = new URLSearchParams(params);
  const response = await fetch(`${API_BASE_URL}${path}?${search.toString()}`, {
    method: "GET",
    headers: {
      "0x-api-key": getApiKey(),
      "0x-version": "v2",
    },
  });
  const data = (await response.json()) as ZeroExQuote & { reason?: string };
  if (!response.ok) {
    throw new Error(data.reason || "Failed to fetch 0x quote");
  }
  return data;
}

export async function fetchIndicativePrice(params: {
  sellToken: TokenMetadata;
  buyToken: TokenMetadata;
  sellAmount: string;
  taker: string;
}): Promise<IndicativePrice> {
  const quote = await fetchZeroEx("/swap/allowance-holder/price", {
    chainId: String(BASE_CHAIN_ID),
    sellToken: toZeroExToken(params.sellToken),
    buyToken: toZeroExToken(params.buyToken),
    sellAmount: params.sellAmount,
    taker: params.taker,
  });
  const sell = Number(formatUnits(BigInt(quote.sellAmount || params.sellAmount), params.sellToken.decimals));
  const buy = Number(formatUnits(BigInt(quote.buyAmount || "0"), params.buyToken.decimals));
  return {
    sellAmount: quote.sellAmount,
    buyAmount: quote.buyAmount,
    price: buy > 0 ? sell / buy : 0,
  };
}

export async function fetchFirmQuote(params: {
  sellToken: TokenMetadata;
  buyToken: TokenMetadata;
  sellAmount: string;
  taker: string;
  slippageBps?: number;
}): Promise<ZeroExQuote> {
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const data = await fetchZeroEx("/swap/allowance-holder/quote", {
    chainId: String(BASE_CHAIN_ID),
    sellToken: toZeroExToken(params.sellToken),
    buyToken: toZeroExToken(params.buyToken),
    sellAmount: params.sellAmount,
    taker: params.taker,
    slippageBps: String(slippageBps),
  });
  if (!data.transaction?.to || !data.transaction.data) {
    throw new Error("Quote did not include executable transaction data");
  }
  if (data.liquidityAvailable === false) {
    throw new Error("No liquidity available for this token pair right now");
  }
  return data;
}

export function buildTradeCalls(quote: ZeroExQuote, sellToken: TokenMetadata): TradeCall[] {
  const calls: TradeCall[] = [];
  if (!sellToken.isNative && sellToken.address) {
    const spender = (quote.issues?.allowance?.spender || quote.allowanceTarget) as `0x${string}` | undefined;
    const requiredAllowance = BigInt(quote.sellAmount);
    if (spender && needsApproval(quote.issues?.allowance?.actual || "0", quote.sellAmount)) {
      calls.push({
        to: sellToken.address as `0x${string}`,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, requiredAllowance],
        }),
        value: 0n,
      });
    }
  }
  if (!quote.transaction?.to || !quote.transaction.data) {
    throw new Error("Quote did not include executable transaction data");
  }
  calls.push({
    to: quote.transaction.to,
    data: quote.transaction.data,
    value: BigInt(quote.transaction.value || "0"),
  });
  return calls;
}
