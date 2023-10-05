import { TokenCard } from '@orbyt/components';
import { colors } from '@orbyt/constants';
import { useWallet } from '@orbyt/context';
import React from 'react';
import { View, FlatList } from 'react-native';
import { isNegative } from '@orbyt/hooks';
import { style } from './style';

const Tokens = (props: any) => {
  const { navigation } = props;
  const { rates: exchangeRate, marketData } = useWallet();
  const { rates } = exchangeRate;

  const goTo = (item: any, price: number) => {
    let color = colors.green;

    if (isNegative(price)) {
      color = colors.red;
    }

    navigation.navigate('Token', {
      item,
      color,
    });
  };

  return (
    <View style={style.default}>
      <FlatList
        data={marketData}
        renderItem={({ item }) => {
          return <TokenCard item={item} onPress={goTo} />;
        }}
      />
    </View>
  );
};

export { Tokens };
