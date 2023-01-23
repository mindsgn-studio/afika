import { AnimationAction } from '@orbyt/redux';
import React from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';

import { ShareCard } from './shareCard';

const SendCard = (prop: any) => {
  const { send } = prop;
  const { updateSending } = AnimationAction(prop);
  const cardY = React.useRef(new Animated.Value(700)).current;

  React.useEffect(() => {
    if (send) {
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
  }, [send]);

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
          updateSending(!send);
        }}
      >
        <Icon color="white" name="close" size={40} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const mapStateToProps = (state: any, props: any) => {
  return {
    send: state.animation.send,
  };
};

export default connect(mapStateToProps)(SendCard);
