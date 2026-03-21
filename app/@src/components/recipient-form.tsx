import { View, StyleSheet } from "react-native";
import { Title }  from "@/@src/components/primatives/title"
import { Button }  from "@/@src/components/primatives/button"
import { TextInput,  } from "react-native";
import MethodSelector from "@/@src/components/selector";
import { SendMethod } from "@/@src/types/send";
import { useState } from "react";

export default function RecipientForm({
  method,
  setMethod
}:{
  method: SendMethod,
  setMethod: (method: SendMethod) => void
}) {
  const [name, setName] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [saving, setSaving] = useState<boolean>(false)

  const saveRecipeint = async() => {
    setSaving(true)
    try{
    } catch {
    } finally{
      setSaving(false)
    }
  }

  return (
    <View>
      <Title>Add Reciptient</Title>
      <MethodSelector
        value={method} 
        onChange={setMethod}
      />
      <TextInput
        testID="recipient-name-input"
        style={styles.input}
        value={name}
        placeholder="Name"
        onChange={(text: string) => {setName(text)}}
      />
      <TextInput
        testID="recipient-name-input"
        style={styles.input}
        value={address}
        placeholder="0x012E..."
        onChange={(text: string) => {setAddress(text)}}
      />
      <Button
        label={"Add"}
        progress={saving}
        onPress={saveRecipeint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
});
