import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareDecimal,
  decimalPlaces,
  isValidEvmAddress,
  normalizeAmountInput,
  normalizeRecipient,
  validateRecipient,
  validateSendAmount,
} from "./send.ts";

const WALLET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const OTHER = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

describe("normalizeRecipient / normalizeAmountInput", () => {
  it("trims and lowercases recipients", () => {
    assert.equal(normalizeRecipient(`  ${WALLET}  `), WALLET.toLowerCase());
  });

  it("normalizes commas and whitespace in amounts", () => {
    assert.equal(normalizeAmountInput(" 1,5 "), "1.5");
  });
});

describe("isValidEvmAddress", () => {
  const cases: Array<[string, boolean]> = [
    [WALLET, true],
    [WALLET.toUpperCase().replace("0X", "0x"), true],
    [`  ${WALLET}  `, true],
    ["", false],
    ["   ", false],
    ["vitalik.eth", false],
    ["0x123", false],
    ["833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", false],
    ["0xZZ3589fCD6eDb6E08f4c7C32D4f71b54bdA02913", false],
  ];

  for (const [value, expected] of cases) {
    it(`${JSON.stringify(value)} → ${expected}`, () => {
      assert.equal(isValidEvmAddress(value), expected);
    });
  }
});

describe("validateRecipient", () => {
  it("rejects empty, whitespace, malformed and ENS names", () => {
    assert.ok(validateRecipient(""));
    assert.ok(validateRecipient("   "));
    assert.ok(validateRecipient("vitalik.eth"));
    assert.ok(validateRecipient("0x123"));
  });

  it("rejects the sender's own wallet, case-insensitively", () => {
    assert.ok(validateRecipient(WALLET, WALLET.toLowerCase()));
    assert.ok(validateRecipient(`  ${WALLET.toUpperCase().replace("0X", "0x")} `, WALLET));
  });

  it("accepts a valid distinct address", () => {
    assert.equal(validateRecipient(OTHER, WALLET), null);
    assert.equal(validateRecipient(` ${OTHER} `, undefined), null);
  });
});

describe("decimalPlaces", () => {
  it("counts fractional digits", () => {
    assert.equal(decimalPlaces("1"), 0);
    assert.equal(decimalPlaces("1.00"), 2);
    assert.equal(decimalPlaces("0.000001"), 6);
    assert.equal(decimalPlaces("1,"), 0);
  });
});

describe("compareDecimal", () => {
  it("orders decimal strings numerically", () => {
    assert.equal(compareDecimal("1", "1.00"), 0);
    assert.equal(compareDecimal("1.5", "1.50"), 0);
    assert.equal(compareDecimal("2", "10"), -1);
    assert.equal(compareDecimal("10", "2"), 1);
    assert.equal(compareDecimal("0.1", "0.09"), 1);
  });
});

describe("validateSendAmount", () => {
  const balance = "100";

  it("rejects empty, non-numeric, zero and negative values", () => {
    assert.ok(validateSendAmount("", balance, 6));
    assert.ok(validateSendAmount("   ", balance, 6));
    assert.ok(validateSendAmount("abc", balance, 6));
    assert.ok(validateSendAmount("-1", balance, 6));
    assert.ok(validateSendAmount("0", balance, 6));
    assert.ok(validateSendAmount("0.00", balance, 6));
  });

  it("rejects too many decimal places", () => {
    assert.ok(validateSendAmount("0.0000001", balance, 6));
  });

  it("accepts valid amounts including equal-to-balance and trailing zeros", () => {
    assert.equal(validateSendAmount("1", balance, 6), null);
    assert.equal(validateSendAmount(" 1,5 ", balance, 6), null);
    assert.equal(validateSendAmount("1.00", balance, 6), null);
    assert.equal(validateSendAmount(balance, balance, 6), null);
    assert.equal(validateSendAmount("0.000001", balance, 6), null);
  });

  it("rejects amounts greater than the balance", () => {
    assert.ok(validateSendAmount("100.000001", balance, 6));
    assert.ok(validateSendAmount("100.000001", balance, 6));
  });

  it("handles large values", () => {
    assert.equal(validateSendAmount("1000000000", "1000000000.5", 6), null);
    assert.ok(validateSendAmount("1000000001", "1000000000.5", 6));
  });
});
