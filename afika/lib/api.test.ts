import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ApiError,
  DEFAULT_API_BASE_URL,
  MAX_PAGE_SIZE,
  apiBaseUrl,
  apiToken,
  fetchAllTransactions,
  fetchBalances,
  fetchTransactions,
  normalizeAddress,
  transactionId,
  upsertWallet,
} from "./api.ts";

type RecordedCall = { url: string; init: RequestInit };

function fakeFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
) {
  const calls: RecordedCall[] = [];
  const impl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
  return { impl, calls };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ADDRESS = "0xABCDEF0000000000000000000000000000000001";
const LOWER = ADDRESS.toLowerCase();
const BASE = "https://api.example.test";

const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const originalToken = process.env.EXPO_PUBLIC_API_TOKEN;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  if (originalToken === undefined) delete process.env.EXPO_PUBLIC_API_TOKEN;
  else process.env.EXPO_PUBLIC_API_TOKEN = originalToken;
});

describe("api configuration", () => {
  it("normalizes addresses", () => {
    assert.equal(normalizeAddress("  0xABC  "), "0xabc");
  });

  it("defaults to the production worker and strips trailing slashes", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.equal(apiBaseUrl(), DEFAULT_API_BASE_URL);
    process.env.EXPO_PUBLIC_API_URL = "https://local.test///";
    assert.equal(apiBaseUrl(), "https://local.test");
  });

  it("reads the token from the environment", () => {
    process.env.EXPO_PUBLIC_API_TOKEN = "  secret  ";
    assert.equal(apiToken(), "secret");
    delete process.env.EXPO_PUBLIC_API_TOKEN;
    assert.equal(apiToken(), "");
  });
});

describe("upsertWallet", () => {
  it("PUTs a lowercased address with the bearer token", async () => {
    const { impl, calls } = fakeFetch(() =>
      json({
        data: {
          address: LOWER,
          network: "base-mainnet",
          testnet: false,
          createdAt: 1,
          updatedAt: 2,
        },
      }),
    );

    const wallet = await upsertWallet(ADDRESS, "base", {
      baseUrl: BASE,
      token: "test-token",
      fetch: impl,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${BASE}/v1/wallet`);
    assert.equal(calls[0].init.method, "PUT");
    assert.equal(
      (calls[0].init.headers as Record<string, string>).Authorization,
      "Bearer test-token",
    );
    assert.equal(
      (calls[0].init.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      address: LOWER,
      network: "base",
    });
    assert.equal(wallet.address, LOWER);
  });

  it("defaults the network when one is not provided", async () => {
    const { impl, calls } = fakeFetch(() =>
      json({ data: { address: LOWER, network: "base-mainnet" } }),
    );

    await upsertWallet(ADDRESS, "   ", {
      baseUrl: BASE,
      token: "t",
      fetch: impl,
    });

    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      address: LOWER,
      network: "base-mainnet",
    });
  });
});

describe("balance and transaction reads", () => {
  it("sends the address and paging options as query parameters", async () => {
    const { impl, calls } = fakeFetch(() =>
      json({ data: [], pagination: { limit: 25, hasMore: false } }),
    );

    const page = await fetchBalances(
      ADDRESS,
      { limit: 25, cursor: "abc" },
      { baseUrl: BASE, token: "t", fetch: impl },
    );

    assert.equal(
      calls[0].url,
      `${BASE}/v1/balances?address=${LOWER}&limit=25&cursor=abc`,
    );
    assert.deepEqual(page.data, []);
  });

  it("omits blank paging options", async () => {
    const { impl, calls } = fakeFetch(() =>
      json({ data: [], pagination: { limit: 50, hasMore: false } }),
    );

    await fetchTransactions(ADDRESS, { limit: undefined, cursor: "" }, {
      baseUrl: BASE,
      token: "t",
      fetch: impl,
    });

    assert.equal(calls[0].url, `${BASE}/v1/transactions?address=${LOWER}`);
  });

  it("follows cursors until hasMore is false", async () => {
    let request = 0;
    const { impl, calls } = fakeFetch(() => {
      request += 1;
      if (request === 1) {
        return json({
          data: [{ txHash: "0x1", direction: "credit" }],
          pagination: { limit: 100, hasMore: true, nextCursor: "next-1" },
        });
      }
      return json({
        data: [{ txHash: "0x2", direction: "debit" }],
        pagination: { limit: 100, hasMore: false },
      });
    });

    const items = await fetchAllTransactions(ADDRESS, {
      baseUrl: BASE,
      token: "t",
      fetch: impl,
      pageLimit: 500,
    });

    assert.equal(calls.length, 2);
    assert.match(calls[0].url, new RegExp(`limit=${MAX_PAGE_SIZE}`));
    assert.match(calls[1].url, /cursor=next-1/);
    assert.equal(items.length, 2);
  });

  it("stops at maxPages even when the API keeps paging", async () => {
    const { impl, calls } = fakeFetch(() =>
      json({
        data: [{ txHash: "0x1", direction: "credit" }],
        pagination: { limit: 100, hasMore: true, nextCursor: "more" },
      }),
    );

    const items = await fetchAllTransactions(ADDRESS, {
      baseUrl: BASE,
      token: "t",
      fetch: impl,
      maxPages: 3,
    });

    assert.equal(calls.length, 3);
    assert.equal(items.length, 3);
  });
});

describe("errors", () => {
  it("maps an API error envelope to ApiError", async () => {
    const { impl } = fakeFetch(() =>
      json(
        {
          error: {
            code: "UNAUTHENTICATED",
            message: "missing token",
            requestId: "req-1",
          },
        },
        401,
      ),
    );

    await assert.rejects(
      fetchBalances(ADDRESS, {}, { baseUrl: BASE, token: "", fetch: impl }),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 401);
        assert.equal(error.code, "UNAUTHENTICATED");
        assert.equal(error.message, "missing token");
        assert.equal(error.requestId, "req-1");
        return true;
      },
    );
  });

  it("rejects a non-JSON response", async () => {
    const { impl } = fakeFetch(
      () => new Response("bad gateway", { status: 502 }),
    );

    await assert.rejects(
      fetchTransactions(ADDRESS, {}, { baseUrl: BASE, token: "t", fetch: impl }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 502 &&
        error.code === "INVALID_RESPONSE",
    );
  });

  it("wraps network failures", async () => {
    const { impl } = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });

    await assert.rejects(
      fetchBalances(ADDRESS, {}, { baseUrl: BASE, token: "t", fetch: impl }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 0 &&
        error.code === "NETWORK_ERROR",
    );
  });
});

describe("transactionId", () => {
  it("combines the hash and direction", () => {
    assert.equal(
      transactionId({ txHash: "0xABC", direction: "debit" }),
      "0xabc_debit",
    );
  });
});
