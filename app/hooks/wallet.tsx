import { useState, useEffect, useCallback, useRef } from 'react';
import { walletBridge, WalletInfo, Transfer } from '../services';

interface UseWalletState {
  info: WalletInfo | null;
  transfers: Transfer[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<UseWalletState>({
    info: null,
    transfers: [],
    loading: true,
    syncing: false,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(s => ({ ...s, syncing: true, error: null }));
      const [info, transfers] = await Promise.all([
        walletBridge.getInfo(),
        walletBridge.getTransfers(20),
      ]);
      setState(s => ({ ...s, info, transfers, loading: false, syncing: false }));
    } catch (e: any) {
      setState(s => ({ ...s, error: e.message, loading: false, syncing: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 12 seconds (one Ethereum block).
    intervalRef.current = setInterval(refresh, 12_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return { ...state, refresh };
}