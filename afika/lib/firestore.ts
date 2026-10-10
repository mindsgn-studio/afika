import { getFirestore as getNamedFirestore } from "@react-native-firebase/firestore";

/** Named Firestore database used by the app. */
export const FIRESTORE_DATABASE_ID = "afika-db";

export function getFirestore() {
  return getNamedFirestore(FIRESTORE_DATABASE_ID);
}
