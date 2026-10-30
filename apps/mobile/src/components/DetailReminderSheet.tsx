import { Image } from 'expo-image';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationPermissionDialog } from '@/components/NotificationPermissionDialog';
import {
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
import { savePushTokenForCurrentUser } from '@/lib/devicePushTokens';
import { signInWithKakao } from '@/lib/mobileAuth';
import { getNotificationPermissions, registerForPushNotifications } from '@/lib/pushNotifications';
import { NavigationArrow } from '@/components/NavigationArrow';
import { trackEvent } from '@/lib/analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHEET_OFFSET = 760;
const optionLabels: Record<ReminderMinutes, string> = { 1440: '1일 전', 10: '10분 전' };

const eligibilityIconUris: Record<string, { uri: string; width: number }> = {
  normal: {
    width: 50,
    uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCA1MCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iI0VFRUVFRSIvPgo8cGF0aCBkPSJNMTcuODAwOCAxMC4yMzM0VjExLjUyODNIOS42NTAzOVY3LjEzNTc0SDExLjI3NTRWMTAuMjMzNEgxNy44MDA4Wk04LjM0Mjc3IDE0LjE2ODlWMTIuODQ4NkgxOC45MThWMTQuMTY4OUgxNC4zODU3VjE4LjE2OEgxMi43NjA3VjE0LjE2ODlIOC4zNDI3N1pNMjguODgzOCA3LjI4ODA5VjguMzI5MUMyOC44Nzc0IDkuNDA4MiAyOC44Nzc0IDEwLjU4MjUgMjguNTg1NCAxMi4yMDEySDMwLjExNTJWMTMuNTA4OEgyNS42MDg0VjE4LjE4MDdIMjMuOTgzNFYxMy41MDg4SDE5LjU3ODFWMTIuMjAxMkgyNi45NDE0QzI3LjIzOTcgMTAuNzE1OCAyNy4yNjUxIDkuNTc5NTkgMjcuMjcxNSA4LjU4MzAxSDIwLjc4NDJWNy4yODgwOUgyOC44ODM4Wk00MS41NjY0IDEwLjk5NTFWMTIuMzE1NEgzOS45Mjg3VjE4LjE0MjZIMzguMzAzN1Y2LjYxNTIzSDM5LjkyODdWMTAuOTk1MUg0MS41NjY0Wk0zMS4xODE2IDE1LjMyNDJWNy43MTk3M0gzMi43OTM5VjEzLjk4NDlDMzQuMjcyOSAxMy45NTk1IDM1Ljg1OTkgMTMuODE5OCAzNy41MjkzIDEzLjQ4MzRMMzcuNjk0MyAxNC44MjkxQzM1Ljc1ODMgMTUuMjIyNyAzMy44ODU3IDE1LjMyNDIgMzIuMTg0NiAxNS4zMjQySDMxLjE4MTZaIiBmaWxsPSIjM0EzQTNBIi8+Cjwvc3ZnPgo=',
  },
  resident: {
    width: 39,
    uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzkiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzOSAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjM5IiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iI0VBRjhGMiIvPgo8cGF0aCBkPSJNMTcuNjQ4NCA3LjI4ODA5VjguMzI5MUMxNy42NDIxIDkuNDA4MiAxNy42NDIxIDEwLjU4MjUgMTcuMzUwMSAxMi4yMDEySDE4Ljg3OTlWMTMuNTA4OEgxNC4zNzNWMTguMTgwN0gxMi43NDhWMTMuNTA4OEg4LjM0Mjc3VjEyLjIwMTJIMTUuNzA2MUMxNi4wMDQ0IDEwLjcxNTggMTYuMDI5OCA5LjU3OTU5IDE2LjAzNjEgOC41ODMwMUg5LjU0ODgzVjcuMjg4MDlIMTcuNjQ4NFpNMjUuODExNSA3LjU0MTk5VjEzLjExNTJIMjAuMTYyMVY3LjU0MTk5SDI1LjgxMTVaTTIxLjUwNzggMTcuOTE0MVYxNC4wODAxSDIzLjE0NTVWMTYuNjA2NEgyOS41NTY2VjE3LjkxNDFIMjEuNTA3OFpNMjEuNzYxNyAxMS44MzNIMjQuMTk5MlY4LjgyNDIySDIxLjc2MTdWMTEuODMzWk0yNy42MjcgMTQuODQxOFY2LjYyNzkzSDI5LjI1MlYxNC44NDE4SDI3LjYyN1oiIGZpbGw9IiMzMEMyN0MiLz4KPC9zdmc+Cg==',
  },
  citizen: {
    width: 39,
    uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzkiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzOSAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjM5IiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iI0ZERURFMSIvPgo8cGF0aCBkPSJNMTIuODM2OSA5LjIzMDQ3QzEyLjgzMDYgMTEuMzUwNiAxMy43OTU0IDEzLjQ3NzEgMTUuNzU2OCAxNC4zMDg2TDE0LjgwNDcgMTUuNjAzNUMxMy40ODQ0IDE1LjAwNjggMTIuNTcwMyAxMi44NTE2IDEyLjA0MzUgMTIuNDIzM0MxMS41MjI5IDEzLjk4NDkgMTAuNTc3MSAxNS4yNDE3IDkuMTY3OTcgMTUuODgyOEw4LjE5MDQzIDE0LjUzNzFDMTAuMjA5IDEzLjY4NjUgMTEuMTkyOSAxMS40NzEyIDExLjE5OTIgOS4yMzA0N1Y3LjUwMzkxSDEyLjgzNjlWOS4yMzA0N1pNMTYuMzc4OSAxOC4xOTM0VjYuNjE1MjNIMTguMDE2NlYxOC4xOTM0SDE2LjM3ODlaTTI1LjgxMTUgNy41NDE5OVYxMy4xMTUySDIwLjE2MjFWNy41NDE5OUgyNS44MTE1Wk0yMS41MDc4IDE3LjkxNDFWMTQuMDgwMUgyMy4xNDU1VjE2LjYwNjRIMjkuNTU2NlYxNy45MTQxSDIxLjUwNzhaTTIxLjc2MTcgMTEuODMzSDI0LjE5OTJWOC44MjQyMkgyMS43NjE3VjExLjgzM1pNMjcuNjI3IDE0Ljg0MThWNi42Mjc5M0gyOS4yNTJWMTQuODQxOEgyNy42MjdaIiBmaWxsPSIjRjA3QTJCIi8+Cjwvc3ZnPgo=',
  },
  inhabitant: {
    width: 39,
    uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzkiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAzOSAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjM5IiBoZWlnaHQ9IjI0IiByeD0iOCIgZmlsbD0iI0U1RjBGRCIvPgo8cGF0aCBkPSJNMTguODc5OSAxMi45ODgzVjE0LjI4MzJIMTQuMzg1N1YxOC4xNjhIMTIuNzg2MVYxNC4yODMySDguMzQyNzdWMTIuOTg4M0gxOC44Nzk5Wk04Ljg2MzI4IDExLjA0NTlDMTEuMTk5MiAxMC43NjAzIDEyLjQ5NDEgOS42MzAzNyAxMi42NjU1IDguNDk0MTRIOS4yOTQ5MlY3LjIyNDYxSDE3Ljk0MDRWOC40OTQxNEgxNC41Njk4QzE0LjczNDkgOS42MzAzNyAxNi4wMTA3IDEwLjc2MDMgMTguMzg0OCAxMS4wNDU5TDE3LjgwMDggMTIuMzE1NEMxNS43Njk1IDEyLjA0MjUgMTQuMzE1OSAxMS4xNzkyIDEzLjYxNzcgOS45OTIxOUMxMi45MTMxIDExLjE3OTIgMTEuNDcyMiAxMi4wNDI1IDkuNDU5OTYgMTIuMzE1NEw4Ljg2MzI4IDExLjA0NTlaTTI1LjgxMTUgNy41NDE5OVYxMy4xMTUySDIwLjE2MjFWNy41NDE5OUgyNS44MTE1Wk0yMS41MDc4IDE3LjkxNDFWMTQuMDgwMUgyMy4xNDU1VjE2LjYwNjRIMjkuNTU2NlYxNy45MTQxSDIxLjUwNzhaTTIxLjc2MTcgMTEuODMzSDI0LjE5OTJWOC44MjQyMkgyMS43NjE3VjExLjgzM1pNMjcuNjI3IDE0Ljg0MThWNi42Mjc5M0gyOS4yNTJWMTQuODQxOEgyNy42MjdaIiBmaWxsPSIjMjA4MEVFIi8+Cjwvc3ZnPgo=',
  },
};

type Props = {
  court: NotificationCourt;
  reminders: Record<string, number[]>;
  session: Session | null;
  visible: boolean;
  onClose: () => void;
  onRemindersChange: (next: Record<string, number[]>) => void;
};

function ruleContext(rule: NotificationBookingRule) {
  return [rule.booking_round_label, rule.usage_period_label, rule.target_condition]
    .map((value) => value?.trim())
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(' · ');
}

function EligibilityBadge({ rule }: { rule: NotificationBookingRule }) {
  const key = rule.eligibility?.trim() || 'normal';
  const icon = eligibilityIconUris[key];
  if (icon) {
    return <Image alt="" contentFit="contain" source={{ uri: icon.uri }} style={{ height: 24, width: icon.width }} />;
  }
  return <Text style={styles.fallbackBadge}>{getRuleTargetLabel(rule)}</Text>;
}

export function DetailReminderSheet({
  court,
  reminders,
  session,
  visible,
  onClose,
  onRemindersChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'rules' | 'time'>('rules');
  const [selectedRule, setSelectedRule] = useState<NotificationBookingRule | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<ReminderMinutes[]>([]);
  const [saving, setSaving] = useState(false);
  const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const sheetY = useRef(new Animated.Value(SHEET_OFFSET)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentX = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-130)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMounted(true);
    setStep('rules');
    setSelectedRule(null);
    setSelectedMinutes([]);
    setPermissionPromptVisible(false);
    contentX.setValue(0);
    sheetY.setValue(SHEET_OFFSET);
    backdropOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [backdropOpacity, contentX, sheetY, visible]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const close = () => {
    if (saving) return;
    Animated.parallel([
      Animated.timing(sheetY, { toValue: SHEET_OFFSET, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      onClose();
    });
  };

  const moveToTime = (rule: NotificationBookingRule) => {
    trackEvent('reminder_rule_selected', {
      court_id: court.id,
      booking_rule_id: rule.id,
      eligibility: rule.eligibility ?? 'unknown',
    });
    setSelectedRule(rule);
    setSelectedMinutes(
      (reminders[rule.id] ?? []).filter((value): value is ReminderMinutes =>
        REMINDER_OPTIONS.includes(value as ReminderMinutes)
      )
    );
    setStep('time');
    contentX.setValue(SCREEN_WIDTH * 0.16);
    Animated.spring(contentX, { toValue: 0, damping: 22, stiffness: 220, mass: 0.8, useNativeDriver: true }).start();
  };

  const moveBack = () => {
    Animated.timing(contentX, { toValue: SCREEN_WIDTH * 0.12, duration: 150, useNativeDriver: true }).start(() => {
      setStep('rules');
      setSelectedRule(null);
      setSelectedMinutes([]);
      contentX.setValue(-SCREEN_WIDTH * 0.12);
      Animated.timing(contentX, { toValue: 0, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };

  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.parallel([
      Animated.timing(toastY, { toValue: -130, duration: 210, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(toastOpacity, { toValue: 0, duration: 170, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }, [toastOpacity, toastY]);

  const showToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    toastY.setValue(-130);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastY, { toValue: 0, damping: 18, stiffness: 190, mass: 0.8, useNativeDriver: true }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 190, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(hideToast, 2600);
  };

  const persistSave = async () => {
    if (!selectedRule || selectedMinutes.length === 0 || saving) return;
    setSaving(true);
    try {
      if (!session) {
        const nextSession = await signInWithKakao();
        if (!nextSession) throw new Error('로그인이 취소됐습니다.');
        trackEvent('login_completed', { login_method: 'kakao', source: 'reminder_sheet' });
      }
      const nextMap = { ...reminders, [selectedRule.id]: selectedMinutes };
      if (countActiveReminders(nextMap) > MAX_ACTIVE_REMINDERS) {
        throw new Error('notification_subscription_limit_reached');
      }
      const token = await registerForPushNotifications();
      await savePushTokenForCurrentUser(token);
      await saveRuleReminders(selectedRule.id, selectedMinutes);
      trackEvent('reminder_saved', {
        court_id: court.id,
        booking_rule_id: selectedRule.id,
        reminder_minutes: selectedMinutes,
        reminder_count: selectedMinutes.length,
      });
      onRemindersChange(nextMap);
      Animated.parallel([
        Animated.timing(sheetY, { toValue: SHEET_OFFSET, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 190, useNativeDriver: true }),
      ]).start(() => {
        setMounted(false);
        onClose();
        showToast();
      });
    } catch (cause) {
      if (isNotificationLimitError(cause) || (cause instanceof Error && cause.message.includes('notification_subscription_limit_reached'))) {
        Alert.alert(`예약 알림은 최대 ${MAX_ACTIVE_REMINDERS}개까지 설정할 수 있어요`, '기존 알림을 해제한 뒤 다시 설정해 주세요.');
      } else {
        Alert.alert('알림을 설정하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!selectedRule || selectedMinutes.length === 0 || saving) return;
    try {
      const permissions = await getNotificationPermissions();
      if (!permissions?.granted) {
        trackEvent('notification_permission_prompt_viewed', { source: 'court_detail_reminder' });
        setPermissionPromptVisible(true);
        return;
      }
      await persistSave();
    } catch (cause) {
      Alert.alert('알림 권한을 확인하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
    }
  };

  const toastPanResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy < -5,
    onPanResponderMove: (_event, gesture) => {
      if (gesture.dy < 0) toastY.setValue(gesture.dy);
    },
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy < -32 || gesture.vy < -0.5) hideToast();
      else Animated.spring(toastY, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [hideToast, toastY]);

  return (
    <>
      <Animated.View
        pointerEvents={toastVisible ? 'auto' : 'none'}
        style={[styles.toast, { top: insets.top + 10, opacity: toastOpacity, transform: [{ translateY: toastY }] }]}
        {...toastPanResponder.panHandlers}>
        <View style={styles.toastCheck}><Text style={styles.toastCheckText}>✓</Text></View>
        <Text style={styles.toastText}>오픈 예약 알림이 신청되었어요.</Text>
      </Animated.View>

      <Modal
        transparent
        visible={mounted}
        animationType="none"
        onRequestClose={permissionPromptVisible ? () => setPermissionPromptVisible(false) : step === 'time' ? moveBack : close}
      >
        <View style={styles.modalRoot}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>
          <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18), transform: [{ translateY: sheetY }] }]}>
            <Animated.View style={{ transform: [{ translateX: contentX }] }}>
              {step === 'rules' ? (
                <>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>어떤 알림을 신청하시겠어요?</Text>
                    <Pressable accessibilityLabel="닫기" onPress={close} style={styles.closeButton}>
                      <Text style={styles.closeText}>×</Text>
                    </Pressable>
                  </View>
                  <Text numberOfLines={1} style={styles.courtName}>{court.name}</Text>
                  <ScrollView contentContainerStyle={styles.ruleList} showsVerticalScrollIndicator={false}>
                    {court.rules.map((rule) => (
                      <Pressable key={rule.id} onPress={() => moveToTime(rule)} style={({ pressed }) => [styles.ruleCard, pressed && styles.pressedCard]}>
                        <EligibilityBadge rule={rule} />
                        {ruleContext(rule) ? <Text numberOfLines={1} style={styles.ruleContext}>{ruleContext(rule)}</Text> : null}
                        <View style={styles.ruleBottomRow}>
                          <Text numberOfLines={2} style={styles.ruleSchedule}>{getRuleScheduleLabel(rule) || '예약 사이트에서 접수 시간을 확인해 주세요.'}</Text>
                          <NavigationArrow direction="right" />
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : selectedRule ? (
                <>
                  <View style={styles.timeHeader}>
                    <Pressable accessibilityLabel="이전 단계" onPress={moveBack} style={styles.backButton}>
                      <NavigationArrow direction="left" />
                    </Pressable>
                    <Text style={styles.sheetTitle}>언제 알림을 드릴까요?</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.courtName}>{court.name}</Text>
                  <View style={styles.optionRow}>
                    {REMINDER_OPTIONS.map((minutes) => {
                      const selected = selectedMinutes.includes(minutes);
                      return (
                        <Pressable
                          key={minutes}
                          disabled={saving}
                          onPress={() => setSelectedMinutes((current) => selected ? current.filter((value) => value !== minutes) : [...current, minutes])}
                          style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}>
                          <View style={[styles.radio, selected && styles.radioSelected]}>
                            {selected ? <Text style={styles.radioCheck}>✓</Text> : null}
                          </View>
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{optionLabels[minutes]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.guideBox}>
                    <Text style={styles.guideText}>다음 예약 오픈일로부터 선택한 시간 전에 항상 알림을 드려요.</Text>
                    <Text style={styles.guideExample}>예) 매월 16일 오전 10:00시에 예약이 오픈되면</Text>
                    <Text style={styles.guideBullet}>• 1일 전 : 매월 15일 오전 10:00에 알림 발송</Text>
                    <Text style={styles.guideBullet}>• 10분 전 : 매월 16일 오전 09:50에 알림 발송</Text>
                  </View>
                  <Pressable
                    disabled={selectedMinutes.length === 0 || saving}
                    onPress={() => void save()}
                    style={({ pressed }) => [styles.saveButton, selectedMinutes.length === 0 && styles.saveButtonDisabled, pressed && styles.saveButtonPressed]}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>저장</Text>}
                  </Pressable>
                </>
              ) : null}
            </Animated.View>
          </Animated.View>
          <NotificationPermissionDialog
            visible={permissionPromptVisible}
            onCancel={() => setPermissionPromptVisible(false)}
            onGranted={async () => {
              setPermissionPromptVisible(false);
              await persistSave();
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: { maxHeight: '84%', overflow: 'hidden', paddingHorizontal: 20, paddingTop: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  sheetHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { flexShrink: 1, color: '#353535', fontSize: 22, lineHeight: 30, letterSpacing: -0.4, fontFamily: 'Pretendard-Bold' },
  closeButton: { width: 40, height: 40, marginLeft: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  closeText: { marginTop: -2, color: '#111111', fontSize: 36, lineHeight: 38, fontFamily: 'Pretendard-Light' },
  courtName: { marginTop: 8, color: '#969696', fontSize: 14, lineHeight: 21, letterSpacing: -0.2, fontFamily: 'Pretendard-Regular' },
  ruleList: { paddingTop: 24, paddingBottom: 28, gap: 10 },
  ruleCard: { minHeight: 108, paddingHorizontal: 16, paddingVertical: 15, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 13, backgroundColor: '#FFFFFF' },
  pressedCard: { backgroundColor: '#F4F4F4' },
  fallbackBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EEEEEE', color: '#3A3A3A', fontSize: 13, fontFamily: 'Pretendard-Bold' },
  ruleContext: { marginTop: 9, marginRight: 26, color: '#929292', fontSize: 13, lineHeight: 19, letterSpacing: -0.25, fontFamily: 'Pretendard-Regular' },
  ruleBottomRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleSchedule: { flex: 1, color: '#353535', fontSize: 16, lineHeight: 23, letterSpacing: -0.35, fontFamily: 'Pretendard-SemiBold' },
  timeHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 36, height: 40, marginRight: 2, alignItems: 'flex-start', justifyContent: 'center' },
  optionRow: { marginTop: 28, flexDirection: 'row', gap: 10 },
  option: { flex: 1, height: 62, borderWidth: 1, borderColor: '#DADADA', borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF' },
  optionSelected: { borderColor: '#A9EAC9', backgroundColor: '#F0FBF6' },
  optionPressed: { opacity: 0.72 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#969696', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#30C27C', backgroundColor: '#30C27C' },
  radioCheck: { color: '#FFFFFF', fontSize: 13, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
  optionText: { color: '#303030', fontSize: 16, lineHeight: 22, fontFamily: 'Pretendard-SemiBold' },
  optionTextSelected: { color: '#30C27C' },
  guideBox: { marginTop: 10, padding: 14, borderRadius: 8, backgroundColor: '#F6F6F6' },
  guideText: { color: '#989898', fontSize: 13, lineHeight: 20, letterSpacing: -0.25, fontFamily: 'Pretendard-Regular' },
  guideExample: { marginTop: 18, color: '#989898', fontSize: 13, lineHeight: 20, letterSpacing: -0.25, fontFamily: 'Pretendard-Regular' },
  guideBullet: { color: '#989898', fontSize: 13, lineHeight: 20, letterSpacing: -0.25, fontFamily: 'Pretendard-Regular' },
  saveButton: { height: 52, marginTop: 42, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303030' },
  saveButtonDisabled: { backgroundColor: '#D5D5D5' },
  saveButtonPressed: { opacity: 0.78 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Pretendard-Bold' },
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 200, minHeight: 56, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#303030', shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 12 },
  toastCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#30C27C' },
  toastCheckText: { color: '#FFFFFF', fontSize: 13, lineHeight: 16, fontFamily: 'Pretendard-Bold' },
  toastText: { flex: 1, color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-SemiBold' },
});
