//@ts-ignore
import { ETHLogo } from '@orbyt/assets';
import React from 'react';
import { View, Text, Animated } from 'react-native';
import { connect } from 'react-redux';

import RPC from '../../lib/rpc';

const WalletCard = (props: any) => {
  const { privKey } = props;
  const [mounted, setMounted] = React.useState<boolean>(false);
  const cardOpacity = React.useRef(new Animated.Value(0)).current;
  const [address, setAddress] = React.useState<string | null>(null);
  const [balance, setBalance] = React.useState<number | null>(null);
  const truncateRegex = /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;

  const getAccounts = async () => {
    try {
      const address = await RPC.getAccounts(privKey);
      console.log(privKey);
      setAddress(address);
    } catch (error) {
      console.log(error);
    }
  };

  const getBalance = async () => {
    try {
      const balance: any = await RPC.getBalance(privKey);
      console.log(balance);
      setBalance(balance);
    } catch (error) {
      console.log(error);
    }
  };

  const truncateEthAddress = (address: string) => {
    if (address === '') return null;
    const match = address.match(truncateRegex);
    if (!match) return address;
    return `${match[1]}…${match[2]}`;
  };

  React.useEffect(() => {
    if (mounted) {
      getAccounts();
      getBalance();

      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      }).start();
    }

    setMounted(true);
  }, [mounted]);

  return (
    <Animated.View
      style={{
        minHeight: 200,
        opacity: cardOpacity,
        display: 'flex',
        backgroundColor: 'black',
        borderRadius: 10,
        margin: 10,
        padding: 20,
        borderColor: 'white',
        borderWidth: 2,
      }}
    >
      <View>
        <Text
          style={{
            fontFamily: 'SF-Pro-Rounded-Bold',
            color: 'white',
            fontSize: 20,
          }}
        >
          {address && truncateEthAddress(address)}
        </Text>
      </View>
      <View
        style={{
          marginTop: -20,
        }}
      >
        <Text
          style={{
            fontFamily: 'SF-Pro-Rounded-Heavy',
            color: 'white',
            fontSize: 45,
          }}
        >
          R {balance}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          right: '2%',
          bottom: '4%',
          borderRadius: 100,
          minWidth: 50,
          minHeight: 50,
          maxWidth: 50,
          maxHeight: 50,
        }}
      >
        <ETHLogo width={50} height={50} />
      </View>
    </Animated.View>
  );
};

const mapStateToProps = (state: any) => {
  return {
    connected: state.wallet.connected,
    privKey: state.wallet.privKey,
    user: state.wallet.user,
    error: state.wallet.error,
  };
};

export default connect(mapStateToProps)(WalletCard);
