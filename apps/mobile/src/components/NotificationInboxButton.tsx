import * as Notifications from 'expo-notifications';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';

import notificationIcon from '@/assets/images/header/icon_notification.svg';
import { hasUnreadNotifications } from '@/lib/notificationInbox';

export function NotificationInboxButton() {
  const router = useRouter();
  const [hasUnread, setHasUnread] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setHasUnread(await hasUnreadNotifications());
    } catch {
      setHasUnread(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  useEffect(() => {
    let delayedRefresh: ReturnType<typeof setTimeout> | null = null;
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const pushSubscription = Platform.OS === 'web'
      ? null
      : Notifications.addNotificationReceivedListener(() => {
        void refresh();
        delayedRefresh = setTimeout(() => void refresh(), 1200);
      });
    return () => {
      appState.remove();
      pushSubscription?.remove();
      if (delayedRefresh) clearTimeout(delayedRefresh);
    };
  }, [refresh]);

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={hasUnread ? '새 알림 있음, 알림함 열기' : '알림함 열기'}
    onPress={() => router.push('/notification-history')}
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
  >
    <ExpoImage source={notificationIcon} contentFit="contain" style={styles.icon} />
    {hasUnread ? <View style={styles.unreadDot} /> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 24, height: 24 },
  unreadDot: {
    position: 'absolute', top: 6, right: 6, width: 7, height: 7,
    borderRadius: 3.5, backgroundColor: '#EE3D3D',
  },
  pressed: { opacity: 0.55 },
});
