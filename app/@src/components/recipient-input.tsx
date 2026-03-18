import { View, TextInput, StyleSheet } from "react-native";
import { SendMethod } from "@/@src/types/send";
import { Title } from "./primatives/title";
import * as Contacts from 'expo-contacts';
import { useEffect } from "react";

export default function RecipientInput({
  method,
  value,
  onChange,
}: {
  method: SendMethod;
  value: string;
  onChange: (v: string) => void;
}) {
  let placeholder = "Recipient";

  //if (method === "ethereum") placeholder = "0x...";
  if (method === "phone") placeholder = "+27...";
  //if (method === "email") placeholder = "email@example.com";

   useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      /*
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Emails],
        });

        if (data.length > 0) {
          const contact = data[0];
          console.log(contact);
        }
      }
      */
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Title> {"Phone Number"} </Title>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    marginTop: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
});