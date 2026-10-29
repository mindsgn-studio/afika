/**
 * REST client for the Afika API.
 *
 * The app no longer talks to Firestore. Balances and transactions are read from
 * the Cloudflare Worker documented in `backend/api/README.md`, and the wallet
 * address is registered with `PUT /v1/wallet`.
 *
 * Kept dependency-free (no React Native imports) so it can run in the Node test
 * runner.
 */

export const DEFAULT_API_BASE_URL = "https://afika-api.seni-tembe.workers.dev";
export const DEFAULT_WALLET_NETWORK = "base-mainnet";
export const MAX_PAGE_SIZE = 100;

export type ApiWallet = {
  address: string;
  network: string;
  testnet: boolean;
  createdAt: number;
  updatedAt: number;
};

export type ApiBalance = {
  walletAddress: string;
  walletId: string;
  network: string;
  tokenType: string;
  tokenSymbol: string;
  tokenAddress: string;
  amount: string;
  uiAmount: string;
  multiplier: string;
  usdAmount: string;
  zarAmount: string;
  eurAmount: string;
  fetchedAt: number;
};

export type ApiTransaction = {
  walletAddress: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  tokenAddress: string;
  tokenType: string;
  tokenSymbol: string;
  amount: string;
  feeNative: string;
  feeUsd: string;
  feeZar: string;
  feeEur: string;
  usdAmount: string;
  zarAmount: string;
  eurAmount: string;
  network: string;
  direction: "credit" | "debit";
  state: string;
  blockNumber: number;
  timestampMs: number;
  timestamp: number;
  fetchedAtMs: number;
  fetchedAt: number;
};

export type ApiPagination = {
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
};

export type ApiPage<T> = {
  data: T[];
  pagination: ApiPagination;
};

export type PageOptions = {
  limit?: number;
  cursor?: string;
};

export type ApiClientOptions = {
  baseUrl?: string;
  token?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

/** Error returned by the API or by a failed request. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(message: string, status: number, code = "REQUEST_FAILED", requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** Normalizes an address for the API, which keys wallets by lowercase address. */
export function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export function apiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return (configured || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export function apiToken() {
  return process.env.EXPO_PUBLIC_API_TOKEN?.trim() ?? "";
}

function resolveToken(options: ApiClientOptions) {
  const token = options.token ?? apiToken();
  if (!token) {
    throw new ApiError(
      "A valid API token is required. Set EXPO_PUBLIC_API_TOKEN in afika/.env.",
      401,
      "UNAUTHENTICATED",
    );
  }
  return token;
}

function requestUrl(
  baseUrl: string,
  path: string,
  options: Record<string, string | number | undefined | null> = {},
) {
  const query = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${baseUrl}${path}${query.length ? `?${query.join("&")}` : ""}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError(
        `The API returned a non-JSON response (${response.status}).`,
        response.status,
        "INVALID_RESPONSE",
      );
    }
  }

  if (!response.ok) {
    const details = (body ?? {}) as ApiErrorBody;
    throw new ApiError(
      details.error?.message || `The API request failed (${response.status}).`,
      response.status,
      details.error?.code || "REQUEST_FAILED",
      details.error?.requestId,
    );
  }

  return body as T;
}

async function request<T>(
  path: string,
  init: RequestInit,
  options: ApiClientOptions = {},
): Promise<T> {
  const baseUrl = (options.baseUrl ?? apiBaseUrl()).replace(/\/+$/, "");
  const token = resolveToken(options);
  const fetchImpl = options.fetch ?? fetch;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
      signal: options.signal ?? init.signal,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Could not reach the Afika API. Check your connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  return parseResponse<T>(response);
}

/**
 * Registers a wallet with the API. The address is lowercased and used as the
 * wallet row key, so calling this again updates the existing row.
 */
export async function upsertWallet(
  address: string,
  network = DEFAULT_WALLET_NETWORK,
  options?: ApiClientOptions,
) {
  const body = {
    address: normalizeAddress(address),
    network: network.trim() || DEFAULT_WALLET_NETWORK,
  };
  const result = await request<{ data: ApiWallet }>(
    "/v1/wallet",
    { method: "PUT", body: JSON.stringify(body) },
    options,
  );
  return result.data;
}

/** Reads one page of token balances for an address. */
export async function fetchBalances(
  address: string,
  page: PageOptions = {},
  options?: ApiClientOptions,
) {
  const path = requestUrl("", "/v1/balances", {
    address: normalizeAddress(address),
    limit: page.limit,
    cursor: page.cursor,
  });
  return request<ApiPage<ApiBalance>>(path, { method: "GET" }, options);
}

/** Reads one page of transactions for an address, newest first. */
export async function fetchTransactions(
  address: string,
  page: PageOptions = {},
  options?: ApiClientOptions,
) {
  const path = requestUrl("", "/v1/transactions", {
    address: normalizeAddress(address),
    limit: page.limit,
    cursor: page.cursor,
  });
  return request<ApiPage<ApiTransaction>>(path, { method: "GET" }, options);
}

/** Fetches every transaction page, up to `maxPages`. */
export async function fetchAllTransactions(
  address: string,
  options?: ApiClientOptions & { pageLimit?: number; maxPages?: number },
) {
  const pageLimit = Math.min(Math.max(options?.pageLimit ?? MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const maxPages = Math.max(options?.maxPages ?? 10, 1);
  const items: ApiTransaction[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const result = await fetchTransactions(address, { limit: pageLimit, cursor }, options);
    items.push(...result.data);
    cursor = result.pagination.nextCursor;
    if (!result.pagination.hasMore || !cursor) {
      break;
    }
  }

  return items;
}

/** Stable id for a transaction row, matching the old Firestore document ids. */
export function transactionId(tx: Pick<ApiTransaction, "txHash" | "direction">) {
  return `${tx.txHash.toLowerCase()}_${tx.direction}`;
}
