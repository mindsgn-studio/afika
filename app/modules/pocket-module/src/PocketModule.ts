import { NativeModule, requireNativeModule } from 'expo';

import { PocketApi, PocketNetwork } from './PocketModule.types';

declare class PocketModule extends NativeModule implements PocketApi {
  initWallet(dataDir: string, password: string, masterKeyB64: string, kdfSaltB64: string): Promise<void>;
  initWalletSecure(dataDir: string, password: string): Promise<void>;
  closeWallet(): Promise<void>;
  createEthereumWallet(name: string): Promise<string>;
  getBalance(network: PocketNetwork): Promise<string>;
  listAccounts(): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<PocketModule>('PocketCore');
