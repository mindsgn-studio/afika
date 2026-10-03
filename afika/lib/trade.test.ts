import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { needsApproval, rawToUi, uiToRaw } from "./trade-math.ts";

describe("trade math", () => {
  it("uiToRaw and rawToUi invert at multiplier 1", () => {
    const raw = uiToRaw("1.5", 1, 8);
    assert.equal(rawToUi(raw, 1, 8), "1.5");
  });

  it("multiplier 2 means 1 token is 2 shares", () => {
    const raw = uiToRaw("2", 2, 8);
    assert.equal(raw, 100000000n);
    assert.equal(rawToUi(raw, 2, 8), "2");
  });

  it("needsApproval is exact-amount", () => {
    assert.equal(needsApproval("0", "1000000"), true);
    assert.equal(needsApproval("1000000", "1000000"), false);
    assert.equal(needsApproval("999999", "1000000"), true);
  });
});
