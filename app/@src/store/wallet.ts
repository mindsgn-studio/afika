import { create } from 'zustand';

export type WalletTransaction = {
  hash: string;
  userOpHash?: string;
  token: string;
  amount: string;
  state: string;
  mode?: string;
  sponsorshipMode?: string;
  bundlerStatus?: string;
  createdAt?: number;
  metadata?: {
    source?: string;
    destination?: string;
    note?: string;
    providerId?: string;
  };
};

export type AAReadiness = {
  network: string;
  ownerAddress: string;
  accountAddress: string;
  smartAccountReady: boolean;
  entryPointConfigured: boolean;
  bundlerConfigured: boolean;
  paymasterConfigured: boolean;
  sponsorshipReady: boolean;
};

type WalletState = {
  walletAddress: string;
  smartAccountAddress: string;
  balancesJson: string;
  transactions: WalletTransaction[];
  aaReadiness: AAReadiness | null;
  setWalletAddress: (address: string) => void;
  setSmartAccountAddress: (address: string) => void;
  setBalancesJson: (summary: string) => void;
  setTransactions: (items: WalletTransaction[]) => void;
  setAAReadiness: (readiness: AAReadiness | null) => void;
  clearWalletState: () => void;
};

const useWallet = create<WalletState>((set) => ({
  walletAddress: '',
  smartAccountAddress: '',
  balancesJson: '{}',
  transactions: [],
  aaReadiness: null,
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setSmartAccountAddress: (smartAccountAddress) => set({ smartAccountAddress }),
  setBalancesJson: (balancesJson) => set({ balancesJson }),
  setTransactions: (transactions) => set({ transactions }),
  setAAReadiness: (aaReadiness) => set({ aaReadiness }),
  clearWalletState: () =>
    set({
      walletAddress: '',
      smartAccountAddress: '',
      balancesJson: '{}',
      transactions: [],
      aaReadiness: null,
    }),
}));

export default useWallet;