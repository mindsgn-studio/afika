import { View, Text, StyleSheet } from "react-native";
import AmountKeypad from "@/@src/components/amount-keypad";

export default function AmountInput({
  amount,
  currency,
  onChange,
}: {
  amount: string;
  currency: string;
  onChange: (value: string) => void;
}) {

  const handleKey = (key: string) => {
    if (key === "⌫") {
      onChange(amount.slice(0, -1));
      return;
    }
    onChange(amount + key);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>
        {currency} {amount || "0"}
      </Text>
      <AmountKeypad onPress={handleKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 24,
  },
  amount: {
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
});