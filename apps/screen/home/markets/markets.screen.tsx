import React from 'react';
import { View, Text, FlatList, Image, ScrollView } from 'react-native';
import { connect } from 'react-redux';

import WalletAction from '../../../redux/actions/wallet.action';

const Markets = (props: any) => {
  const { markets } = props;

  React.useEffect(() => {
    //    getMarketData();
  }, []);

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      {markets ? (
        <View
          style={{
            backgroundColor: 'white',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 10,
          }}
        >
          <View
            style={{
              display: 'flex',
              width: '100%',
              minHeight: 150,
              backgroundColor: 'blue',
              borderRadius: 10,
              justifyContent: 'flex-end',
            }}
          >
            <Text
              style={{
                fontFamily: 'SF-Pro-Rounded-Bold',
                fontSize: 42,
                color: 'white',
                padding: 10,
              }}
            >
              Markets
            </Text>
          </View>
          {markets.map((data: any) => {
            return <></>;
          })}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: 'white',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'SF-Pro-Rounded-Bold',
            }}
          >
            LOADING
          </Text>
        </View>
      )}
    </View>
  );
};

const mapStateToProps = (state: any, props: any) => {
  return { markets: state.markets };
};

export default connect(mapStateToProps)(Markets);
