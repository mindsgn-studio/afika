import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { formatMoney } from "@/lib/money";
import { getFirestore, collection, onSnapshot, query, where, orderBy, limit, doc } from "@react-native-firebase/firestore";
import { useWallet } from "@/store/wallet";
import { useEffect, useState } from "react";
import { useEmbeddedEthereumWallet } from "@privy-io/expo";
import { QuerySnapshot } from "@react-native-firebase/firestore";
import { UpsertData, upsertWallet } from "@/lib/firebase";

const DEFAULT_NETWORK: string = "base-mainnet";

type Props = {
  balance: number;
  children?: ReactNode;
  onAddMoney?: () => void;
};

function onWalletError(error: unknown) {
  console.log(error);
}

export default function HeroHeader({ balance, children, onAddMoney }: Props) {
  const { address, smartAdress } = useWallet();
  // const [balance, setBalance] = useState<number>(0);
  const { wallets } = useEmbeddedEthereumWallet();
  const [ amount, setBalance] = useState<number>(0);

  const onResult = (data: QuerySnapshot) => {
    data?.forEach((wallet) => {
      if (wallet.data().tokenSymbol === "USDC") {
        setBalance(parseFloat(wallet.data().usdAmount || wallet.data().amount));
      }
    });
  };


  const upsertAndListen = async () => {

    if (smartAdress === null) {
      return;
    }

    try {
      const walletAddress = smartAdress
        ? smartAdress.toLowerCase()
        : null;

      if (walletAddress === null) {
        return;
      }

      const data: UpsertData = {
        address: walletAddress,
        network: DEFAULT_NETWORK,
      };
      // await upsertWallet(walletAddress, data);

      //const walletData = await getWallet(smartAdress?  smartAdress.toLowerCase() : address.toLowerCase())

      //walletData?.forEach((wallet)=>{
      //  if(wallet.data().tokenSymbol === "USDC"){
      //    setBalance(parseFloat(wallet.data().usdAmount))
      //  }
      // })
    } catch (error) {
    } finally {
      //const db = getFirestore("afika-db");
      //const unsub = onSnapshot(
      //  collection(db, "wallets", (smartAdress || address).toLowerCase(), "balances"),
      //  onResult,
      //  onWalletError,
      //);
    }
  };

  useEffect(() => {

    if (wallets.length >= 1) {
      upsertAndListen();
    }
  }, [wallets]);

  return (
    <SafeAreaView edges={["top"]} style={styles.hero} testID="hero-header">
      <View style={styles.topBar}>
      </View>

      <View style={styles.balanceWrap}>
        <Text style={styles.balance} testID="portfolio-balance">
          <Text style={styles.dollar}>$ </Text>
          {formatMoney(balance)}
        </Text>
        <Pressable style={styles.addMoney} onPress={onAddMoney} testID="add-money">
          <View style={styles.plusDot}>
            <Feather name="plus" size={12} color={colors.ink} />
          </View>
          <Text style={styles.addMoneyText}>ADD MONEY</Text>
        </Pressable>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, paddingHorizontal: 20, paddingBottom: 24 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8 },
  currency: { flexDirection: "row", alignItems: "center", gap: 8 },
  flag: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.paper, overflow: "hidden", borderWidth: 1, borderColor: "#444" },
  flagCanton: { width: 11, height: 11, backgroundColor: "#3C3B6E" },
  currencyText: { fontFamily: fonts.medium, fontSize: 15, color: colors.paper },
  topIcons: { flexDirection: "row", gap: 20, alignItems: "center" },
  balanceWrap: { alignItems: "center", marginTop: 44, gap: 14 },
  balance: { fontFamily: fonts.medium, fontSize: 48, color: colors.paper, letterSpacing: -1 },
  dollar: { fontSize: 22, color: colors.lime },
  addMoney: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#444",
    backgroundColor: colors.inkSoft,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  plusDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  addMoneyText: { fontFamily: fonts.medium, fontSize: 11, color: colors.paper, letterSpacing: 0.4 },
});
