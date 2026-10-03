export type StockAllowlistItem = {
  address: `0x${string}`;
  ticker: string;
  name: string;
  decimals: number;
};

export const STOCK_DECIMALS = 8;
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const BASE_CHAIN_ID = 8453;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const MAX_SLIPPAGE_BPS = 300;

export const STOCK_ALLOWLIST: StockAllowlistItem[] = [
  { address: "0xb20000000000000000000078ee7ce2fE4908108C", ticker: "NVDA", name: "NVIDIA", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000008bC8786B856E61707C", ticker: "META", name: "Meta", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000C2e324d24d7eEcd1fb", ticker: "AAPL", name: "Apple", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000002D0BA3164cc74f58B7", ticker: "GOOGL", name: "Alphabet", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000d9192b6B456483C2E8", ticker: "AMZN", name: "Amazon", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000Ab99cFa739E253872B", ticker: "MSFT", name: "Microsoft", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000004884b426556b92883d", ticker: "MSTR", name: "Strategy", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000397293Cb8cda9a10c5", ticker: "SNDK", name: "SanDisk", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000007b9fcbd005511aCBd5", ticker: "SPCX", name: "SpaceX", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000001e800a7f5189430cD0", ticker: "TSLA", name: "Tesla", decimals: STOCK_DECIMALS },
  { address: "0xB2000000000000000000000d8Ce462E99ee7A47B", ticker: "AMD", name: "Advanced Micro Devices, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000B1a29cF17A1819288a", ticker: "ASTS", name: "AST SpaceMobile, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000Fc737aeA6196aB5a4c", ticker: "AVGO", name: "Broadcom Inc.", decimals: STOCK_DECIMALS },
  { address: "0xb20000000000000000000016f9dfe862feBA122b", ticker: "BE", name: "Bloom Energy Corporation", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000f215E4C890CFb7176B", ticker: "CAKE", name: "Cheesecake Factory Inc", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000428E3a3eebBb20692B", ticker: "DJT", name: "Trump Media & Technology Group Corp.", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000A613D12dEAfBBb1Db7", ticker: "DUOL", name: "Duolingo, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000007790ed6E48e06eD935", ticker: "GME", name: "GameStop Corp.", decimals: STOCK_DECIMALS },
  { address: "0xB20000000000000000000043a599976181Bcf336", ticker: "HIMS", name: "Hims & Hers Health, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xb2000000000000000000002601C5C94F435da168", ticker: "HTZ", name: "Hertz Global Holdings, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000f1a0F91e34892E4718", ticker: "LLY", name: "Eli Lilly & Co", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000e215e9B76ecBA02468", ticker: "MRNA", name: "Moderna, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000eC3c4c7395Cc609813", ticker: "MRVL", name: "Marvell Technology, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xb20000000000000000000058B8c947e44011dFE6", ticker: "NFLX", name: "Netflix Inc", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000C597c476FCf9Aed3a8", ticker: "NVAX", name: "Novavax Inc", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000347AFbA223D7B6b63C", ticker: "ORCL", name: "Oracle Corporation", decimals: STOCK_DECIMALS },
  { address: "0xB20000000000000000000018FE7eC7d6DfeeB528", ticker: "PFE", name: "Pfizer Inc", decimals: STOCK_DECIMALS },
  { address: "0xB2000000000000000000008FC2A8C23cf5937b66", ticker: "PM", name: "Philip Morris International Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB2000000000000000000009272A491812842Aa84", ticker: "PTON", name: "Peloton Interactive, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000450ad3abE5d4846c6E", ticker: "PYPL", name: "PayPal Holdings, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xb200000000000000000000CA425ab42e07C35bC3", ticker: "QUBT", name: "Quantum Computing Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB2000000000000000000005bd7AE89b9E6189Bb5", ticker: "RBLX", name: "Roblox Corporation", decimals: STOCK_DECIMALS },
  { address: "0xb20000000000000000000066242d4067724cB7A1", ticker: "RDDT", name: "Reddit, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB2000000000000000000002137743D4a01Fe4e88", ticker: "SOUN", name: "SoundHound AI, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB200000000000000000000f720C26062Bc3067Da", ticker: "TTWO", name: "Take-Two Interactive Software, Inc.", decimals: STOCK_DECIMALS },
  { address: "0xB20000000000000000000044E3CD7a0E1028E57a", ticker: "WEN", name: "Wendy's Co", decimals: STOCK_DECIMALS },
];

const byAddress = new Map(
  STOCK_ALLOWLIST.map((item) => [item.address.toLowerCase(), item])
);

export function normalizeStockAddress(address?: string | null) {
  return (address ?? "").trim().toLowerCase();
}

export function getAllowlistedStock(address?: string | null) {
  return byAddress.get(normalizeStockAddress(address));
}

export function isAllowlistedStock(address?: string | null) {
  return byAddress.has(normalizeStockAddress(address));
}
