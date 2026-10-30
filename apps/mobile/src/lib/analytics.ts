import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
  setUserId,
  setUserProperties,
} from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type AnalyticsParameter = string | number | boolean | null | undefined | readonly unknown[];
export type AnalyticsParameters = Record<string, AnalyticsParameter>;

const EVENT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const PARAMETER_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const PRIVATE_PARAMETER_NAMES = new Set([
  'email',
  'phone',
  'nickname',
  'query',
  'search_text',
  'url',
  'href',
  '$current_url',
]);

const analyticsEnvironment =
  process.env.EXPO_PUBLIC_ANALYTICS_ENV?.trim() || (__DEV__ ? 'development' : 'production');
const analyticsEnabledSetting = process.env.EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED?.trim().toLowerCase();
const analyticsCollectionEnabled = analyticsEnabledSetting === 'true';

let analyticsConfiguration: Promise<boolean> | null = null;

const commonParameters = {
  surface: 'app',
  platform: Platform.OS,
  app_version: Constants.expoConfig?.version ?? 'unknown',
  build_number: String(
    Platform.OS === 'android'
      ? Constants.expoConfig?.android?.versionCode ?? 'unknown'
      : Constants.expoConfig?.ios?.buildNumber ?? 'unknown'
  ),
  environment: analyticsEnvironment,
};

function configureAnalytics() {
  if (Platform.OS === 'web') return Promise.resolve(false);
  if (analyticsConfiguration) return analyticsConfiguration;

  analyticsConfiguration = (async () => {
    const analytics = getAnalytics();
    await setAnalyticsCollectionEnabled(analytics, analyticsCollectionEnabled);
    if (!analyticsCollectionEnabled) await setUserId(analytics, null);
    return analyticsCollectionEnabled;
  })().catch((cause) => {
    analyticsConfiguration = null;
    reportDevelopmentError('configure', cause);
    return false;
  });

  return analyticsConfiguration;
}
function runWithAnalytics(
  action: string,
  callback: (analytics: ReturnType<typeof getAnalytics>) => Promise<void>
) {
  if (Platform.OS === 'web') return;
  void configureAnalytics()
    .then((enabled) => {
      if (!enabled) return;
      return callback(getAnalytics());
    })
    .catch((cause) => reportDevelopmentError(action, cause));
}

function normalizeValue(value: AnalyticsParameter): string | number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    return value
      .filter((item) => ['string', 'number', 'boolean'].includes(typeof item))
      .map(String)
      .join(',')
      .slice(0, 100);
  }
  return String(value).slice(0, 100);
}

function sanitizeParameters(parameters: AnalyticsParameters = {}) {
  return Object.entries({ ...commonParameters, ...parameters }).reduce<Record<string, string | number>>(
    (result, [key, value]) => {
      if (!PARAMETER_NAME_PATTERN.test(key) || PRIVATE_PARAMETER_NAMES.has(key.toLowerCase())) return result;
      const normalized = normalizeValue(value);
      if (normalized !== undefined) result[key] = normalized;
      return result;
    },
    {}
  );
}

function reportDevelopmentError(action: string, cause: unknown) {
  if (__DEV__) console.warn(`[analytics] ${action} failed`, cause);
}

export function trackEvent(eventName: string, parameters: AnalyticsParameters = {}) {
  if (Platform.OS === 'web' || !EVENT_NAME_PATTERN.test(eventName)) return;
  runWithAnalytics(eventName, async (analytics) => {
    logEvent(analytics, eventName, sanitizeParameters(parameters));
  });
}
export function trackScreen(screenName: string) {
  if (Platform.OS === 'web') return;
  const safeName = screenName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 100) || 'unknown';
  runWithAnalytics(`screen:${safeName}`, (analytics) =>
    logScreenView(analytics, {
      screen_name: safeName,
      screen_class: safeName,
    })
  );
}

export function identifyAnalyticsUser(userId: string | null) {
  if (Platform.OS === 'web') return;
  runWithAnalytics('identify_user', async (analytics) => {
    await setUserId(analytics, userId);
    if (userId) {
      await setUserProperties(analytics, {
        login_method: 'kakao',
        app_surface: 'native',
        analytics_environment: analyticsEnvironment,
      });
    }
  });
}

