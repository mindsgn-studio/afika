import { Dimensions, StyleSheet, View, Text } from "react-native";
import { Title } from "@/components/shared/title";
import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import { UpsertData, upsertWallet } from "@/lib/firebase";
import { useEffect, useState } from "react";
import {
  QuerySnapshot,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { useWallet } from "@/store/wallet";
import firestore from "@react-native-firebase/firestore";
import { GrainyGradient } from "@/shared/ui/organisms/grainy-gradient";

const DEFAULT_NETWORK: string = "base-mainnet";

function onWalletError(error: unknown) {
  console.log(error);
}

export default function WalletCard() {
  const { address, smartAdress } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const { wallets } = useEmbeddedEthereumWallet();

  const onResult = (data: QuerySnapshot) => {
    data?.forEach((wallet) => {
      if (wallet.data().tokenSymbol === "USDC") {
        setBalance(parseFloat(wallet.data().usdAmount));
      }
    });
  };

  const upsertAndListen = async () => {
    if (address === null) {
      return;
    }

    try {
      const data: UpsertData = {
        address: smartAdress
          ? smartAdress.toLowerCase()
          : address.toLowerCase(),
        network: DEFAULT_NETWORK,
        createdAt: serverTimestamp(),
        PhoneNumber: null,
        IsVerified: false,
        UserLevel: 0,
        PhoneLinkedAt: null,
      };
      await upsertWallet(
        smartAdress ? smartAdress.toLowerCase() : address.toLowerCase(),
        data,
      );

      //const walletData = await getWallet(smartAdress?  smartAdress.toLowerCase() : address.toLowerCase())

      //walletData?.forEach((wallet)=>{
      //  if(wallet.data().tokenSymbol === "USDC"){
      //    setBalance(parseFloat(wallet.data().usdAmount))
      //  }
      // })
    } catch (error) {
    } finally {
      firestore()
        .collection("wallets")
        .doc(smartAdress ? smartAdress.toLowerCase() : address.toLowerCase())
        .collection("balances")
        .onSnapshot(onResult, onWalletError);
    }
  };

  useEffect(() => {
    if (wallets.length >= 1) {
      upsertAndListen();
    }
  }, [wallets]);

  return (
    <View style={styles.container}>
      <GrainyGradient
        borderRadius={40}
        width={Dimensions.get("screen").width - 40}
        colors={["#000", "#D9D9D9", "#4F4F4F", "#fff"]}
        height={200}
      />
      <View style={{ position: "absolute", padding: 10 }}>
        <Title color="white">{"Your Balance"}</Title>
        <Text style={{ fontSize: 80, fontWeight: "bold", color: "white" }}>
          ${balance.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: Dimensions.get("screen").width - 40,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
  },
});
