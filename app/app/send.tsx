import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import AmountInput from "@/@src/components/amount-input";
import RecipientInput from "@/@src/components/recipient-input";

import { SendState, SendMethod } from "@/@src/types/send";
import { nextState, prevState } from "@/@src/store/send";
import { Button } from "@/@src/components/primatives/button";
import PocketCore, { Recipient } from "@/modules/pocket-module";
import { ensureWalletCoreReady } from "@/@src/lib/core/walletCore";
import { sendUSDC } from "@/@src/lib/ethereum/sendUSDC";
import useWallet from "@/@src/store/wallet";
import BottomSheet, { BottomSheetRefProps } from "@/@src/components/bottomSheet";
import { TextInput } from "react-native";
import { Title } from "@/@src/components/primatives/title";
import { useRouter } from "expo-router";

export default function SendFlow() {
  const router = useRouter()
  const { network } = useWallet();
  const [state, setState] = useState<SendState>("method");
  const [method, setMethod] = useState<SendMethod>("ethereum");
  const [amount, setAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const ref = useRef<BottomSheetRefProps>(null);

  const onPress = () => {
    ref.current?.scrollTo(-400); 
  };

  const next = () => setState(nextState(state));
  const back = () => setState(prevState(state));

  const saveRecipient = async () => {
    await ensureWalletCoreReady();

    const payload: Recipient = {
      uuid: recipientId ?? "",
      name: recipientName.trim(),
      phone: recipientPhone.trim(),
      walletAddress: recipientAddress,
      email: "",
      country: "",
      createdAt: 0,
      updatedAt: 0,
    };

    if (!payload.name) {
      throw new Error("Name is required");
    }

    if (recipientId) {
      const updated = await PocketCore.updateRecipient(JSON.stringify(payload));
      const parsed = JSON.parse(updated || "{}") as Recipient;
      if (parsed?.uuid) setRecipientId(parsed.uuid);
    } else {
      const saved = await PocketCore.saveRecipient(JSON.stringify(payload));
      const parsed = JSON.parse(saved || "{}") as Recipient;
      if (parsed?.uuid) setRecipientId(parsed.uuid);
    }

    setDestination(recipientName);
  };

  const nextFromRecipient = async () => {
    try {
      setState("sending")
      await saveRecipient();
      //@ts-expect-error
      await sendUSDC(network, recipientAddress, amount);
      setState("sent")
    } catch (error) {
      console.log(error)
      setState("error")
    }
  };

  return (
    <View style={styles.container}>
      {state === "method" && (
        <View style={{
          flex: 1,
          width: Dimensions.get("window").width,
          paddingHorizontal: 20,
        }}>
          <RecipientInput
            onPress={onPress}
            method={method}
            name={recipientName}
            phone={recipientPhone}
            onChangeName={(value) => {
              setRecipientName(value);
              setRecipientId(null);
            }}
            onChangePhone={(value) => {
              setRecipientPhone(value);
              setRecipientId(null);
            }}
            onSelectRecipient={(recipient) => {
              setRecipientName(recipient.name || "");
              setRecipientPhone(recipient.phone || "");
              setRecipientAddress(recipient.walletAddress || "");
              setRecipientId(recipient.uuid || null);
            }}
            next={next}
          />
          <BottomSheet ref={ref}>
            <Title>Add Reciptient</Title>
            <TextInput
              testID="recipient-name-input"
              style={styles.input}
              placeholder="Name"
            />
            <TextInput
              testID="recipient-phone-input"
              style={styles.input}
            />
            <Button 
              label={"Add Recipient"}
              onPress={saveRecipient}
            />
          </BottomSheet>
        </View>
      )}

      {state === "amount" && (
        <AmountInput
          handleCompleteSwipe={nextFromRecipient}
          amount={amount}
          currency="R"
          onChange={setAmount}
          name={recipientName}
          phoneNumber={recipientPhone}
        />
      )}

       {state === "sending" && (
        <ActivityIndicator />
      )}

      {state === "error" && (
        <View style={{flex:1}}>
          <Title>ERROR</Title>
        </View>
      )}

      {state === "sent" && (
        <View>
          <View style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Title>SUCCESS</Title>
          </View>
          <Button
            label="Done"
            onPress={() => {
              router.push("/(home)")
            }}  
          />
        </View>
        
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    justifyContent: "center",
    alignItems: "center"
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
});
