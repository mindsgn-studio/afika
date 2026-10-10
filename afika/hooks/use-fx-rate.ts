import { useSyncExternalStore } from "react";
import { doc, onSnapshot } from "@react-native-firebase/firestore";
import { getFirestore } from "@/lib/firestore";

const USD_ZAR_DOC = "USD_ZAR";
const USD_EUR_DOC = "USD_EUR";

type FxState = {
  /** Live USD → ZAR rate, published by the forex worker at `fxRates/USD_ZAR`. */
  rate: number;
  /** Live USD → EUR rate, published by the forex worker at `fxRates/USD_EUR`. */
  eurRate: number;
  loading: boolean;
};

// A single pair of shared Firestore listeners feeds every consumer, so
// transaction rows do not each open their own connections.
let state: FxState = { rate: 0, eurRate: 0, loading: true };
const listeners = new Set<() => void>();
let started = false;

function emit(next: FxState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function parseRate(data: unknown) {
  const value = Number((data as { rate?: unknown } | undefined)?.rate);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function start() {
  if (started) return;
  started = true;

  const db = getFirestore();

  onSnapshot(
    doc(db, "fxRates", USD_ZAR_DOC),
    (snapshot) => {
      emit({ ...state, rate: parseRate(snapshot.data()), loading: false });
    },
    (error) => {
      console.log("useFxRate USD/ZAR error:", error);
      emit({ ...state, rate: 0, loading: false });
    },
  );

  onSnapshot(
    doc(db, "fxRates", USD_EUR_DOC),
    (snapshot) => {
      emit({ ...state, eurRate: parseRate(snapshot.data()), loading: false });
    },
    (error) => {
      console.log("useFxRate USD/EUR error:", error);
      emit({ ...state, eurRate: 0, loading: false });
    },
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

/**
 * Live USD/ZAR and USD/EUR rates published by the forex worker.
 * Returns rate 0 until the corresponding rate is available.
 */
export function useFxRate() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
