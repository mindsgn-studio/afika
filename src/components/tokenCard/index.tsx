import { colors } from '@orbyt/constants';
import { useWallet } from '@orbyt/context';
import { numberFormatter, isNegative } from '@orbyt/hooks';
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { style } from './style';

const TokenCard = ({ item, onPress }: { item: any; onPress: any }) => {
  const { rates: exchangeRate } = useWallet();
  const { rates } = exchangeRate;

  const {
    name,
    image,
    current_price,
    price_change_24h,
    symbol,
    price_change_percentage_24h,
  } = item;

  const fiatPrice = parseFloat(current_price);

  return (
    <TouchableOpacity
      onPress={() => {
        onPress(item, parseFloat(price_change_percentage_24h));
      }}
      key={item.id}
      style={style.tokenCard}
    >
      <View
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Image source={{ uri: `${image}` }} style={style.cardImage} />
        <View>
          <Text style={style.cardName}>{name}</Text>
          <View style={style.cardDetails}>
            <Text>{`${symbol} `}</Text>
            {isNegative(parseFloat(price_change_24h)) ? (
              <Icon name="arrow-down-outline" size={20} color={colors.red} />
            ) : (
              <Icon name="arrow-up-outline" size={20} color={colors.green} />
            )}
            <Text>{`${parseFloat(price_change_percentage_24h).toFixed(
              2
            )}%`}</Text>
          </View>
        </View>
      </View>
      <View>
        <Text style={style.tokenPricePositive}>{`R ${numberFormatter(
          fiatPrice * rates.ZAR,
          2
        )}`}</Text>
      </View>
    </TouchableOpacity>
  );
};

export { TokenCard };
