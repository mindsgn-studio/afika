import React from 'react';
import { View } from 'react-native';

import { style } from './style';
import { Button } from '../../components';
import { colors } from '../../constants';
import { useAuth } from '../../context';

const Settings = (props: any) => {
  const { route, navigation } = props;
  const { params } = route;
  const { MagicKey } = params;
  const { setAuth } = useAuth();

  const logout = async () => {
    try {
      const response = await MagicKey.user.logout();
      if (response) {
        setAuth(null);
        navigation.replace('Loading');
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={style.default}>
      <View>
        <Button title={'LOGOUT'} color={colors.red} onPress={() => logout()} />
      </View>
      <View
        style={{
          flex: 1,
        }}
      />
    </View>
  );
};

export { Settings };
