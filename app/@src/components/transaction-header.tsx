import { StyleSheet, View } from 'react-native';
import { Title } from './primatives/title';
import { SubButton } from './primatives/sub-button';

export default function TransactionHeader() {
  return (
    <View style={styles.card}>
      <Title>{"TRANSACTIONS"}</Title>
      <View />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
    alignItems: "center"
  },
  title: {
    color: "white", 
    fontSize: 20
  }
});
