import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { DefaultTheme, type Href, Stack, ThemeProvider, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform, Text, type TextStyle, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { supabase } from '@/lib/supabase';
import { identifyAnalyticsUser, trackEvent, trackScreen } from '@/lib/analytics';
import { AuthFlowProvider, useAuthFlow } from '@/lib/authFlow';
import { getAuthRedirect } from '@/lib/authRouting';
import {
  clearPendingDeepLink,
  consumePendingDeepLink,
  restoreInstallDestination,
  getRestorableDeepLinkPath,
  savePendingDeepLink,
} from '@/lib/pendingDeepLink';
import { markBookingNotificationReadByDeliveryId, markNotificationRead } from '@/lib/notificationInbox';
import {
  AppBottomNav,
  AppBottomNavVisibilityProvider,
  type BottomTabKey,
  useIsAppBottomNavHidden,
} from '@/components/AppBottomNav';
import { AppUpdateGate } from '@/components/AppUpdateGate';

void SplashScreen.preventAutoHideAsync();

const textWithDefaults = Text as typeof Text & {
  defaultProps?: { style?: TextStyle | TextStyle[] };
};
textWithDefaults.defaultProps = textWithDefaults.defaultProps ?? {};
textWithDefaults.defaultProps.style = [
  { fontFamily: 'Pretendard-Regular' },
  ...(Array.isArray(textWithDefaults.defaultProps.style)
    ? textWithDefaults.defaultProps.style
    : textWithDefaults.defaultProps.style
      ? [textWithDefaults.defaultProps.style]
      : []),
];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getNotificationPath(response: Notifications.NotificationResponse) {
  const path = response.notification.request.content.data?.path;
  if (typeof path !== 'string') return null;
  const allowed = [
    /^\/courts\/[a-zA-Z0-9%_-]+(?:\?.*)?$/,
    /^\/notices(?:\?noticeId=[a-fA-F0-9-]+)?$/,
    /^\/customer-support(?:\?inquiryId=[a-fA-F0-9-]+)?$/,
    /^\/notification-history$/,
  ];
  return allowed.some((pattern) => pattern.test(path)) ? (path as Href) : null;
}

function getAnalyticsScreenName(pathname: string) {
  if (/^\/courts\//.test(pathname)) return 'court_detail';
  if (/^\/legal\//.test(pathname)) return 'legal_detail';
  const names: Record<string, string> = {
    '/': 'court_list',
    '/login': 'login',
    '/terms-consent': 'terms_consent',
    '/onboarding': 'onboarding',
    '/notification-permission': 'notification_permission_intro',
    '/location-permission': 'location_permission_intro',
    '/map': 'court_map',
    '/notifications': 'open_notifications',
    '/mypage': 'mypage',
    '/favorites': 'favorite_courts',
    '/recent-courts': 'recent_courts',
    '/profile-info': 'profile_info',
    '/terms-menu': 'terms_menu',
    '/notification-manage': 'notification_manage',
    '/notification-settings': 'notification_settings',
    '/notices': 'service_notices',
    '/customer-support': 'customer_support',
    '/notification-history': 'notification_inbox',
  };
  return names[pathname] ?? (pathname.replace(/^\/+/, '') || 'court_list');
}

function PersistentBottomNav() {
  const pathname = usePathname();
  const hidden = useIsAppBottomNavHidden();
  const activeByPath: Record<string, BottomTabKey> = {
    '/': 'search',
    '/map': 'map',
    '/notifications': 'notifications',
    '/mypage': 'mypage',
  };
  const active = activeByPath[pathname];
  if (!active || hidden) return null;
  return <AppBottomNav active={active} />;
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const lastResponseId = useRef<string | null>(null);
  const appOpenTracked = useRef(false);
  const splashHidden = useRef(false);
  const routingAttempt = useRef(0);
  const {
    initialized,
    session,
    legalConsentCompleted,
    onboardingCompleted,
    notificationIntroCompleted,
    locationIntroCompleted,
  } = useAuthFlow();

  useEffect(() => {
    if (!initialized) return;
    identifyAnalyticsUser(session?.user.id ?? null);
    if (!appOpenTracked.current) {
      appOpenTracked.current = true;
      trackEvent('app_opened', {
        signed_in: Boolean(session),
        legal_consent_completed: legalConsentCompleted,
        onboarding_completed: onboardingCompleted,
        notification_intro_completed: notificationIntroCompleted,
        location_intro_completed: locationIntroCompleted,
      });
    }
  }, [initialized, legalConsentCompleted, locationIntroCompleted, notificationIntroCompleted, onboardingCompleted, session]);

  useEffect(() => {
    if (!fontsReady || !initialized) return;
    const redirect = getAuthRedirect(pathname, {
      hasSession: Boolean(session),
      legalConsentCompleted,
      onboardingCompleted,
      notificationIntroCompleted,
      locationIntroCompleted,
    });
    if (!redirect) trackScreen(getAnalyticsScreenName(pathname));
  }, [fontsReady, initialized, legalConsentCompleted, locationIntroCompleted, notificationIntroCompleted, onboardingCompleted, pathname, session]);

  useEffect(() => {
    if (!fontsReady || !initialized) return;
    const attempt = ++routingAttempt.current;
    const routeState = {
      hasSession: Boolean(session),
      legalConsentCompleted,
      onboardingCompleted,
      notificationIntroCompleted,
      locationIntroCompleted,
    };
    const target = getAuthRedirect(pathname, routeState);
    const incomingDeepLink = getRestorableDeepLinkPath(pathname);
    const readyForContent = Boolean(session)
      && legalConsentCompleted
      && onboardingCompleted
      && notificationIntroCompleted
      && locationIntroCompleted;
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;

    const hideSplashAfterPaint = () => {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (cancelled || splashHidden.current) return;
          splashHidden.current = true;
          void SplashScreen.hideAsync();
        });
      });
    };

    void (async () => {
      // App Links can arrive before login or the first-run permission flow is
      // complete. Save the destination before auth routing replaces it.
      await restoreInstallDestination();
      if (incomingDeepLink && target) {
        await savePendingDeepLink(incomingDeepLink);
      }
      if (cancelled || routingAttempt.current !== attempt) return;

      if (target) {
        if (target === '/' && readyForContent) {
          const pendingPath = await consumePendingDeepLink();
          if (cancelled || routingAttempt.current !== attempt) return;
          router.replace((pendingPath ?? target) as Href);
          return;
        }
        router.replace(target as Href);
        return;
      }

      if (readyForContent) {
        if (incomingDeepLink) {
          // The requested detail route is already visible, so an older saved
          // destination must not unexpectedly reopen on a later app launch.
          await clearPendingDeepLink();
        } else {
          const pendingPath = await consumePendingDeepLink();
          if (cancelled || routingAttempt.current !== attempt) return;
          if (pendingPath) {
            router.replace(pendingPath as Href);
            return;
          }
        }
      }

      if (cancelled || routingAttempt.current !== attempt) return;
      hideSplashAfterPaint();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [fontsReady, initialized, legalConsentCompleted, locationIntroCompleted, notificationIntroCompleted, onboardingCompleted, pathname, router, session]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!initialized || !session || !legalConsentCompleted || !onboardingCompleted || !notificationIntroCompleted || !locationIntroCompleted) return;

    let isMounted = true;
    const navigate = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (lastResponseId.current === id) return;
      const path = getNotificationPath(response);
      if (!path) return;
      lastResponseId.current = id;
      const notificationType = response.notification.request.content.data?.type;
      const deliveryId = response.notification.request.content.data?.deliveryId;
      const notificationId = response.notification.request.content.data?.notificationId;
      trackEvent('push_notification_opened', {
        notification_type: typeof notificationType === 'string' ? notificationType : 'booking_open',
        destination: String(path).split('?')[0],
      });
      if (typeof deliveryId === 'string') {
        void markBookingNotificationReadByDeliveryId(deliveryId);
      } else if (typeof notificationId === 'string') {
        void markNotificationRead(notificationId);
      }
      router.push(path);
      void Notifications.clearLastNotificationResponseAsync();
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) return;
      navigate(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [initialized, legalConsentCompleted, locationIntroCompleted, notificationIntroCompleted, onboardingCompleted, router, session]);

  if (!fontsReady) return null;

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <AppBottomNavVisibilityProvider>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#FFFFFF' },
              headerStyle: { backgroundColor: '#FFFFFF' },
              headerTintColor: '#202020',
            }}>
            <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="login" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false, animation: 'none', gestureEnabled: false }} />
            <Stack.Screen name="terms-consent" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="notification-permission" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="location-permission" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="map" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="notifications" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="mypage" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="favorites" options={{ headerShown: false }} />
            <Stack.Screen name="recent-courts" options={{ headerShown: false }} />
            <Stack.Screen name="profile-info" options={{ headerShown: false }} />
            <Stack.Screen name="terms-menu" options={{ headerShown: false }} />
            <Stack.Screen name="legal/[type]" options={{ headerShown: false }} />
            <Stack.Screen name="notification-manage" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
            <Stack.Screen name="notices" options={{ headerShown: false }} />
            <Stack.Screen name="customer-support" options={{ headerShown: false }} />
            <Stack.Screen name="notification-history" options={{ headerShown: false }} />
            <Stack.Screen name="courts/[slug]" options={{ headerShown: false }} />
          </Stack>
          <PersistentBottomNav />
          <AppUpdateGate />
        </View>
      </AppBottomNavVisibilityProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Light': require('../../assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('../../assets/fonts/Pretendard-ExtraBold.otf'),
    'Pretendard-Black': require('../../assets/fonts/Pretendard-Black.otf'),
  });

  return (
    <AuthFlowProvider>
      <RootNavigator fontsReady={fontsLoaded || Boolean(fontError)} />
    </AuthFlowProvider>
  );
}
