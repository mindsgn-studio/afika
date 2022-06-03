import React from 'react';
import { View, Text, } from 'react-native';
import { container } from '../../style/container';
import Card from '../../components/card';
import Button from '../../components/button';
import { connect } from 'react-redux';
import WalletAction from '../../redux/actions/wallet.action';

const Settings = (props: any) => {
    const {connected, navigation} = props
    const { disconnectWallet } = WalletAction(props);

    React.useEffect(() => {
      if(!connected) navigation.navigate("Onboarding")
    },[props.connected]);

    return (
      <View>
        <Button 
          color={'#F15A24'}
          fontColor={'white'}
          text='disconnect wallet'
          minHeight={40}
          onPress={() => disconnectWallet()}
        />
      </View>
  );
};

const mapStateToProps = (state: any, props: any) => {
  return { connected: state.connected };
}

export default connect(mapStateToProps)(Settings);


