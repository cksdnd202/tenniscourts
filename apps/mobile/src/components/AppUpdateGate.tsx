import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_WEB_ORIGIN } from '@/lib/webOrigin';

type AppUpdatePolicy = {
  platform: 'android' | 'ios';
  enabled: boolean;
  mode: 'none' | 'recommend' | 'force';
  latestVersionName: string;
  latestBuildNumber: number;
  minimumBuildNumber: number;
  title: string;
  message: string;
  storeUrl: string;
  remindAfterHours: number;
  updatedAt: string;
};

type VisibleUpdate = {
  policy: AppUpdatePolicy;
  force: boolean;
};

const ANDROID_PACKAGE = 'com.courtskorea.app';
const DISMISS_KEY_PREFIX = 'courts-korea:update-dismissed';

function getCurrentBuildNumber() {
  const parsed = Number.parseInt(Application.nativeBuildVersion ?? '', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidPolicy(value: unknown): value is AppUpdatePolicy {
  if (!value || typeof value !== 'object') return false;
  const policy = value as Partial<AppUpdatePolicy>;
  return (
    (policy.platform === 'android' || policy.platform === 'ios')
    && typeof policy.enabled === 'boolean'
    && (policy.mode === 'none' || policy.mode === 'recommend' || policy.mode === 'force')
    && typeof policy.latestBuildNumber === 'number'
    && typeof policy.minimumBuildNumber === 'number'
    && typeof policy.title === 'string'
    && typeof policy.message === 'string'
    && typeof policy.storeUrl === 'string'
  );
}

export function AppUpdateGate() {
  const [visibleUpdate, setVisibleUpdate] = useState<VisibleUpdate | null>(null);
  const [openingStore, setOpeningStore] = useState(false);
  const [storeError, setStoreError] = useState('');
  const requestInFlight = useRef(false);
  const mounted = useRef(true);

  const checkForUpdate = useCallback(async () => {
    if (Platform.OS === 'web' || requestInFlight.current) return;
    requestInFlight.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const response = await fetch(`${APP_WEB_ORIGIN}/api/app-update-policy?platform=${platform}`, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;
      const result = await response.json() as { policy?: unknown };
      if (!isValidPolicy(result.policy)) return;

      const policy = result.policy;
      const currentBuild = getCurrentBuildNumber();
      if (!policy.enabled || policy.mode === 'none' || currentBuild >= policy.latestBuildNumber) {
        if (mounted.current) setVisibleUpdate(null);
        return;
      }

      const force = currentBuild < policy.minimumBuildNumber || policy.mode === 'force';
      if (!force) {
        const dismissKey = `${DISMISS_KEY_PREFIX}:${policy.platform}:${policy.latestBuildNumber}`;
        const dismissedAt = Number(await AsyncStorage.getItem(dismissKey));
        const remindAfterMs = Math.max(1, policy.remindAfterHours || 24) * 60 * 60 * 1000;
        if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < remindAfterMs) {
          if (mounted.current) setVisibleUpdate(null);
          return;
        }
      }

      if (mounted.current) {
        setStoreError('');
        setVisibleUpdate({ policy, force });
      }
    } catch {
      // Update checks deliberately fail open so a server or network problem
      // never prevents the user from entering the app.
    } finally {
      clearTimeout(timeout);
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void checkForUpdate();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate();
    });
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [checkForUpdate]);

  const dismiss = async () => {
    if (!visibleUpdate || visibleUpdate.force) return;
    const { policy } = visibleUpdate;
    await AsyncStorage.setItem(
      `${DISMISS_KEY_PREFIX}:${policy.platform}:${policy.latestBuildNumber}`,
      String(Date.now())
    );
    setVisibleUpdate(null);
  };

  const openStore = async () => {
    if (!visibleUpdate || openingStore) return;
    setOpeningStore(true);
    setStoreError('');
    try {
      if (Platform.OS === 'android') {
        try {
          await Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`);
          return;
        } catch {
          // Fall back to the web Play Store URL below.
        }
      }
      await Linking.openURL(visibleUpdate.policy.storeUrl);
    } catch {
      setStoreError('스토어를 열지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (mounted.current) setOpeningStore(false);
    }
  };

  if (!visibleUpdate) return null;
  const { policy, force } = visibleUpdate;

  return (
    <Modal
      animationType="fade"
      transparent
      visible
      statusBarTranslucent
      onRequestClose={() => {
        if (!force) void dismiss();
      }}
    >
      <SafeAreaView style={styles.overlay} testID="app-update-modal">
        <View style={styles.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{policy.title}</Text>
          <Text style={styles.message}>{policy.message}</Text>
          {storeError ? <Text style={styles.error}>{storeError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={openingStore}
            onPress={() => void openStore()}
            style={({ pressed }) => [styles.updateButton, pressed && styles.pressed, openingStore && styles.disabled]}
            testID="app-update-open-store"
          >
            <Text style={styles.updateButtonText}>{openingStore ? '스토어 여는 중...' : '업데이트하기'}</Text>
          </Pressable>
          {!force ? (
            <Pressable accessibilityRole="button" onPress={() => void dismiss()} style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]} testID="app-update-dismiss">
              <Text style={styles.laterButtonText}>나중에</Text>
            </Pressable>
          ) : (
            <Text style={styles.forceHint}>업데이트 후 앱을 계속 이용할 수 있어요.</Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 16,
  },
  title: {
    color: '#1A1A1A',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    marginTop: 14,
    color: '#666B70',
    fontFamily: 'Pretendard-Regular',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  error: {
    marginTop: 12,
    color: '#B42318',
    fontFamily: 'Pretendard-Medium',
    fontSize: 13,
    lineHeight: 19,
  },
  updateButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Pretendard-Bold',
    fontSize: 16,
  },
  laterButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  laterButtonText: {
    color: '#747B82',
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 14,
  },
  forceHint: {
    marginTop: 14,
    color: '#92989E',
    fontFamily: 'Pretendard-Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
});
