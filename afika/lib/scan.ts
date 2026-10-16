/**
 * Pure helpers for reading wallet addresses out of scanned QR payloads.
 *
 * The send scanner only accepts Ethereum (`0x…`) and Bitcoin addresses
 * (legacy base58 or bech32 `bc1…` / `tb1…`). A payload may be a bare address
 * or a wallet URI (EIP-681 `ethereum:` / BIP-21 `bitcoin:`) with extra
 * parameters tacked on, so we extract the address and ignore the rest.
 *
 * Kept dependency-free so it can run in the node test runner and be reused
 * by the scan tray UI.
 */

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BITCOIN_BASE58 = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BITCOIN_BECH32 = /^(bc1|tb1)[ac-hj-np-z02-9]{11,71}$/;

export type WalletAddressKind = "ethereum" | "bitcoin";

export function isValidBitcoinAddress(value: string) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return false;
  return (
    BITCOIN_BASE58.test(trimmed) || BITCOIN_BECH32.test(trimmed.toLowerCase())
  );
}

export function isValidScannableAddress(value: string) {
  const trimmed = (value ?? "").trim();
  return EVM_ADDRESS.test(trimmed) || isValidBitcoinAddress(trimmed);
}

export function walletAddressKind(value: string): WalletAddressKind | null {
  const trimmed = (value ?? "").trim();
  if (EVM_ADDRESS.test(trimmed)) return "ethereum";
  if (isValidBitcoinAddress(trimmed)) return "bitcoin";
  return null;
}

/**
 * Pulls a supported wallet address out of a QR payload, ignoring wallet URI
 * parameters (`?amount=…`, `@8453`, …). Returns `null` when the payload does
 * not contain an Ethereum or Bitcoin address.
 */
export function extractWalletAddress(payload: string): string | null {
  const raw = (payload ?? "").trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();

  if (lower.startsWith("ethereum:")) {
    const candidate = raw
      .slice("ethereum:".length)
      .split(/[@?/]/)[0]
      .replace(/^pay-/i, "")
      .trim();
    return EVM_ADDRESS.test(candidate) ? candidate : null;
  }

  if (lower.startsWith("bitcoin:")) {
    const candidate = raw
      .slice("bitcoin:".length)
      .replace(/^\/\//, "")
      .split(/[?/]/)[0]
      .trim();
    return isValidBitcoinAddress(candidate) ? candidate : null;
  }

  if (EVM_ADDRESS.test(raw)) return raw;
  if (isValidBitcoinAddress(raw)) return raw;
  return null;
}
