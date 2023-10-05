import { useWallet } from '@orbyt/context';
import { numberFormatter } from '@orbyt/hooks';
import { ETHLogo, MaticLogo } from '@orbyt/assets';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { style } from './style';

const WalletCard = () => {
  const { balance, exhangeRate, network } = useWallet();
  const [formatedBalance, setFormatedBalance] = useState(balance.toFixed(2));
  const { layer, name } = network;

  useEffect(() => {
    setFormatedBalance(numberFormatter(balance * exhangeRate, 1));
  }, [balance]);

  return (
    <View style={style.default}>
      <View>
        <Text style={style.amount}>{`R ${formatedBalance}`}</Text>
      </View>

      <TouchableOpacity style={style.networkButton} onPress={() => {}}>
        {layer && layer === 137 ? (
          <MaticLogo width={50} height={50} />
        ) : layer && layer === 80001 ? (
          <MaticLogo width={30} height={30} />
        ) : layer && layer === 1 ? (
          <ETHLogo width={30} height={30} />
        ) : layer && layer === 5 ? (
          <ETHLogo width={50} height={50} />
        ) : (
          <ActivityIndicator />
        )}
        <Text style={style.networkButtonText}>{name && name}</Text>
      </TouchableOpacity>
    </View>
  );
};

export { WalletCard };
