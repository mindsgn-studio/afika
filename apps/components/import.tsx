import React from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { container, text, input, button } from '../style';

const Import = ({ navigation } : { navigation: any }) => {
  const importKeys = () => {
  };

  return (
    <View style={container.import}>
      <Text style={text.default}>Enter your Passphrass</Text>
      <TextInput style={input.default}>
      </TextInput>
      <TouchableOpacity
        style={button.default}
        onPress={() => importKeys()}>
          <Text style={text.textSecondary}>Import</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Import;
