import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareDecimal,
  decimalPlaces,
  fromUsdcAmount,
  isSendAmountCurrency,
  isValidEvmAddress,
  normalizeAmountInput,
  normalizeRecipient,
  SEND_AMOUNT_CURRENCIES,
  toUsdcAmount,
  validateCurrencySendAmount,
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

describe("isSendAmountCurrency", () => {
  it("lists USDC first as the default", () => {
    assert.deepEqual([...SEND_AMOUNT_CURRENCIES], ["USDC", "ZAR", "EUR"]);
    assert.equal(isSendAmountCurrency("USDC"), true);
    assert.equal(isSendAmountCurrency("EUR"), true);
    assert.equal(isSendAmountCurrency("GBP"), false);
  });
});

describe("toUsdcAmount", () => {
  it("passes USDC through unchanged", () => {
    assert.equal(toUsdcAmount("25", "USDC", 1), "25");
    assert.equal(toUsdcAmount("25.50", "USDC", 1), "25.50");
  });

  it("converts ZAR to USDC using the USD→ZAR rate", () => {
    assert.equal(toUsdcAmount("180", "ZAR", 18), "10");
    assert.equal(toUsdcAmount("18", "ZAR", 18), "1");
    assert.equal(toUsdcAmount("90", "ZAR", 18), "5");
  });

  it("converts EUR to USDC using the USD→EUR rate", () => {
    assert.equal(toUsdcAmount("9.2", "EUR", 0.92), "10");
    assert.equal(toUsdcAmount("0.92", "EUR", 0.92), "1");
  });

  it("floors converted values so they never round up", () => {
    assert.equal(toUsdcAmount("100", "ZAR", 3), "33.333333");
    assert.equal(toUsdcAmount("1", "ZAR", 3), "0.333333");
  });

  it("returns 0 for invalid input or a missing rate", () => {
    assert.equal(toUsdcAmount("abc", "ZAR", 18), "0");
    assert.equal(toUsdcAmount("", "ZAR", 18), "0");
    assert.equal(toUsdcAmount("10", "ZAR", 0), "0");
    assert.equal(toUsdcAmount("10", "EUR", Number.NaN), "0");
  });
});

describe("fromUsdcAmount", () => {
  it("converts USDC into local currencies", () => {
    assert.equal(fromUsdcAmount("10", "ZAR", 18), "180");
    assert.equal(fromUsdcAmount("10", "EUR", 0.92), "9.2");
  });

  it("passes USDC through and tolerates a missing rate", () => {
    assert.equal(fromUsdcAmount("10.5", "USDC", 1), "10.5");
    assert.equal(fromUsdcAmount("10", "ZAR", 0), "0");
  });
});

describe("validateCurrencySendAmount", () => {
  const balance = "100";

  it("behaves like validateSendAmount for USDC", () => {
    assert.equal(validateCurrencySendAmount("100", "USDC", balance, 6, 1), null);
    assert.ok(validateCurrencySendAmount("100.000001", "USDC", balance, 6, 1));
    assert.ok(validateCurrencySendAmount("0", "USDC", balance, 6, 1));
  });

  it("rejects amounts whose converted USDC value exceeds the balance", () => {
    // R1800 / 18 = 100 USDC (equal to balance) is allowed.
    assert.equal(
      validateCurrencySendAmount("1800", "ZAR", balance, 6, 18),
      null,
    );
    assert.ok(validateCurrencySendAmount("1801", "ZAR", balance, 6, 18));
    assert.ok(validateCurrencySendAmount("92.01", "EUR", balance, 6, 0.92));
  });

  it("rejects non-positive and malformed local amounts", () => {
    assert.ok(validateCurrencySendAmount("", "ZAR", balance, 6, 18));
    assert.ok(validateCurrencySendAmount("abc", "ZAR", balance, 6, 18));
    assert.ok(validateCurrencySendAmount("0", "ZAR", balance, 6, 18));
  });

  it("requires a rate for local currencies", () => {
    assert.ok(validateCurrencySendAmount("10", "ZAR", balance, 6, 0));
    assert.ok(validateCurrencySendAmount("10", "EUR", balance, 6, 0));
  });
});
