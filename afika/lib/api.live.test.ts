import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ApiError,
  DEFAULT_API_BASE_URL,
  fetchBalances,
  fetchTransactions,
  upsertWallet,
} from "./api.ts";

const live = process.env.AFIKA_LIVE_API === "1";
const token = process.env.EXPO_PUBLIC_API_TOKEN?.trim() ?? "";
const baseUrl = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");
const address = "0x1111111111111111111111111111111111111111";

describe("afika production API", { skip: !live }, () => {
  it("rejects requests without a bearer token", async () => {
    const response = await fetch(
      `${baseUrl}/v1/balances?address=${address}&limit=1`,
    );
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  it("upserts a wallet and reads balances and transactions", async () => {
    assert.ok(token, "EXPO_PUBLIC_API_TOKEN is required for live API tests");

    const wallet = await upsertWallet(address, "base", { baseUrl, token });
    assert.equal(wallet.address, address);
    assert.equal(wallet.network, "base-mainnet");

    const balances = await fetchBalances(
      address,
      { limit: 5 },
      { baseUrl, token },
    );
    assert.ok(Array.isArray(balances.data));
    assert.equal(typeof balances.pagination.limit, "number");

    const transactions = await fetchTransactions(
      address,
      { limit: 5 },
      { baseUrl, token },
    );
    assert.ok(Array.isArray(transactions.data));
    assert.equal(typeof transactions.pagination.hasMore, "boolean");
  });

  it("maps an invalid token to UNAUTHENTICATED", async () => {
    await assert.rejects(
      fetchBalances(address, { limit: 1 }, { baseUrl, token: "not-the-token" }),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 401 &&
        error.code === "UNAUTHENTICATED",
    );
  });
});
