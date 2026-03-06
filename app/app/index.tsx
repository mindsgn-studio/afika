import { StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  const router = useRouter();

  const getSecureKey = async () => {
    let result = await SecureStore.getItemAsync("onboarded");
    if (result) {
      router.replace('/(onboarding)/password');
    } else {
      router.replace('/(onboarding)/create');
    }
  }

  useEffect(() => {
    getSecureKey()  
  },[]);
  
  return (
    <ActivityIndicator style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    alignSelf: "center"
  },
});
