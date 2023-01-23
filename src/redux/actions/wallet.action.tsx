//@ts-ignore
import { COINGECKO_API, CLIENT_ID } from '@env';
//@ts-ignore
import { CONNECT, DISCONNECT, ERROR, GET_COINGECKO } from '@orbyt/constants';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import Web3Auth, {
  LOGIN_PROVIDER,
  OPENLOGIN_NETWORK,
} from '@web3auth/react-native-sdk';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import React from 'react';
global.Buffer = global.Buffer || Buffer;

const scheme = 'orbyt';
const resolvedRedirectUrl = `${scheme}://openlogin`;

export const WalletAction = (props: any) => {
  //sign in with wallet
  const connectWithWeb3Auth = React.useCallback(async () => {
    try {
      const response = await new Web3Auth(WebBrowser, {
        clientId: `${CLIENT_ID}`,
        network: OPENLOGIN_NETWORK.TESTNET,
      });

      const info = await response.login({
        loginProvider: LOGIN_PROVIDER.GOOGLE,
        redirectUrl: resolvedRedirectUrl,
      });

      props.dispatch({
        type: CONNECT,
        auth: response,
        connected: true,
        ed25519PrivKey: info.ed25519PrivKey,
        privKey: info.privKey,
        sessionId: info.sessionId,
        user: info.userInfo,
        currency: 'zar',
      });
    } catch (error: any) {
      props.dispatch({
        type: ERROR,
        connected: false,
        error: true,
      });
    }
  }, []);

  //sign in without wallet
  const testConnection = React.useCallback(async () => {
    try {
      props.dispatch({
        type: CONNECT,
        auth: null,
        connected: true,
        ed25519PrivKey: null,
        privKey: null,
        sessionId: null,
        user: {
          address: 'sibongiseni.eth',
        },
      });
    } catch (error) {
      props.dispatch({
        type: ERROR,
        connected: false,
        error: true,
      });
    }
  }, []);

  //disconnect wallet
  const disconnectWallet = React.useCallback(async (auth: any) => {
    // console.log('response: ', auth)
    try {
      //@ts-ignore
      const response = await auth.logout();

      props.dispatch({
        type: DISCONNECT,
        connected: false,
        auth: null,
        ed25519PrivKey: null,
        privKey: null,
        sessionId: null,
        user: null,
      });
    } catch (error: any) {
      props.dispatch({
        type: DISCONNECT,
        connected: false,
        auth: null,
        ed25519PrivKey: null,
        privKey: null,
        sessionId: null,
        user: null,
      });
    }
  }, []);

  //remove error
  const removeError = () => {
    props.dispatch({
      type: ERROR,
      error: false,
    });
  };

  //get market data
  const getMarketData = React.useCallback(async () => {
    const response = await fetch(
      `${COINGECKO_API}/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`,
      {
        method: 'GET',
      }
    )
      .then((success) => {
        success.json().then((data) => {
          props.dispatch({
            type: GET_COINGECKO,
            markets: data,
          });
        });
      })
      .catch((error) => {
        props.dispatch({
          type: GET_COINGECKO,
          markets: [],
          error: true,
        });
      });
  }, []);

  //get chain data
  const getChainId = async () => {
    try {
      const ethersProvider = ethers.getDefaultProvider(providerUrl);
      const networkDetails = await ethersProvider.getNetwork();
      return networkDetails;
    } catch (error) {
      return error;
    }
  };

  return {
    connectWithWeb3Auth,
    disconnectWallet,
    removeError,
    getMarketData,
    testConnection,
  };
};
