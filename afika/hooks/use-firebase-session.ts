import { useEffect, useRef } from "react";
import { usePrivy, useEmbeddedEthereumWallet } from "@privy-io/expo";
import { getAuth, signInWithCustomToken } from "@react-native-firebase/auth";
import { getApp } from "@react-native-firebase/app";
import { getActiveWalletAddress } from "@/lib/wallet";
import { useWallet } from "@/store/wallet";

const AUTH_MESSAGE_PREFIX = "Afika auth\n";

function authBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_AUTH_SESSION_URL ||
    "https://europe-west1-afika-510408.cloudfunctions.net"
  ).replace(/\/$/, "");
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${authBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await response.text();
  let data: (T & { error?: { message?: string } }) | undefined;
  try {
    data = JSON.parse(responseBody);
  } catch {
    const route = response.url || `${authBaseUrl()}${path}`;
    throw new Error(
      `Auth endpoint returned non-JSON (${response.status}) at ${route}. Check that the auth-session function is deployed and its URL is configured.`,
    );
  }
  if (!response.ok) {
    throw new Error(data?.error?.message || `Auth session failed (${response.status})`);
  }
  return data as T;
}

// Optional Firebase Auth for users/{uid} eligibility. Wallet docs are created
// by the app via upsertWallet — this hook does not register wallets.
export function useFirebaseSession() {
  const { user, getAccessToken, isReady } = usePrivy() as {
    user: unknown;
    isReady: boolean;
    getAccessToken?: () => Promise<string>;
  };
  const { wallets } = useEmbeddedEthereumWallet();
  const walletStore = useWallet();
  const kernelAddress = getActiveWalletAddress(walletStore);
  const signerAddress = wallets?.[0]?.address;
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isReady || !user || !kernelAddress || !signerAddress || !wallets?.[0]) {
      return;
    }
    const firebaseAuth = getAuth(getApp());
    if (firebaseAuth.currentUser?.uid) {
      return;
    }
    if (inFlight.current) return;

    let cancelled = false;
    inFlight.current = true;

    const run = async () => {
      try {
        const privyAccessToken = getAccessToken
          ? await getAccessToken()
          : "";
        if (!privyAccessToken) {
          throw new Error("Missing Privy access token");
        }
        const { nonce } = await postJson<{ nonce: string }>("/auth-nonce", {});
        const provider = await wallets[0].getProvider();
        const message = `${AUTH_MESSAGE_PREFIX}${nonce}`;
        const signature = (await provider.request({
          method: "personal_sign",
          params: [message, signerAddress],
        })) as string;
        const session = await postJson<{ customToken: string }>("/auth-session", {
          privyAccessToken,
          walletAddress: kernelAddress,
          signerAddress,
          signature,
          nonce,
        });
        if (!cancelled) {
          await signInWithCustomToken(firebaseAuth, session.customToken);
        }
      } catch (error) {
        console.log("firebase session error:", error);
      } finally {
        inFlight.current = false;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isReady, user, kernelAddress, signerAddress, getAccessToken, wallets]);
}
