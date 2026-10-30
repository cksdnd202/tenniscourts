import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import notificationPermissionImage from '@/assets/images/onboarding/notification-permission.png';
import { trackEvent } from '@/lib/analytics';
import { getNotificationPermissions, requestNotificationPermissions } from '@/lib/pushNotifications';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onGranted: () => void | Promise<void>;
};

export function NotificationPermissionDialog({ visible, onCancel, onGranted }: Props) {
  const awaitingSettingsRef = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      awaitingSettingsRef.current = false;
      const resetTimer = setTimeout(() => setBusy(false), 0);
      return () => clearTimeout(resetTimer);
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !awaitingSettingsRef.current) return;
      awaitingSettingsRef.current = false;
      void getNotificationPermissions()
        .then(async (permissions) => {
          if (permissions?.granted) {
            trackEvent('notification_permission_granted', { source: 'reminder_save', method: 'settings' });
            await onGranted();
          }
        })
        .finally(() => setBusy(false));
    });
    return () => subscription.remove();
  }, [onGranted, visible]);

  const allow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const current = await getNotificationPermissions();
      if (current?.granted) {
        await onGranted();
        return;
      }

      if (current?.canAskAgain !== false) {
        const requested = await requestNotificationPermissions();
        trackEvent('notification_permission_requested', {
          source: 'reminder_save',
          result: requested.granted ? 'granted' : 'denied',
        });
        if (requested.granted) {
          await onGranted();
          return;
        }
        setBusy(false);
        return;
      }

      awaitingSettingsRef.current = true;
      trackEvent('notification_settings_opened', { source: 'reminder_save' });
      await Linking.openSettings();
    } catch {
      awaitingSettingsRef.current = false;
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.layer}>
      <Pressable accessibilityLabel="알림 권한 안내 닫기" style={styles.backdrop} onPress={busy ? undefined : onCancel} />
      <View accessibilityViewIsModal style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>알림 권한이 필요해요</Text>
          <Pressable
            accessibilityLabel="닫기"
            disabled={busy}
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <Image
          alt="테니스장 예약 오픈 알림"
          contentFit="contain"
          source={notificationPermissionImage}
          style={styles.illustration}
        />

        <Text style={styles.description}>예약 오픈 알림을 받으려면 Courts Korea의 알림을 허용해 주세요.</Text>

        <View style={styles.actions}>
          <Pressable
            disabled={busy}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => void allow()}
            style={({ pressed }) => [styles.allowButton, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.allowText}>알림 허용</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    elevation: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  dialog: {
    width: '89.7%',
    maxWidth: 350,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  header: { height: 44, flexDirection: 'row', alignItems: 'flex-start' },
  title: {
    flex: 1,
    color: '#3A3A3A',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontFamily: 'Pretendard-Bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    marginTop: -1,
    marginRight: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F1F1',
  },
  closeText: {
    marginTop: -2,
    color: '#111111',
    fontSize: 34,
    lineHeight: 36,
    fontFamily: 'Pretendard-Light',
  },
  illustration: { alignSelf: 'center', width: 260, height: 260, marginTop: 4 },
  description: {
    marginTop: 7,
    color: '#5F5F5F',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.35,
    fontFamily: 'Pretendard-Regular',
  },
  actions: { height: 52, marginTop: 18, flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  allowButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#30C27C',
  },
  cancelText: { color: '#303030', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  allowText: { color: '#FFFFFF', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  pressed: { opacity: 0.68 },
});
