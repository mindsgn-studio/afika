import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useWallet from '../store/wallet';
import PocketCore from '@/modules/pocket-module';
import { ensureWalletCoreReady, DEFAULT_NETWORK } from '@/@src/lib/core/walletCore';
import { formatCurrency, convertUSD } from '@/@src/lib/locale/currency';
import { useFxRate } from '@/@src/lib/locale/useFxRate';
import { Card } from './primatives/card';
import { Balance } from './primatives/balance';

export default function WalletCard() {
  const { walletAddress } = useWallet();
  const { locale, currency, rate } = useFxRate();
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await ensureWalletCoreReady();
        const cachedJson = await PocketCore.getLatestBalances(DEFAULT_NETWORK);
        const cached = JSON.parse(cachedJson) as Array<{
          tokenSymbol: string;
          balance: string;
          usdValue: string;
        }>;
        const usdc = cached.find((b) => b.tokenSymbol === 'USDC');
        if (usdc) {
          setUsdcBalance(Number(usdc.usdValue || usdc.balance || 0));
        }
      } catch {
        // ignore cache read errors
      }

      try {
        const latestJson = await PocketCore.syncBalances(DEFAULT_NETWORK);
        const latest = JSON.parse(latestJson) as Array<{
          tokenSymbol: string;
          balance: string;
          usdValue: string;
        }>;
        const usdc = latest.find((b) => b.tokenSymbol === 'USDC');
        if (usdc) {
          setUsdcBalance(Number(usdc.usdValue || usdc.balance || 0));
        }
      } catch {
        // ignore sync errors
      }
    };

    bootstrap();
  }, [walletAddress]);

  useEffect(() => {
    const usdString = usdcBalance.toString();
    const converted = convertUSD(usdString, rate);
    const value = converted ?? usdcBalance;
    setDisplayBalance(formatCurrency(value, locale, currency));
  }, [usdcBalance, locale, currency, rate]);

  return (
    <Card testID="wallet-card">
      <View>
          <Text style={styles.secondaryBalance}>
            {"Your Balance"}
          </Text>
          <Balance>
            {displayBalance || formatCurrency(0, locale, currency)}
          </Balance>
      </View>
      <View>
        <TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  secondaryBalance: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
