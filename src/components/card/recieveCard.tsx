import { AnimationAction } from '@orbyt/redux';
import React from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';

import { ShareCard } from './shareCard';

const ReceiveCard = (prop: any) => {
  const { receive } = prop;
  const { updateRecieving } = AnimationAction(prop);
  const cardY: any = React.useRef(new Animated.Value(700)).current;

  React.useEffect(() => {
    if (receive) {
      Animated.timing(cardY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(cardY, {
        toValue: 700,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [receive]);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: '100%',
          backgroundColor: 'black',
          height: '80%',
          bottom: '0%',
          padding: 10,
        },
        {
          transform: [
            {
              translateY: cardY,
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          updateRecieving(!receive);
        }}
      >
        <Icon color="white" name="close" size={40} />
      </TouchableOpacity>
      <View
        style={[
          {
            display: 'flex',
            width: 300,
            height: 300,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderWidth: 4,
            borderRadius: 10,
            borderColor: 'white',
            margin: 50,
          },
        ]}
      >
        <QRCode
          size={250}
          enableLinearGradient
          linearGradient={['rgb(255,0,0)', 'rgb(0,255,255)']}
          value="http://awesome.link.qr"
        />
      </View>
    </Animated.View>
  );
};

const mapStateToProps = (state: any, props: any) => {
  return {
    receive: state.animation.receive,
  };
};

export default connect(mapStateToProps)(ReceiveCard);
