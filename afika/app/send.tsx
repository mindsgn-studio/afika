import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { usePrivy } from "@privy-io/expo";
import { useRouter } from "expo-router";
import {useEffect} from "react";
import { useFocusEffect } from 'expo-router';
import * as Haptics from "expo-haptics"
import { useCallback, useState } from 'react';
import { Dimensions } from 'react-native';
import { nextState, prevState } from "@/store/send";

export default function Send() {
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [state, setState] = useState<any>("method");
  const [method, setMethod] = useState<any>("ethereum");
  const [amount, setAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [destination, setDestination] = useState("");
  const router = useRouter()

  const onPress = () => {
    router.replace("/recipient")
  };

  useFocusEffect(
      useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  
        return () => {
         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
        };
    },[])
  );

  const next = () => setState(nextState(state));
  const back = () => setState(prevState(state));

  const nextFromRecipient = async () => {
    try {
      setState("sending")
     
      // const isUsd = currency === 'USD';
      // const usdcAmount = isUsd ? amount : convertLocalAmountToUsd(amount, rate);
      // if (!usdcAmount) {
      //  return;
      // }

      // @ts-expect-error
      await sendUSDC(network, recipientAddress, usdcAmount);
      setState("sent")
    } catch (error) {
      console.log(error)
      setState("error")
    }
  };
  
  return (
    <View style={styles.container}>
    
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
