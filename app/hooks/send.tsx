import { useState, useCallback } from 'react';
import { walletBridge, SendResult } from '../services';

interface SendState {
  sending: boolean;
  result: SendResult | null;
  error: string | null;
}

export function useSend(onSuccess?: (result: SendResult) => void) {
  const [state, setState] = useState<SendState>({
    sending: false,
    result: null,
    error: null,
  });

  const send = useCallback(async (
    toAddress: string,
    amountUSDC: string,
    passphrase: string,
  ) => {
    setState({ sending: true, result: null, error: null });
    try {
      const result = await walletBridge.send(toAddress, amountUSDC, passphrase);
      setState({ sending: false, result, error: null });
      onSuccess?.(result);
    } catch (e: any) {
      setState({ sending: false, result: null, error: e.message });
    }
  }, [onSuccess]);

  const reset = useCallback(() => {
    setState({ sending: false, result: null, error: null });
  }, []);

  return { ...state, send, reset };
}