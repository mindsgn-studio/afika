import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  ApiError,
  fetchAllTransactions,
  fetchBalances,
  fetchTransactions,
  upsertWallet,
} from "./api.ts";

const TOKEN = "e2e-token";
const ADDRESS = "0xAbCdEf0000000000000000000000000000000001";
const LOWER = ADDRESS.toLowerCase();

type WalletRow = {
  address: string;
  network: string;
  testnet: boolean;
  createdAt: number;
  updatedAt: number;
};

const wallets = new Map<string, WalletRow>();
const balances = new Map<string, unknown[]>();
const transactions = new Map<string, unknown[]>();

let baseUrl = "";

function send(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function error(res: ServerResponse, status: number, code: string, message: string) {
  send(res, status, { error: { code, message, requestId: "e2e-request" } });
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function listResponse(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  store: Map<string, unknown[]>,
) {
  if (req.method !== "GET") {
    return error(res, 405, "METHOD_NOT_ALLOWED", "GET only");
  }

  const address = url.searchParams.get("address");
  if (!address) {
    return error(res, 400, "VALIDATION_ERROR", "address is required");
  }

  const all = store.get(address.toLowerCase()) ?? [];
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("cursor") ?? 0);
  const data = all.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const nextCursor = nextOffset < all.length ? String(nextOffset) : undefined;

  return send(res, 200, {
    data,
    pagination: {
      limit,
      hasMore: Boolean(nextCursor),
      ...(nextCursor ? { nextCursor } : {}),
    },
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");

  if (url.pathname === "/v1/health") {
    return send(res, 200, { status: "ok" });
  }

  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    return error(res, 401, "UNAUTHENTICATED", "invalid API token");
  }

  if (url.pathname === "/v1/wallet" && req.method === "PUT") {
    let body: { address?: unknown; network?: unknown };
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return error(res, 400, "INVALID_JSON", "body must be JSON");
    }

    const address = typeof body.address === "string" ? body.address : "";
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return error(res, 400, "VALIDATION_ERROR", "invalid address");
    }

    const key = address.toLowerCase();
    const existing = wallets.get(key);
    const now = Date.now();
    const row: WalletRow = {
      address: key,
      network: typeof body.network === "string" ? body.network : "base-mainnet",
      testnet: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    wallets.set(key, row);
    return send(res, existing ? 200 : 201, { data: row });
  }

  if (url.pathname === "/v1/balances") {
    return listResponse(req, res, url, balances);
  }

  if (url.pathname === "/v1/transactions") {
    return listResponse(req, res, url, transactions);
  }

  return error(res, 404, "NOT_FOUND", "unknown route");
});

before(async () => {
  balances.set(LOWER, [
    { tokenSymbol: "USDC", tokenAddress: "0xusdc", amount: "10", usdAmount: "10" },
    { tokenSymbol: "EURC", tokenAddress: "0xeurc", amount: "4", usdAmount: "4" },
  ]);
  transactions.set(LOWER, [
    { txHash: "0x3", direction: "credit", timestampMs: 3 },
    { txHash: "0x2", direction: "debit", timestampMs: 2 },
    { txHash: "0x1", direction: "credit", timestampMs: 1 },
  ]);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const options = () => ({ baseUrl, token: TOKEN });

describe("afika API end-to-end", () => {
  it("health is public", async () => {
    const response = await fetch(`${baseUrl}/v1/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });

  it("registers a wallet and updates it in place", async () => {
    const created = await upsertWallet(ADDRESS, "base", options());
    assert.equal(created.address, LOWER);
    assert.equal(created.network, "base");
    assert.equal(wallets.size, 1);

    const createdAt = created.createdAt;
    await new Promise((resolve) => setTimeout(resolve, 2));
    const updated = await upsertWallet(ADDRESS, "base-mainnet", options());

    assert.equal(wallets.size, 1);
    assert.equal(updated.address, LOWER);
    assert.equal(updated.network, "base-mainnet");
    assert.equal(updated.createdAt, createdAt);
    assert.ok(updated.updatedAt >= createdAt);
  });

  it("rejects an invalid wallet address", async () => {
    await assert.rejects(
      upsertWallet("not-an-address", "base", options()),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.code === "VALIDATION_ERROR",
    );
  });

  it("fetches balances by lowercased address", async () => {
    const page = await fetchBalances(ADDRESS, {}, options());
    assert.equal(page.data.length, 2);
    assert.equal(page.data[0].tokenSymbol, "USDC");
    assert.equal(page.pagination.hasMore, false);
  });

  it("fetches one page of transactions", async () => {
    const page = await fetchTransactions(ADDRESS, { limit: 2 }, options());
    assert.equal(page.data.length, 2);
    assert.equal(page.data[0].txHash, "0x3");
    assert.equal(page.pagination.hasMore, true);
    assert.equal(page.pagination.nextCursor, "2");
  });

  it("walks every transaction page", async () => {
    const items = await fetchAllTransactions(ADDRESS, {
      ...options(),
      pageLimit: 2,
    });
    assert.deepEqual(
      items.map((tx) => tx.txHash),
      ["0x3", "0x2", "0x1"],
    );
  });

  it("requires a valid API token", async () => {
    await assert.rejects(
      fetchBalances(ADDRESS, {}, { baseUrl, token: "wrong" }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 401 &&
        error.code === "UNAUTHENTICATED",
    );
  });

  it("sends the token from EXPO_PUBLIC_API_TOKEN", async () => {
    const previous = process.env.EXPO_PUBLIC_API_TOKEN;
    process.env.EXPO_PUBLIC_API_TOKEN = TOKEN;
    try {
      const page = await fetchBalances(ADDRESS, {}, { baseUrl });
      assert.equal(page.data[0].tokenSymbol, "USDC");
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_API_TOKEN;
      else process.env.EXPO_PUBLIC_API_TOKEN = previous;
    }
  });

  it("refuses to call list endpoints when the env token is missing", async () => {
    const previous = process.env.EXPO_PUBLIC_API_TOKEN;
    delete process.env.EXPO_PUBLIC_API_TOKEN;
    try {
      await assert.rejects(
        fetchTransactions(ADDRESS, {}, { baseUrl }),
        (error: unknown) =>
          error instanceof ApiError &&
          error.status === 401 &&
          error.code === "UNAUTHENTICATED" &&
          /EXPO_PUBLIC_API_TOKEN/.test(error.message),
      );
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_API_TOKEN;
      else process.env.EXPO_PUBLIC_API_TOKEN = previous;
    }
  });

  it("requires an address on list endpoints", async () => {
    const response = await fetch(`${baseUrl}/v1/balances`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, "VALIDATION_ERROR");
  });

  it("maps unknown routes to NOT_FOUND", async () => {
    const response = await fetch(`${baseUrl}/v1/nope`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.error.code, "NOT_FOUND");
  });
});
