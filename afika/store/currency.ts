import { create } from "zustand";
import type { PreferredCurrency } from "@/lib/wallet-service";

interface CurrencyStore {
  currency: PreferredCurrency;
  setCurrency: (currency: PreferredCurrency) => void;
}

export const useCurrencyStore = create<CurrencyStore>((set) => ({
  currency: "USD",
  setCurrency: (currency) => set({ currency }),
}));
