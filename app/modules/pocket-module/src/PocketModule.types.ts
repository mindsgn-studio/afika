export type PocketNetwork = 'mainnet' | 'testnet';

export type PocketApi = {
  initWallet(dataDir: string, password: string, masterKeyB64: string, kdfSaltB64: string): Promise<void>;
  initWalletSecure(dataDir: string, password: string): Promise<void>;
  closeWallet(): Promise<void>;
  createEthereumWallet(name: string): Promise<string>;
  getBalance(network: PocketNetwork): Promise<string>;
  listAccounts(): Promise<string>;
};
