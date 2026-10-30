import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export const TERMS_VERSION = '2026-10-20';
export const PRIVACY_CONSENT_VERSION = '2026-10-20';

const LEGAL_CONSENT_CACHE_PREFIX = 'courtskorea:legal-consent';

function cacheKey(userId: string) {
  return `${LEGAL_CONSENT_CACHE_PREFIX}:${userId}:${TERMS_VERSION}:${PRIVACY_CONSENT_VERSION}`;
}

export async function hasCurrentLegalConsent(userId: string) {
  const cached = await AsyncStorage.getItem(cacheKey(userId)) === 'true';
  const { data, error } = await supabase
    .from('user_legal_consents')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', TERMS_VERSION)
    .eq('privacy_consent_version', PRIVACY_CONSENT_VERSION)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (cached) return true;
    throw new Error(`약관 동의 상태를 확인하지 못했습니다: ${error.message}`);
  }

  if (data) await AsyncStorage.setItem(cacheKey(userId), 'true');
  else await AsyncStorage.removeItem(cacheKey(userId));
  return Boolean(data);
}

export async function saveCurrentLegalConsent(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_legal_consents').upsert(
    {
      user_id: userId,
      terms_version: TERMS_VERSION,
      privacy_consent_version: PRIVACY_CONSENT_VERSION,
      agreed_at: now,
      platform: Platform.OS,
    },
    { onConflict: 'user_id,terms_version,privacy_consent_version' }
  );

  if (error) throw new Error(`약관 동의를 저장하지 못했습니다: ${error.message}`);
  await AsyncStorage.setItem(cacheKey(userId), 'true');
}
