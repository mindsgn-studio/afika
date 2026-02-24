/**
 * WalletBridge — abstracts gomobile / NativeModule calls.
 *
 * In production, replace the mock implementations with NativeModule.
 * calls that delegate to the gomobile-generated Java/ObjC bindings:
 *
 *   import { NativeModules } from 'react-native';
 *   const { USDCWallet } = NativeModules;
 *
 * All methods are async and return the same shapes as the Go facade.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletInfo {
  address: string;
  usdcBalance: string;
  ethBalance: string;
  syncedBlock: number;
}

export interface Transfer {
  txHash: string;
  blockNumber: number;
  direction: 'IN' | 'OUT';
  amount: string;
  confirmed: boolean;
}

export interface SendResult {
  txHash: string;
  nonce: number;
}

// ─── Mock Data (dev / Storybook) ──────────────────────────────────────────────

const MOCK_ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';

let mockUSDC = '1042.50';
let mockETH = '0.004200';
let mockBlock = 19_842_100;
let mockNonce = 3;

const mockTransfers: Transfer[] = [
  { txHash: '0xabc1', blockNumber: 19842090, direction: 'IN',  amount: '500.00', confirmed: true  },
  { txHash: '0xabc2', blockNumber: 19842050, direction: 'OUT', amount: '100.00', confirmed: true  },
  { txHash: '0xabc3', blockNumber: 19842010, direction: 'IN',  amount: '750.00', confirmed: true  },
  { txHash: '0xabc4', blockNumber: 19841900, direction: 'OUT', amount: '107.50', confirmed: true  },
  { txHash: '0xabc5', blockNumber: 19841800, direction: 'IN',  amount: '1000.00', confirmed: true },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Bridge ───────────────────────────────────────────────────────────────────

class WalletBridge {
  private useMock: boolean;

  constructor() {
    // Flip to false when the NativeModule is linked.
    this.useMock = true;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async createWallet(passphrase: string): Promise<string> {
    if (this.useMock) {
      await sleep(800);
      return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    }
    // Production: const { NativeModules } = require('react-native');
    // return NativeModules.USDCWallet.createWallet(passphrase);
    throw new Error('NativeModule not linked');
  }

  async importWallet(mnemonic: string, passphrase: string): Promise<void> {
    if (this.useMock) {
      await sleep(1200);
      return;
    }
    // return NativeModules.USDCWallet.importWallet(mnemonic, passphrase);
    throw new Error('NativeModule not linked');
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getInfo(): Promise<WalletInfo> {
    if (this.useMock) {
      await sleep(300);
      return {
        address: MOCK_ADDRESS,
        usdcBalance: mockUSDC,
        ethBalance: mockETH,
        syncedBlock: mockBlock,
      };
    }
    // return NativeModules.USDCWallet.getInfo();
    throw new Error('NativeModule not linked');
  }

  async getTransfers(limit = 20): Promise<Transfer[]> {
    if (this.useMock) {
      await sleep(400);
      return mockTransfers.slice(0, limit);
    }
    // const json = await NativeModules.USDCWallet.getTransfers(limit);
    // return JSON.parse(json);
    throw new Error('NativeModule not linked');
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async send(toAddress: string, amountUSDC: string, passphrase: string): Promise<SendResult> {
    if (this.useMock) {
      await sleep(2000);
      const n = mockNonce++;
      mockUSDC = (parseFloat(mockUSDC) - parseFloat(amountUSDC)).toFixed(2);
      mockBlock += 1;
      mockTransfers.unshift({
        txHash: `0xmock${Date.now()}`,
        blockNumber: mockBlock,
        direction: 'OUT',
        amount: amountUSDC,
        confirmed: false,
      });
      return { txHash: `0xmock${Date.now().toString(16)}`, nonce: n };
    }
    // return NativeModules.USDCWallet.send(toAddress, amountUSDC, passphrase);
    throw new Error('NativeModule not linked');
  }

  // ── Sync ───────────────────────────────────────────────────────────────────

  async startSync(): Promise<void> {
    if (this.useMock) { mockBlock += 1; return; }
    // NativeModules.USDCWallet.startSync();
  }
}

export const walletBridge = new WalletBridge();