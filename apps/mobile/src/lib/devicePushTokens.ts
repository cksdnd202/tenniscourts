import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export async function savePushTokenForCurrentUser(expoPushToken: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('알림을 연결하려면 먼저 카카오로 로그인해 주세요.');
  }

  if (Platform.OS !== 'android' && Platform.OS !== 'ios' && Platform.OS !== 'web') {
    throw new Error('지원하지 않는 기기입니다.');
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: user.id,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version ?? null,
      is_enabled: true,
      disabled_at: null,
      last_seen_at: now,
      updated_at: now,
    },
    { onConflict: 'expo_push_token' }
  );

  if (error) throw new Error(`알림 기기를 저장하지 못했습니다: ${error.message}`);
}

export async function disablePushTokenForCurrentUser(expoPushToken?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const now = new Date().toISOString();
  let query = supabase
    .from('device_push_tokens')
    .update({ is_enabled: false, disabled_at: now, updated_at: now })
    .eq('user_id', user.id);

  if (expoPushToken) query = query.eq('expo_push_token', expoPushToken);

  const { error } = await query;

  if (error) throw new Error(`알림 연결을 해제하지 못했습니다: ${error.message}`);
}

export async function hasEnabledPushTokenForCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { count, error } = await supabase
    .from('device_push_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_enabled', true);

  if (error) throw new Error(`알림 연결 상태를 확인하지 못했습니다: ${error.message}`);
  return (count ?? 0) > 0;
}
