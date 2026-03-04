import { NativeModule, requireNativeModule } from 'expo';

import { PocketApi, PocketNetwork } from './PocketModule.types';

declare class PocketModule extends NativeModule implements PocketApi {
  initWallet(dataDir: string, password: string, masterKeyB64: string, kdfSaltB64: string): Promise<void>;
  initWalletSecure(dataDir: string, password: string): Promise<void>;
  closeWallet(): Promise<void>;
  createEthereumWallet(name: string): Promise<string>;
  openOrCreateWallet(name: string): Promise<string>;
  getBalance(network: PocketNetwork): Promise<string>;
  getAccountSummary(network: string): Promise<string>;
  listAccounts(): Promise<string>;
  sendUsdc(network: string, destination: string, amount: string, note: string, providerID: string): Promise<string>;
  getUsdcTransactions(network: string, limit: number, offset: number): Promise<string>;
  exportBackup(passphrase: string): Promise<string>;
  importBackup(payload: string, passphrase: string): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PocketModule>('PocketCore');
