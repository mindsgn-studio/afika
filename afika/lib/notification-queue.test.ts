import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildQueuedPushNotification,
  isDeliverablePushNotification,
} from "./notification-queue.ts";

const WALLET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("buildQueuedPushNotification", () => {
  it("lowercases the wallet address and defaults to a pending, un-attempted doc", () => {
    const doc = buildQueuedPushNotification(
      WALLET,
      { title: "Money received", body: "You received 10 USDC." },
      1730000000000,
    );

    assert.equal(doc.walletAddress, WALLET.toLowerCase());
    assert.equal(doc.title, "Money received");
    assert.equal(doc.body, "You received 10 USDC.");
    assert.deepEqual(doc.data, {});
    assert.equal(doc.status, "pending");
    assert.equal(doc.attempts, 0);
    assert.equal(doc.createdAtMs, 1730000000000);
    assert.equal(doc.createdAt, 1730000000000);
  });

  it("trims surrounding whitespace from the wallet address", () => {
    const doc = buildQueuedPushNotification(
      `  ${WALLET}  `,
      { title: "Hi", body: "There" },
      1,
    );
    assert.equal(doc.walletAddress, WALLET.toLowerCase());
  });

  it("copies the notification data payload", () => {
    const data = { type: "incoming_payment", txId: "0xdef_credit" };
    const doc = buildQueuedPushNotification(
      WALLET,
      { title: "Money received", body: "You received 1 USDC.", data },
      1,
    );

    assert.deepEqual(doc.data, data);
    // The builder must not keep a reference to the caller's object.
    data.txId = "mutated";
    assert.equal(doc.data.txId, "0xdef_credit");
  });
});

describe("isDeliverablePushNotification", () => {
  it("accepts a title or a body", () => {
    assert.equal(isDeliverablePushNotification({ title: "Hi", body: "" }), true);
    assert.equal(isDeliverablePushNotification({ title: "", body: "There" }), true);
    assert.equal(isDeliverablePushNotification({ title: "", body: "   " }), false);
  });
});
