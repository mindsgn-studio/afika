import { Heading } from '@orbyt/components';
import { colors } from '@orbyt/constants';
import { useWallet } from '@orbyt/context';
import { isNegative, numberFormatter } from '@orbyt/hooks';
import { GlobalStyle } from '@orbyt/style';
import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, Image } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { style } from './style';

const Token = ({ route, navigation }: { route: any; navigation: any }) => {
  const { item, color = colors.red } = route.params;
  const [token, setTokeData] = useState<any>(null);
  const { rates: exchangeRate } = useWallet();
  const { rates } = exchangeRate;

  const {
    sparkline_in_7d,
    image,
    price_change_percentage_24h,
    price_change_24h,
    market_cap_rank,
    ath,
    atl,
    market_cap,
  } = item;
  const { price } = sparkline_in_7d;

  return (
    <View style={style.default}>
      <Heading
        exit={() => {
          navigation.goBack();
        }}
        title={``}
      />

      <View style={style.chart}>
        <LineChart
          data={{
            labels: [],
            datasets: [
              {
                data: [...price],
              },
            ],
          }}
          width={Dimensions.get('window').width}
          height={300}
          yAxisLabel="R"
          yAxisInterval={1}
          withVerticalLabels={false}
          withHorizontalLabels={false}
          withInnerLines={false}
          withVerticalLines={false}
          withHorizontalLines={false}
          withShadow={false}
          chartConfig={{
            backgroundColor: colors.red,
            decimalPlaces: 1,
            color: (opacity = 1) => color,
            labelColor: (opacity = 0) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '0',
              strokeWidth: '2',
              stroke: '#ffa726',
            },
          }}
          bezier
          style={{
            marginVertical: 8,
          }}
        />
      </View>
      <View style={style.summary}>
        <View style={GlobalStyle.row}>
          <Image source={{ uri: `${image}` }} style={style.image} />
          <View>
            <Text style={style.title}>{item.name}</Text>
            <View style={GlobalStyle.row}>
              <Text style={style.number}>{`R ${(
                parseFloat(item.current_price) * rates.ZAR
              ).toFixed(2)} `}</Text>
              <Text
                style={[
                  style.title,
                  {
                    color: `${
                      isNegative(parseFloat(price_change_24h))
                        ? colors.red
                        : colors.green
                    }`,
                  },
                ]}
              >{`(${price_change_percentage_24h} %)`}</Text>
            </View>
          </View>
        </View>
        <View style={GlobalStyle.column}>
          <Text style={style.subTitle}>{`Market Cap`}</Text>
          <Text style={style.title}>{`R ${numberFormatter(
            parseFloat(item.market_cap) * rates.ZAR,
            2
          )}`}</Text>
        </View>
        <View style={GlobalStyle.column}>
          <Text style={style.subTitle}>{`Circulating Supply`}</Text>
          <Text style={style.title}>{`R ${numberFormatter(
            parseFloat(item.circulating_supply) * rates.ZAR,
            2
          )}`}</Text>
        </View>
        <View style={GlobalStyle.column}>
          <Text style={style.subTitle}>{`Rank`}</Text>
          <Text style={style.title}>{`${market_cap_rank}`}</Text>
        </View>
        <View style={GlobalStyle.column}>
          <View style={GlobalStyle.flexRow}>
            <View>
              <Text style={style.subTitle}>{`All Time High`}</Text>
              <Text style={style.title}>{`R ${numberFormatter(
                parseFloat(ath) * rates.ZAR,
                2
              )}`}</Text>
            </View>
            <View>
              <Text style={style.subTitle}>{`All Time Low`}</Text>
              <Text style={style.title}>{`R ${numberFormatter(
                parseFloat(atl) * rates.ZAR,
                2
              )}`}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export { Token };
