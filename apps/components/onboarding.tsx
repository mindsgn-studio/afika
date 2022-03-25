import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { container } from '../style/container';
import { text } from '../style/text';
import { button } from '../style/button';

const Onboarding = ({ navigation } : { navigation: any }) => {
  
  const openImportScreen = () => {
    navigation.navigate('Import')
  };

  const openNewWalletScreen = () => {
    navigation.navigate('Create')
  };

  return (
    <View 
      style={container.default}>   
        <View
          style={{
            flex: 3,
            padding: 20,
            display: 'flex',
            alignItems:'center',
            justifyContent: 'center'
          }}>
          <View
            style={{
              flex: 3,
              padding: 20,
              display: 'flex',
              alignItems:'center',
              justifyContent: 'center'
            }}>
            <View>
              <Text
                style={text.logo}>
                ORBYT
              </Text>
            </View>
            <View>
              <Text
                style={text.default}>
                looking to get into the world of decentralized finance? you have come into the right place.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flex: 1
          }}>
          <TouchableOpacity
            onPress={() => openNewWalletScreen()}
            style={button.buttonPrimary}>
              <Text
                style={text.textSecondary}>
                New wallet
              </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openImportScreen()}
            style={button.buttonSecondary}>
              <Text
                style={text.textPrimary}>
                Import wallet
              </Text>
          </TouchableOpacity>
        </View>
    </View>
  );
};

export default Onboarding;
