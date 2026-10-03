export const DEFAULT_WALLET_NETWORK = "base-mainnet";

export type WalletIdentityInput = {
  address?: string;
  network?: string;
};

export function normalizeWalletAddress(walletAddress: string) {
  return walletAddress.trim().toLowerCase();
}

export function walletIdentityFields(
  walletAddress: string,
  data?: WalletIdentityInput,
): { address: string; network: string } {
  const address = normalizeWalletAddress(data?.address || walletAddress);
  const network = (data?.network || DEFAULT_WALLET_NETWORK).trim() || DEFAULT_WALLET_NETWORK;
  return { address, network };
}
