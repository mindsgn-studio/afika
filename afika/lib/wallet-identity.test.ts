import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_WALLET_NETWORK,
  normalizeWalletAddress,
  walletIdentityFields,
} from "./wallet-identity.ts";

describe("wallet identity", () => {
  it("lowercases the address and keeps only identity fields", () => {
    const fields = walletIdentityFields("0xABCDef0000000000000000000000000000000001", {
      address: "0xABCDef0000000000000000000000000000000001",
      network: "base-mainnet",
    });
    assert.deepEqual(fields, {
      address: "0xabcdef0000000000000000000000000000000001",
      network: "base-mainnet",
    });
    assert.deepEqual(Object.keys(fields).sort(), ["address", "network"]);
  });

  it("defaults network and ignores a missing address override", () => {
    assert.equal(normalizeWalletAddress("  0xAb  "), "0xab");
    const fields = walletIdentityFields("0xAbC0000000000000000000000000000000000002");
    assert.equal(fields.address, "0xabc0000000000000000000000000000000000002");
    assert.equal(fields.network, DEFAULT_WALLET_NETWORK);
  });
});
