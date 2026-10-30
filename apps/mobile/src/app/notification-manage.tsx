import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, LoadingState } from '@/components/ScreenState';
import { getAppErrorCopy, type AppErrorCopy } from '@/lib/appError';
import { hasEnabledPushTokenForCurrentUser, savePushTokenForCurrentUser } from '@/lib/devicePushTokens';
import {
  fetchCurrentUserReminderMap,
  fetchNotificationCourt,
  countActiveReminders,
  getRuleScheduleLabel,
  getRuleTargetLabel,
  isNotificationLimitError,
  MAX_ACTIVE_REMINDERS,
  REMINDER_OPTIONS,
  saveRuleReminders,
  type NotificationBookingRule,
  type NotificationCourt,
  type ReminderMinutes,
} from '@/lib/courtNotifications';
import { signInWithKakao } from '@/lib/mobileAuth';
import { registerForPushNotifications } from '@/lib/pushNotifications';
import { supabase } from '@/lib/supabase';
import { useMountedRef } from '@/lib/useMountedRef';

const optionLabels: Record<ReminderMinutes, string> = { 1440: '1일 전', 10: '10분 전' };

export default function NotificationManageScreen() {
  const router = useRouter();
  const mountedRef = useMountedRef();
  const loadIdRef = useRef(0);
  const { court: courtParam } = useLocalSearchParams<{ court: string }>();
  const courtSlug = Array.isArray(courtParam) ? courtParam[0] : courtParam;
  const [court, setCourt] = useState<NotificationCourt | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [reminders, setReminders] = useState<Record<string, number[]>>({});
  const [pushReady, setPushReady] = useState(false);
  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppErrorCopy | null>(null);

  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoading(true);
    setError(null);
    setCourt(null);
    try {
      if (!courtSlug) throw new Error('테니스장 주소를 확인하지 못했습니다.');
      const [{ data }, nextCourt] = await Promise.all([
        supabase.auth.getSession(),
        fetchNotificationCourt(courtSlug),
      ]);
      if (!mountedRef.current || loadId !== loadIdRef.current) return;
      setCourt(nextCourt);
      setSession(data.session);
      if (data.session) {
        const [nextReminders, connected] = await Promise.all([
          fetchCurrentUserReminderMap(),
          hasEnabledPushTokenForCurrentUser(),
        ]);
        if (!mountedRef.current || loadId !== loadIdRef.current) return;
        setReminders(nextReminders);
        setPushReady(connected);
      }
    } catch (cause) {
      if (mountedRef.current && loadId === loadIdRef.current) {
        setError(getAppErrorCopy(cause, '알림 정보를 불러오지 못했습니다.'));
      }
    } finally {
      if (mountedRef.current && loadId === loadIdRef.current) setLoading(false);
    }
  }, [courtSlug, mountedRef]);

  useEffect(() => {
    void load();
    return () => { loadIdRef.current += 1; };
  }, [load]);

  const ensureLogin = async () => {
    if (session) return session;
    const next = await signInWithKakao();
    if (!next) throw new Error('로그인이 취소됐습니다.');
    if (mountedRef.current) setSession(next);
    return next;
  };

  const toggleReminder = async (rule: NotificationBookingRule, minutes: ReminderMinutes) => {
    if (busyRule) return;

    setBusyRule(rule.id);
    try {
      await ensureLogin();
      const currentReminders = session ? reminders : await fetchCurrentUserReminderMap();
      if (!mountedRef.current) return;
      if (!session) setReminders(currentReminders);
      const current = currentReminders[rule.id] ?? [];
      const next = current.includes(minutes)
        ? current.filter((value) => value !== minutes)
        : [...current, minutes];
      const nextReminderMap = { ...currentReminders, [rule.id]: next };
      const nextCount = countActiveReminders(nextReminderMap);

      if (nextCount > MAX_ACTIVE_REMINDERS) {
        Alert.alert(
          `예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있어요`,
          '기존 알림을 해제한 뒤 다시 설정해 주세요.'
        );
        return;
      }

      if (!pushReady) {
        const token = await registerForPushNotifications();
        await savePushTokenForCurrentUser(token);
        if (!mountedRef.current) return;
        setPushReady(true);
      }
      const supported = next.filter((value): value is ReminderMinutes =>
        REMINDER_OPTIONS.includes(value as ReminderMinutes)
      );
      await saveRuleReminders(rule.id, supported);
      if (!mountedRef.current) return;
      setReminders((previous) => ({ ...previous, [rule.id]: supported }));
    } catch (cause) {
      if (!mountedRef.current) return;
      if (isNotificationLimitError(cause)) {
        Alert.alert(
          `예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있어요`,
          '기존 알림을 해제한 뒤 다시 설정해 주세요.'
        );
      } else {
        Alert.alert('알림을 설정하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setBusyRule(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>오픈 알림 설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <LoadingState style={styles.state} /> : null}
        {error ? <ErrorState description={error.description} onAction={() => void load()} style={styles.state} title={error.title} /> : null}

        {!loading && court ? (
          <>
            <Text style={styles.courtName}>{court.name}</Text>
            <Text style={styles.courtAddress}>{court.address || [court.region, court.city].filter(Boolean).join(' ')}</Text>
            <Text style={styles.description}>원하는 예약 규칙과 알림 시점을 선택해 주세요.</Text>

            {!session ? (
              <View style={styles.loginNotice}>
                <Text style={styles.loginTitle}>로그인이 필요한 기능입니다.</Text>
                <Text style={styles.loginDescription}>처음 알림을 선택하면 카카오 로그인을 진행합니다.</Text>
              </View>
            ) : null}

            <View style={styles.rules}>
              {court.rules.map((rule) => {
                const selected = reminders[rule.id] ?? [];
                return (
                  <View key={rule.id} style={styles.ruleCard}>
                    <View style={styles.ruleHeader}>
                      <Text style={styles.ruleTarget}>{getRuleTargetLabel(rule)}</Text>
                      {busyRule === rule.id ? <ActivityIndicator size="small" color="#53A978" /> : null}
                    </View>
                    <Text style={styles.ruleSchedule}>{getRuleScheduleLabel(rule) || '예약 사이트에서 접수 시간을 확인해 주세요.'}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.reminderLabel}>예약 오픈 알림</Text>
                    <View style={styles.optionRow}>
                      {REMINDER_OPTIONS.map((minutes) => {
                        const checked = selected.includes(minutes);
                        return (
                          <Pressable
                            key={minutes}
                            disabled={Boolean(busyRule)}
                            onPress={() => void toggleReminder(rule, minutes)}
                            style={({ pressed }) => [
                              styles.option,
                              checked && styles.optionSelected,
                              pressed && styles.pressed,
                            ]}>
                            <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
                              {checked ? <Text style={styles.check}>✓</Text> : null}
                            </View>
                            <Text style={[styles.optionText, checked && styles.optionTextSelected]}>{optionLabels[minutes]}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 64, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#ECECEC',
  },
  backButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#202020', fontSize: 38, lineHeight: 40, fontFamily: 'Pretendard-Light' },
  headerTitle: { flex: 1, color: '#282828', textAlign: 'center', fontSize: 18, fontFamily: 'Pretendard-Bold' },
  headerSpacer: { width: 56 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 26, paddingBottom: 34 },
  state: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#D54F55', fontSize: 14, textAlign: 'center' },
  courtName: { color: '#202020', fontSize: 27, lineHeight: 35, fontFamily: 'Pretendard-Bold' },
  courtAddress: { marginTop: 8, color: '#8A8F98', fontSize: 13, lineHeight: 20 },
  description: { marginTop: 22, color: '#777777', fontSize: 14, lineHeight: 22 },
  loginNotice: { marginTop: 18, padding: 16, borderRadius: 12, backgroundColor: '#F7F8F7', borderWidth: 1, borderColor: '#E5E7E6' },
  loginTitle: { color: '#303030', fontSize: 14, fontFamily: 'Pretendard-Bold' },
  loginDescription: { marginTop: 6, color: '#8A8F98', fontSize: 12, lineHeight: 18 },
  rules: { marginTop: 20, gap: 12 },
  ruleCard: { padding: 18, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DFE1E0', shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleTarget: { color: '#30C27C', fontSize: 16, fontFamily: 'Pretendard-Bold' },
  ruleSchedule: { marginTop: 11, color: '#303030', fontSize: 16, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  divider: { height: 1, marginVertical: 16, backgroundColor: '#ECECEC' },
  reminderLabel: { color: '#777777', fontSize: 12, fontFamily: 'Pretendard-Bold' },
  optionRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
  option: { flex: 1, minHeight: 46, paddingHorizontal: 12, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D6D8D7' },
  optionSelected: { borderColor: '#A9E4C5', backgroundColor: '#EFFAF4' },
  checkbox: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#9A9E9C', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#30C27C', borderColor: '#30C27C' },
  check: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Pretendard-Black' },
  optionText: { color: '#404040', fontSize: 13, fontFamily: 'Pretendard-Bold' },
  optionTextSelected: { color: '#20A866' },
  pressed: { opacity: 0.7 },
});
