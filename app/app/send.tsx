import { use, useState } from "react";
import { View, StyleSheet } from "react-native";
import MethodSelector from "@/@src/components/selector";
import AmountInput from "@/@src/components/amount-input";
import RecipientInput from "@/@src/components/recipient-input";
import ReviewCard from "@/@src/components/review-card";
import { sendUSDC } from "@/@src/lib/ethereum/sendUSDC";

import { SendState, SendMethod } from "@/@src/types/send";
import { nextState, prevState } from "@/@src/store/send";
import { Button } from "@/@src/components/primatives/button";
import { Title } from "@/@src/components/Primitives";
import useWallet from "@/@src/store/wallet";

export default function SendFlow() {
  const [state, setState] = useState<SendState>("method");
  const  {network} = useWallet();
  const [method, setMethod] = useState<SendMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [destination, setDestination] = useState("");

  const next = () => setState(nextState(state));
  const back = () => setState(prevState(state));

  const send = async () => {
    setState("sending");

    console.log(network)

    try {
      setState("sent");
    } catch {
      setState("error");
    }
  };

  return (
    <View style={styles.container}>
      {state === "method" && (
        <>
          <Title>How will you send money?</Title>

          <MethodSelector
            value={method}
            onChange={(m) => setMethod(m)}
          />

          <Button
            label="Next"
            onPress={next}
          />
        </>
      )}

      {state === "amount" && (
        <>
          <Title>How much?</Title>

          <AmountInput
            amount={amount}
            currency="R"
            onChange={setAmount}
          />

          <Button
            label="Next"
            onPress={next}
          />
        </>
      )}

      {state === "recipient" && method && (
        <>
          <Title>Recipient</Title>
          <RecipientInput
            method={method}
            value={destination}
            onChange={setDestination}
          />

          <Button
            label="Next"
            onPress={next}
          />
        </>
      )}

      {state === "review" && (
        <>
          <Title>Review</Title>

          <ReviewCard
            amount={`R ${amount}`}
            usd={usdAmount}
            recipient={destination}
          />

          <Button label="Confirm" onPress={send} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});