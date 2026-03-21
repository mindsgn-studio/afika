import { Screen } from "@/@src/components/primatives/screen";
import { StyleSheet } from "react-native";
import RecipientForm from "@/@src/components/recipient-form";
import { SendMethod } from "@/@src/types/send";
import { useState } from "react";

export default function Recepient() {
  const [method, setMethod] = useState<SendMethod>("ethereum");
  return (
    <Screen style={styles.container}>
      <RecipientForm 
        method={method}
        setMethod={setMethod} 
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
});
