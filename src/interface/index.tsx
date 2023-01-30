export interface Token {
  name: string;
  icon: string;
  amount: number;
}

export interface User {
  aggregateVerifier: string;
  dappShare: string;
  email: string;
  idToken: string;
  name: string;
  oAuthIdToken: string;
  profileImage: string;
  typeOfLogin: string;
  verifier: string;
  verifierId: string;
}

export interface walletState {
  connected?: boolean;
  ed25519PrivKey: string | null;
  privKey: string | null;
  sessionId: string | null;
  user: User | null;
  error: boolean;
  auth: any;
  markets: any;
  address: string | null;
  networkName: string | null;
  networkID: number | null;
  ens: string | null;
  providerUrl: string;
  tokenList: any[];
  currency: string;
  currencySymbol: string;
<<<<<<< HEAD
  settings: any;
=======
>>>>>>> f4aa1f2448e7494a500eda5f8a90aec45b5385b0
}

export interface nft {
  id: number;
  name: string;
  picture: string;
  price: number;
}
