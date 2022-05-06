import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { container } from '../style';

const Home = ({ navigation } : { navigation: any }) => {
  return (
    <View style={container.home}>
      <View
        style={{
          flex: 1,
          padding: 10,
        }}>
          {/*card*/}
          <View
            style={{
              minHeight: 250,
              minWidth: '100%',
              borderRadius: 20,
              backgroundColor: 'white'
            }}>
          </View>
      </View>
      <View
        style={{

          display: 'flex',
          flexDirection: 'row',
          justifyContent:'space-evenly',
        }}>
          <TouchableOpacity
            style={{
              minWidth: 100,
              backgroundColor:'white',
              padding: 10,
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            <Text
               style={{
                fontSize: 20,
                fontWeight:'bold'
              }}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              minWidth: 100,
              backgroundColor:'white',
              padding: 10,
              borderRadius: 20,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            <Text 
              style={{
              fontSize: 20,
              minWidth: 100,
              fontWeight:'bold'
            }}>Recieve</Text>
          </TouchableOpacity>
      </View>
      <View
         style={{
          flex: 1,
          padding: 10,
        }}>
      </View>
    </View>
  );
};

export default Home;
