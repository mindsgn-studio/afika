import React from 'react';
import { View, Animated, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';

import { OnboardingButton as Button } from '../../components/onboarding/button';
import { colors } from '../../constants/index';
import WalletAction from '../../redux/actions/wallet.action';
import { container } from '../../style/container.style';

const Onboarding = (props: any) => {
  const [text, onChangeText] = React.useState('Useless Text');
  const { connected, navigation, error, privKey } = props;
  const { connectWithWeb3Auth, testConnection } = WalletAction(props);
  const progress = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    Animated.timing(scale, { toValue: 0.4, useNativeDriver: true }).start();
  }, []);

  React.useEffect(() => {
    // console.log(connected)
    if (connected) navigation.navigate('Home');
  }, [connected]);

  return (
    <View style={container.onboarding}>
      <View>
        <Animated.Text
          style={[
            {
              color: `${colors.white}`,
              fontSize: 50,
              width: 300,
              fontFamily: 'SF-Pro-Rounded-Heavy',
            },
            {
              opacity: progress,
            },
          ]}
        >
          Set up your wallet
        </Animated.Text>
      </View>
      <View>
        <Animated.Text
          style={[
            {
              color: `${colors.gray}`,
              fontSize: 25,
              width: 300,
              fontFamily: 'SF-Pro-Rounded-Bold',
            },
          ]}
        >
          welcome to the world of decentralized finance, you just one step
          closer to total fincancial freedom.
        </Animated.Text>
      </View>
      <View
        style={{
          width: '90%',
          flex: 1,
          padding: 10,
          flexDirection: 'column',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
        }}
      >
        <Button
          color="#F15A24"
          onPress={() => connectWithWeb3Auth()}
          text="SIGN IN WITH GOOGLE"
        />
        <View
          style={{
            borderColor: '#F15A24',
            borderWidth: 2,
            borderRadius: 20,
            minHeight: 50,
            width: '100%',
            padding: 2,
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <View style={{ minWidth: '80%', flex: 1 }} />
          <TouchableOpacity
            onPress={() => testConnection()}
            style={{
              backgroundColor: '#F15A24',
              borderRadius: 20,
              width: 50,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon color="white" name="arrow-forward" size={30} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const mapStateToProps = (state: any, props: any) => {
  return {
    connected: state.connected,
    privKey: state.privKey,
    error: state.error,
  };
};

export default connect(mapStateToProps)(Onboarding);
