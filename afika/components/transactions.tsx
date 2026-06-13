import { StyleSheet, View } from 'react-native';
import { FlashList } from "@shopify/flash-list";
import EmptyTransactionCard from '@/components/empty-transaction-card';
import TransactionCard from '@/components/transaction-card';
import TransactionHeader from '@/components/transaction-header';
import { useState, useEffect } from 'react';
import { useWallet } from '@/store/wallet';
import firestore, { QuerySnapshot } from '@react-native-firebase/firestore';
<<<<<<< HEAD
=======
import { getActiveWalletAddress } from '@/lib/wallet';
>>>>>>> 027395c94bd11b65accd657b1de20fec82b24362

export default function TransactionList() {
  const wallet = useWallet()
  const [transactions, setTransactions] = useState<any[]>([])

    const onResult = (data: QuerySnapshot) => {
<<<<<<< HEAD
      const transactionArray: any[] = []

      data?.forEach( (transaction)=> {
        transactionArray.push( transaction.data())
      })
=======
      const transactionArray: any[] = [];

      data?.forEach( (transaction)=> {
        transactionArray.push(transaction.data());
      });

      transactionArray.sort((a, b) => {
        const aTime = Number(a.timestampMs || a.timestamp || 0);
        const bTime = Number(b.timestampMs || b.timestamp || 0);
        return bTime - aTime;
      });
>>>>>>> 027395c94bd11b65accd657b1de20fec82b24362

      setTransactions(transactionArray)
    }
  
    const onError = (error: any) => {
      console.log(error)
    }


  const getallTransaction = async() => {
<<<<<<< HEAD
    if(address === null){
=======
    const activeWalletAddress = getActiveWalletAddress(wallet);

    if(!activeWalletAddress){
>>>>>>> 027395c94bd11b65accd657b1de20fec82b24362
      return null
    }

    try {
<<<<<<< HEAD
      firestore().collection("wallets").doc(smartAdress? smartAdress.toLowerCase() : address?.toLowerCase()).collection("transactions").onSnapshot(onResult, onError)
=======
      //@ts-expect-error unkown error
      firestore().collection("wallets").doc(activeWalletAddress).collection("transactions").onSnapshot(onResult, onError)
>>>>>>> 027395c94bd11b65accd657b1de20fec82b24362
    } catch(error){
      console.log(error)
    } finally {
    }
  }

  useEffect(() => {
    getallTransaction()
  },[])

  return (
    <View testID="transaction-list">
      <FlashList
        data={transactions}
        //@ts-expect-error unknown error
        estimatedItemSize={90}
        ListEmptyComponent={<EmptyTransactionCard /> }
        ListHeaderComponent={transactions.length == 0? null: <TransactionHeader />}
        renderItem={({ item }) => <TransactionCard tx={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
