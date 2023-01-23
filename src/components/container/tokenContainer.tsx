//@ts-ignore
import { ALCHEMY_SDK } from '@env';
//@ts-ignore
import { TokenCard } from '@orbyt/components';
//@ts-ignore
import { colors } from '@orbyt/constants';
import { Network, Alchemy } from 'alchemy-sdk';
import React from 'react';
import { View, Text, Animated } from 'react-native';
import { connect } from 'react-redux';

import RPC from '../../lib/rpc';

const settings = {
  apiKey: ALCHEMY_SDK,
  network: Network.MATIC_MAINNET,
};

const TokenContainer = (props: any) => {
  const containerXY = React.useRef(
    new Animated.ValueXY({ y: 500, x: 0 })
  ).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState<any>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [list, setList] = React.useState<any>([]);
  const { privKey } = props;
  const [alchemy] = React.useState<any>(new Alchemy(settings));

  const getWallet = async () => {
    try {
      // Wallet address
      const address = await RPC.getAccounts(privKey);
      // Get token balances
      const balances = await alchemy.core.getTokenBalances(address);
      // Remove all accounts with 0
      const nonZeroBalances = balances.tokenBalances.filter((token: any) => {
        return token.tokenBalance !== '0';
      });

      const array = [];
      // Loop through all tokens with non-zero balance
      for (const token of nonZeroBalances) {
        // Get balance of token
        let balance = token.tokenBalance;

        // Get metadata of token
        const metadata = await alchemy.core.getTokenMetadata(
          token.contractAddress
        );

        // Compute token balance in human-readable format
        balance = balance / Math.pow(10, metadata.decimals);
        balance = balance.toFixed(2);

        array.push({
          name: `${metadata.name}`,
          balance: `${balance}`,
          symbol: `${metadata.symbol}`,
        });
      }
      setList(array);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  function slideUp() {
    Animated.timing(containerXY, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    Animated.timing(opacity, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }

  React.useEffect(() => {
    setMounted(true);
    if (mounted) {
      getWallet();
      setTimeout(slideUp, 2000);
    }
  }, [mounted]);

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          margin: 10,
          display: 'flex',
        },
        {
          transform: [
            {
              translateY: containerXY.y,
            },
          ],
          opacity,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: 'SF-Pro-Rounded-Bold',
          fontSize: 25,
          color: colors.orange,
        }}
      >
        TOKENS
      </Text>
      {loading ? (
        <View
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'SF-Pro-Rounded-Bold',
              fontSize: 40,
              color: 'gray',
            }}
          >
            LOADING
          </Text>
        </View>
      ) : !loading && list.length === 0 ? (
        <View
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'SF-Pro-Rounded-Bold',
              fontSize: 40,
              color: 'gray',
            }}
          >
            No Tokens Found
          </Text>
        </View>
      ) : (
        list.map((item: any, index: any) => {
          return (
            <TokenCard
              key={index}
              name={item.symbol}
              symbol={item.symbol}
              amount={item.balance}
            />
          );
        })
      )}
    </Animated.View>
  );
};

const mapStateToProps = (state: any) => {
  return {
    connected: state.connected,
    privKey: state.privKey,
    user: state.user,
    error: state.error,
  };
};

export default connect(mapStateToProps)(TokenContainer);
