import { NONAME } from 'dns';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { connect } from 'react-redux';

import WalletAction from '../../../redux/actions/wallet.action';

const NFTS = (props: any) => {
  const { nfts } = props;

  //should open card to full view
  const view = (id: number) => {
    console.log('pressed');
  };

  const roundOf = (number: number) => {
    return number.toFixed(2);
  };

  React.useEffect(() => {}, []);

  /*
   *   1. should be infinite scroll if user has infinite cards
   *   2. scroll up animation => main card in to header
   *   3. scroll down animation => main header in to card
   *   4. round up to decimal places =>
   *   5.
   */

  return (
    <View
      style={{
        flex: 1,
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
          NFTS
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          flexShrink: 2,
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
        }}
      >
        {nfts.map((item: any, index: any) => {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => view}
              style={{
                width: '45%',
                minHeight: 100,
                margin: 10,
                borderRadius: 20,
                borderWidth: 1,
              }}
            >
              <View
                style={{
                  backgroundColor: 'blue',
                  width: '100%',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  height: 100,
                }}
              >
                <Text>{}</Text>
              </View>
              <View
                style={{
                  padding: 10,
                }}
              >
                <Text>{`${item.name}`}</Text>
                <Text> {`R ${roundOf(item.price)}`}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const mapStateToProps = (state: any, props: any) => {
  return { nfts: state.nfts };
};

export default connect(mapStateToProps)(NFTS);
