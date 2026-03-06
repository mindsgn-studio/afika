import { ScrollView, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
// import Wallet from '@/@src/components/wallet';
// import Transactions from '@/@src/components/transactions';

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
        {
          /*
            <View style={styles.row}>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.title}>{"SEND"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.title}>{"TOP UP"}</Text>
              </TouchableOpacity>
            </View>
          */
        }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 8
  },
  row: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-between"
  },
  button: {
    flex: 1,
    margin: 10,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    borderRadius: 20
  },
  title: {
    alignSelf: "center",
    fontWeight: "bold",
    fontSize: 30,
  }
});
