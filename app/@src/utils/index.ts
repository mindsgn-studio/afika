import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { getRandomBytes } from 'expo-crypto';

const MASTER_KEY_NAME = 'wallet_master_key_b64';
const KDF_SALT_NAME = 'wallet_kdf_salt_b64';

async function getOrCreateSecretB64(name: string, size: number): Promise<string> {
  const existing = await SecureStore.getItemAsync(name);
  if (existing) return existing;

  const bytes = getRandomBytes(size); // Uint8Array
  const b64 = Buffer.from(bytes).toString('base64');

  await SecureStore.setItemAsync(name, b64, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });

  return b64;
}

export async function getWalletInitSecrets() {
  const masterKeyB64 = await getOrCreateSecretB64(MASTER_KEY_NAME, 32);
  const kdfSaltB64 = await getOrCreateSecretB64(KDF_SALT_NAME, 16);
  return { masterKeyB64, kdfSaltB64 };
}