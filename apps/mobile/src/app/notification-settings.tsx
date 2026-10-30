import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavigationArrow } from '@/components/NavigationArrow';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import { getAppErrorCopy, type AppErrorCopy } from '@/lib/appError';
import {
  disablePushTokenForCurrentUser,
  hasEnabledPushTokenForCurrentUser,
  savePushTokenForCurrentUser,
} from '@/lib/devicePushTokens';
import { signInWithKakao } from '@/lib/mobileAuth';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { useMountedRef } from '@/lib/useMountedRef';

type NotificationPreferences = {
  booking_open_enabled: boolean;
  service_notice_enabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  booking_open_enabled: true,
  service_notice_enabled: true,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const mountedRef = useMountedRef();
  const loadIdRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<AppErrorCopy | null>(null);
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | 'unavailable'>('unavailable');
  const [masterEnabled, setMasterEnabled] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  const loadSettings = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    if (!mountedRef.current) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [{ data }, permissionResult] = await Promise.all([
        supabase.auth.getUser(),
        Platform.OS === 'web' ? Promise.resolve(null) : Notifications.getPermissionsAsync(),
      ]);
      const user = data.user;
      const nextMasterEnabled = user ? await hasEnabledPushTokenForCurrentUser() : false;
      if (!mountedRef.current || loadId !== loadIdRef.current) return;
      setLoggedIn(Boolean(user));
      setPermission(permissionResult?.status ?? 'unavailable');
      const saved = user?.user_metadata?.notification_preferences as Partial<NotificationPreferences> | undefined;
      setPreferences({ ...DEFAULT_PREFERENCES, ...(saved ?? {}) });
      setMasterEnabled(nextMasterEnabled);
    } catch (cause) {
      if (mountedRef.current && loadId === loadIdRef.current) {
        setLoadError(getAppErrorCopy(cause, '알림 설정을 불러오지 못했습니다.'));
      }
    } finally {
      if (mountedRef.current && loadId === loadIdRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useFocusEffect(useCallback(() => {
    void loadSettings();
    return () => { loadIdRef.current += 1; };
  }, [loadSettings]));

  const ensureLogin = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const session = await signInWithKakao();
    if (!session) throw new Error('로그인이 취소됐습니다.');
    if (mountedRef.current) setLoggedIn(true);
    return session;
  };

  const enableDeviceNotifications = async () => {
    await ensureLogin();
    const token = await registerForPushNotifications();
    await savePushTokenForCurrentUser(token);
    if (!mountedRef.current) return;
    setPermission(Notifications.PermissionStatus.GRANTED);
    setMasterEnabled(true);
  };

  const toggleMaster = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) await enableDeviceNotifications();
      else {
        await ensureLogin();
        await disablePushTokenForCurrentUser();
        if (mountedRef.current) setMasterEnabled(false);
      }
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('알림 설정을 변경하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const savePreference = async (key: keyof NotificationPreferences, next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      await ensureLogin();
      const nextPreferences = { ...preferences, [key]: next };
      const { error } = await supabase.auth.updateUser({ data: { notification_preferences: nextPreferences } });
      if (error) throw error;
      if (mountedRef.current) setPreferences(nextPreferences);
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('알림 설정을 변경하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const permissionGranted = permission === Notifications.PermissionStatus.GRANTED;
  const permissionBlocked = permission === Notifications.PermissionStatus.DENIED;

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <View style={styles.header}>
      <Pressable accessibilityLabel="뒤로가기" onPress={() => router.back()} style={styles.back}><NavigationArrow direction="left" /></Pressable>
    </View>
    <Text style={styles.title}>알림 설정</Text>
    {loading ? <LoadingState style={styles.loader} /> : loadError ? (
      <ErrorState description={loadError.description} onAction={() => void loadSettings()} style={styles.loader} title={loadError.title} />
    ) : <View style={styles.content}>
      {!permissionGranted ? <View style={styles.permissionCard}>
        <View style={styles.permissionCopy}>
          <Text style={styles.permissionTitle}>휴대폰 알림 권한</Text>
          <Text style={styles.permissionDescription}>알림을 받으시려면{`\n`}휴대폰 설정에서 알림을 켜주세요</Text>
        </View>
        <Pressable onPress={() => permissionBlocked ? void Linking.openSettings() : void toggleMaster(true)} style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}><Text style={styles.permissionButtonText}>설정</Text></Pressable>
      </View> : null}

      {!loggedIn ? <Text style={styles.loginNotice}>설정을 저장하려면 카카오 로그인이 필요합니다.</Text> : null}

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>전체 알림</Text><Text style={styles.settingDescription}>신청한 알림은 삭제하지 않고 발송만 잠시 멈춥니다.</Text></View>
          <Switch disabled={busy} value={masterEnabled} onValueChange={(value) => void toggleMaster(value)} trackColor={{ false: '#D6D8DC', true: '#A7E6C8' }} thumbColor={masterEnabled ? '#30C27C' : '#FFFFFF'} />
        </View>
      </View>

      <View style={styles.categoryBox}>
        <Text style={styles.sectionLabel}>알림</Text>
        <View style={styles.categorySettingRow}>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>예약 오픈 알림</Text><Text style={styles.settingDescription}>신청한 테니스장 예약이 열리기 전에 알려드려요.</Text></View>
          <Switch disabled={busy || !masterEnabled} value={preferences.booking_open_enabled} onValueChange={(value) => void savePreference('booking_open_enabled', value)} trackColor={{ false: '#D6D8DC', true: '#A7E6C8' }} thumbColor={preferences.booking_open_enabled ? '#30C27C' : '#FFFFFF'} />
        </View>
        <View style={styles.categorySettingRow}>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>서비스 중요 안내</Text><Text style={styles.settingDescription}>서비스 이용에 꼭 필요한 변경 사항을 알려드려요.</Text></View>
          <Switch disabled={busy || !masterEnabled} value={preferences.service_notice_enabled} onValueChange={(value) => void savePreference('service_notice_enabled', value)} trackColor={{ false: '#D6D8DC', true: '#A7E6C8' }} thumbColor={preferences.service_notice_enabled ? '#30C27C' : '#FFFFFF'} />
        </View>
      </View>
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' }, header: { height: 64 }, back: { width: 64, height: 64, justifyContent: 'center', paddingLeft: 16 }, title: { marginTop: 18, paddingHorizontal: 16, color: '#202020', fontSize: 28, lineHeight: 34, fontFamily: 'Pretendard-Regular' }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center' }, content: { paddingHorizontal: 16, paddingTop: 5 },
  permissionCard: { minHeight: 92, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F4C447', borderRadius: 11, backgroundColor: '#FFF8E7' }, permissionCopy: { flex: 1 }, permissionTitle: { color: '#303030', fontSize: 17, lineHeight: 23, fontFamily: 'Pretendard-SemiBold' }, permissionDescription: { marginTop: 4, color: '#CC8C00', fontSize: 15, lineHeight: 20, fontFamily: 'Pretendard-Regular' }, permissionButton: { width: 56, height: 44, marginLeft: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#FFDEA0' }, permissionButtonText: { color: '#202020', fontSize: 14, fontFamily: 'Pretendard-SemiBold' }, loginNotice: { marginTop: 12, color: '#8A8F98', fontSize: 13 },
  section: { marginTop: 24, borderBottomWidth: 1, borderBottomColor: '#ECEDEF' }, sectionLabel: { marginBottom: 13, color: '#969696', fontSize: 17, lineHeight: 23, fontFamily: 'Pretendard-SemiBold' }, categoryBox: { minHeight: 174, marginTop: 24, paddingHorizontal: 16, paddingTop: 17, paddingBottom: 12, borderRadius: 11, backgroundColor: '#F7F7F7' }, settingRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14 }, categorySettingRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 14 }, settingCopy: { flex: 1 }, settingTitle: { color: '#303030', fontSize: 17, lineHeight: 23, fontFamily: 'Pretendard-Medium' }, settingDescription: { marginTop: 3, color: '#969696', fontSize: 13, lineHeight: 18, fontFamily: 'Pretendard-Regular' }, pressed: { opacity: 0.6 },
});
