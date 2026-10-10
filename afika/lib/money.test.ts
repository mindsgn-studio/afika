import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  currencySymbol,
  formatCurrency,
  formatTransactionAmount,
  SUPPORTED_CURRENCIES,
} from "./money.ts";

describe("currency symbols", () => {
  it("supports EUR alongside USD and ZAR", () => {
    assert.deepEqual([...SUPPORTED_CURRENCIES], ["USD", "ZAR", "EUR"]);
  });

  it("renders the euro symbol", () => {
    assert.equal(currencySymbol("EUR"), "€");
  });

  it("renders USD and ZAR", () => {
    assert.equal(currencySymbol("USD"), "$");
    assert.equal(currencySymbol("ZAR"), "R");
  });

  it("formats a euro amount", () => {
    assert.equal(formatCurrency(9.2, "EUR"), "€9.20");
  });
});

describe("formatTransactionAmount with EUR", () => {
  it("prefers the stored euro amount", () => {
    const tx = { usdAmount: "10", eurAmount: "9.20", amount: "10", tokenSymbol: "USDC" };
    assert.equal(formatTransactionAmount(tx, "EUR", 0.92), "€9.20");
  });

  it("converts USD to EUR with the live rate when no stored value", () => {
    const tx = { usdAmount: "10", amount: "10", tokenSymbol: "USDC" };
    assert.equal(formatTransactionAmount(tx, "EUR", 0.92), "€9.20");
  });

  it("falls back to the raw token amount when no rates are available", () => {
    const tx = { amount: "10", tokenSymbol: "USDC" };
    assert.equal(formatTransactionAmount(tx, "EUR", 0), "10 USDC");
  });

  it("still formats USD and ZAR", () => {
    const tx = { usdAmount: "10", zarAmount: "180", amount: "10", tokenSymbol: "USDC" };
    assert.equal(formatTransactionAmount(tx, "USD"), "$10.00");
    assert.equal(formatTransactionAmount(tx, "ZAR"), "R180.00");
    assert.equal(formatTransactionAmount({ usdAmount: "10" }, "ZAR", 18), "R180.00");
  });
});
