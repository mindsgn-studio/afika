import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import PocketCore from '@/modules/pocket-module';
import { File, Directory, Paths } from 'expo-file-system';

export default function App() {
  useEffect(() => {
    const bootstrapWallet = async () => {
      const dataDir = new Directory(Paths.document);
      const password = 'dev-password-change-me'

      try {
        await PocketCore.initWalletSecure(dataDir.uri, password)
      } catch (error) {
        console.error('PocketCore initWalletSecure failed:', error)
      }
    }

    bootstrapWallet()
  }, [])

  return (
    <View style={styles.container}>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
