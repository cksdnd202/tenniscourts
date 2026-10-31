import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'courts-korea:pending-deep-link';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredDeepLink = {
  path: string;
  savedAt: number;
};

export function getRestorableDeepLinkPath(pathname: string) {
  const normalized = pathname.replace(/\/$/, '');
  if (!/^\/courts\/[^/?#]+$/.test(normalized)) return null;
  return normalized;
}

export async function savePendingDeepLink(pathname: string) {
  const path = getRestorableDeepLinkPath(pathname);
  if (!path) return;

  const value: StoredDeepLink = {
    path,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export async function consumePendingDeepLink() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  await AsyncStorage.removeItem(STORAGE_KEY);

  try {
    const value = JSON.parse(raw) as Partial<StoredDeepLink>;
    if (
      typeof value.path !== 'string'
      || typeof value.savedAt !== 'number'
      || Date.now() - value.savedAt > MAX_AGE_MS
    ) {
      return null;
    }
    return getRestorableDeepLinkPath(value.path);
  } catch {
    return null;
  }
}

export async function clearPendingDeepLink() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

let referrerRead: Promise<void> | undefined;
export function restoreInstallDestination() {
  if (Platform.OS !== 'android') return Promise.resolve();
  return referrerRead ??= (async () => {
    const key = 'courts-korea:install-referrer-consumed';
    if (await AsyncStorage.getItem(key)) return;
    try {
      const referrer = await Application.getInstallReferrerAsync();
      const raw = new URLSearchParams(referrer).get('court_path');
      if (raw && /^\/courts\/[\p{L}\p{N}_%-]+$/u.test(raw) && !await AsyncStorage.getItem(STORAGE_KEY)) {
        await savePendingDeepLink(raw);
      }
      await AsyncStorage.setItem(key, '1');
    } catch { referrerRead = undefined; }
  })();
}
