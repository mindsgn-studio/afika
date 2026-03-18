import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let firestoreDb: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    return null;
  }
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);
  // const emulatorHost = (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || '').trim();
  // const emulatorPort = Number(process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_PORT || '8080');
  // if (emulatorHost) {
  //  connectFirestoreEmulator(db, emulatorHost, emulatorPort);
  //}
  firestoreDb = db;
  return firestoreDb;
}

export function isFirestoreConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
