import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import notificationPermissionImage from '@/assets/images/onboarding/notification-permission.png';
import { trackEvent } from '@/lib/analytics';
import { useAuthFlow } from '@/lib/authFlow';
import { savePushTokenForCurrentUser } from '@/lib/devicePushTokens';
import {
  getNotificationPermissions,
  registerForPushNotifications,
  requestNotificationPermissions,
} from '@/lib/pushNotifications';
import { useMountedRef } from '@/lib/useMountedRef';

export default function NotificationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const { completeNotificationIntro } = useAuthFlow();
  const completionRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const finish = useCallback(async (method: 'granted' | 'later' | 'denied' | 'already_granted') => {
    if (completionRef.current) return;
    completionRef.current = true;
    try {
      await completeNotificationIntro();
      trackEvent('notification_intro_completed', { completion_method: method });
    } catch (cause) {
      completionRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
        Alert.alert(
          '알림 안내를 완료하지 못했습니다',
          cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.'
        );
      }
    }
  }, [completeNotificationIntro, mountedRef]);

  useEffect(() => {
    let active = true;
    void getNotificationPermissions()
      .then(async (permissions) => {
        if (!active || !permissions?.granted) return;
        try {
          const token = await registerForPushNotifications();
          await savePushTokenForCurrentUser(token);
        } catch {
          // Permission is already granted. A transient token error can be
          // retried when the user next saves a reminder.
        }
        if (active) await finish('already_granted');
      })
      .finally(() => {
        if (active && mountedRef.current) setChecking(false);
      });
    return () => { active = false; };
  }, [finish, mountedRef]);

  const allow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permissions = await requestNotificationPermissions();
      if (permissions.granted) {
        try {
          const token = await registerForPushNotifications();
          await savePushTokenForCurrentUser(token);
        } catch {
          // Saving a reminder performs the same token registration again.
        }
      }
      await finish(permissions.granted ? 'granted' : 'denied');
    } catch {
      await finish('denied');
    }
  };

  const later = async () => {
    if (busy) return;
    setBusy(true);
    await finish('later');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{'예약 오픈을 놓치지 않도록\n알려드릴게요'}</Text>
        <Text style={styles.description}>{'신청한 테니스장의 예약이 열리기 전에\n알림을 보내드려요'}</Text>

        <Image
          alt="테니스장 예약 오픈 알림"
          contentFit="contain"
          source={notificationPermissionImage}
          style={styles.illustration}
        />

        <View style={[styles.actions, { bottom: Math.max(insets.bottom, 20) + 22 }]}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || checking}
            onPress={() => void later()}
            style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
          >
            <Text style={styles.laterText}>나중에</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy || checking}
            onPress={() => void allow()}
            style={({ pressed }) => [styles.allowButton, pressed && styles.pressed]}
          >
            {busy || checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.allowText}>알림 허용</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  title: {
    marginTop: 76,
    color: '#3A3A3A',
    fontSize: 29,
    lineHeight: 38,
    letterSpacing: -0.75,
    fontFamily: 'Pretendard-Bold',
  },
  description: {
    marginTop: 23,
    color: '#858585',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.45,
    fontFamily: 'Pretendard-Regular',
  },
  illustration: {
    alignSelf: 'center',
    width: 315,
    height: 315,
    marginTop: 35,
  },
  actions: { position: 'absolute', left: 20, right: 20, height: 52, flexDirection: 'row', gap: 10 },
  laterButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  allowButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#30C27C',
  },
  laterText: { color: '#303030', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  allowText: { color: '#FFFFFF', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  pressed: { opacity: 0.68 },
});
