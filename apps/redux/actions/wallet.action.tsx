import { useWalletConnect } from '@walletconnect/react-native-dapp';
import React from 'react'
import { INCREMENT, DECREMENT, CONNECT, ERROR } from '../../constants';

export const WalletAction = (props: any) => {
    const connector = useWalletConnect();

    const connectWallet = React.useCallback(async () => {
        try{
            console.log("connecting wallet");
            connector.connect().then((success: any) => {
                console.log("success: ", success)
                props.dispatch({
                    type: CONNECT,
                    connected: true,
                    address: success.accounts[0],
                    chainId: success.chainId,
                    peerId: success.peerId,
                    peerMeta: success.peerMeta, 
                });
            }).catch((error) => {
                console.log("error: ", error)
                props.dispatch({
                    type: ERROR,
                    connected: false,
                });
            });
        }catch(error: any){
            console.log("error connecting wallet");
            props.dispatch({
                type: ERROR,
                connected: false,
            });
        }
    },[]);

    const disconnectWallet = React.useCallback(async () => {
        try{
            console.log("disconnecting wallet");
            connector.killSession().then((success: any) => {
                console.log("success: ", success)
                props.dispatch({
                    type: CONNECT,
                    connected: false,
                    address: null,
                    chainId: null,
                    peerId: null,
                    peerMeta: null
                });
            }).catch((error) => {
                console.log("error: ", error)
                props.dispatch({
                    type: ERROR,
                });
            });
        }catch(error: any){
            console.log("error connecting wallet");
            props.dispatch({
                type: ERROR,
            });
        }
    },[]);

    return {
        connectWallet,
        disconnectWallet
    }
}
  
export default WalletAction;