/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider }  from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';


import Load from './apps/components/load';
import Onboarding from './apps/components/onboarding';
import Import from './apps/components/import';
import Create from './apps/components/create';
import Home from './apps/components/Home';
import { store, persistor } from './apps/redux/store';

const Stack = createNativeStackNavigator();

const App = (): JSX.Element => {
  return (
    <Provider store={store}>
      <PersistGate 
        loading={null}
        persistor={persistor}>
        <NavigationContainer>
          <Stack.Navigator
              screenOptions={{
                  headerShown: false
                }}>
              <Stack.Screen name="Load" component={Load} />
              <Stack.Screen name="Onboarding" component={Onboarding} />
              <Stack.Screen name="Import" component={Import} />
              <Stack.Screen name="Create" component={Create} />
              <Stack.Screen name="Home" component={Home} />
          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  )
};

export default App;
