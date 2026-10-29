/**
 * Small JSON key/value store used for data that is no longer backed by
 * Firestore (wallet preferences, watchlist, eligibility, local pending
 * transactions).
 *
 * Backed by `expo-sqlite/kv-store`, with a safe no-op fallback when native
 * storage is unavailable (for example on web during a static render).
 */
import Storage from "expo-sqlite/kv-store";

const memory = new Map<string, string>();

function keyFor(key: string) {
  return key.startsWith("afika.") ? key : `afika.${key}`;
}

export async function readLocal<T>(key: string, fallback: T): Promise<T> {
  const storageKey = keyFor(key);
  try {
    const raw = await Storage.getItem(storageKey);
    if (raw === null) {
      const cached = memory.get(storageKey);
      return cached ? (JSON.parse(cached) as T) : fallback;
    }
    memory.set(storageKey, raw);
    return JSON.parse(raw) as T;
  } catch {
    const cached = memory.get(storageKey);
    if (!cached) return fallback;
    try {
      return JSON.parse(cached) as T;
    } catch {
      return fallback;
    }
  }
}

export async function writeLocal<T>(key: string, value: T): Promise<void> {
  const storageKey = keyFor(key);
  const raw = JSON.stringify(value);
  memory.set(storageKey, raw);
  try {
    await Storage.setItem(storageKey, raw);
  } catch {
    // Keep the in-memory copy; persistence is best effort.
  }
}

export async function removeLocal(key: string): Promise<void> {
  const storageKey = keyFor(key);
  memory.delete(storageKey);
  try {
    await Storage.removeItem(storageKey);
  } catch {
    // Ignore: the in-memory copy is already gone.
  }
}
