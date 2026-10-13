import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractWalletAddress,
  isValidBitcoinAddress,
  isValidScannableAddress,
  walletAddressKind,
} from "./scan.ts";

const EVM = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const P2PKH = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
const P2SH = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
const BECH32 = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";

describe("isValidBitcoinAddress", () => {
  const cases: Array<[string, boolean]> = [
    [P2PKH, true],
    [P2SH, true],
    [BECH32, true],
    [BECH32.toUpperCase(), true],
    ["tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", true],
    ["", false],
    ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", false],
    ["bc1", false],
    ["1OIl0", false],
    ["vitalik.eth", false],
  ];

  for (const [value, expected] of cases) {
    it(`${JSON.stringify(value)} → ${expected}`, () => {
      assert.equal(isValidBitcoinAddress(value), expected);
    });
  }
});

describe("isValidScannableAddress / walletAddressKind", () => {
  it("accepts ethereum and bitcoin only", () => {
    assert.equal(isValidScannableAddress(EVM), true);
    assert.equal(isValidScannableAddress(P2PKH), true);
    assert.equal(isValidScannableAddress(BECH32), true);
    assert.equal(isValidScannableAddress("vitalik.eth"), false);
    assert.equal(isValidScannableAddress("not an address"), false);
  });

  it("classifies supported addresses", () => {
    assert.equal(walletAddressKind(EVM), "ethereum");
    assert.equal(walletAddressKind(BECH32), "bitcoin");
    assert.equal(walletAddressKind("vitalik.eth"), null);
  });
});

describe("extractWalletAddress", () => {
  it("returns a bare ethereum address", () => {
    assert.equal(extractWalletAddress(EVM), EVM);
    assert.equal(extractWalletAddress(`  ${EVM}  `), EVM);
  });

  it("parses EIP-681 ethereum URIs with chain and query", () => {
    assert.equal(extractWalletAddress(`ethereum:${EVM}`), EVM);
    assert.equal(extractWalletAddress(`ethereum:${EVM}@8453`), EVM);
    assert.equal(extractWalletAddress(`ethereum:${EVM}@8453?value=1`), EVM);
    assert.equal(extractWalletAddress(`ethereum:pay-${EVM}`), EVM);
  });

  it("parses bare and BIP-21 bitcoin payloads", () => {
    assert.equal(extractWalletAddress(BECH32), BECH32);
    assert.equal(extractWalletAddress(`bitcoin:${BECH32}`), BECH32);
    assert.equal(
      extractWalletAddress(`bitcoin:${BECH32}?amount=0.001`),
      BECH32,
    );
    assert.equal(extractWalletAddress(`bitcoin://${P2PKH}`), P2PKH);
  });

  it("rejects unsupported or malformed payloads", () => {
    assert.equal(extractWalletAddress(""), null);
    assert.equal(extractWalletAddress("   "), null);
    assert.equal(extractWalletAddress("vitalik.eth"), null);
    assert.equal(extractWalletAddress("ethereum:vitalik.eth"), null);
    assert.equal(extractWalletAddress("bitcoin:not-an-address"), null);
    assert.equal(extractWalletAddress("https://example.com"), null);
    assert.equal(extractWalletAddress("0x123"), null);
  });
});
