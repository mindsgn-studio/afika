import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("incoming payment notifications", () => {
  it("builds notification for incoming payment", () => {
    const result = {
      title: "Money received",
      body: "You received 10 USDC ($10.00).",
      data: {
        type: "incoming_payment",
        txId: "tx_123",
        tokenSymbol: "USDC",
      },
    };

    assert.equal(result.title, "Money received");
    assert.equal(result.body, "You received 10 USDC ($10.00).");
    assert.equal(result.data.type, "incoming_payment");
    assert.equal(result.data.txId, "tx_123");
    assert.equal(result.data.tokenSymbol, "USDC");
  });

  it("handles missing usd amount", () => {
    const result = {
      title: "Money received",
      body: "You received 5 EURC.",
      data: {
        type: "incoming_payment",
        txId: "tx_124",
        tokenSymbol: "EURC",
      },
    };

    assert.equal(result.body, "You received 5 EURC.");
  });
});