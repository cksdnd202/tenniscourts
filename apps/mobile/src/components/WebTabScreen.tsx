import { type Href, useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import detailAlarmIcon from '@/assets/images/detail/icon_alarm_button.svg';
import { trackEvent, type AnalyticsParameters } from '@/lib/analytics';
import { BOTTOM_NAV_HEIGHT, type BottomTabKey, useAppBottomNavHidden } from '@/components/AppBottomNav';
import { DetailReminderSheet } from '@/components/DetailReminderSheet';
import { LocationPermissionDialog } from '@/components/LocationPermissionDialog';
import { NavigationArrow } from '@/components/NavigationArrow';
import { ErrorState, LoadingState } from '@/components/ScreenState';
import {
  getFreshLocationAsync,
  getRecentLocationAsync,
  hasMeaningfulLocationChange,
} from '@/lib/currentLocation';
import {
  fetchCurrentUserReminderMap,
  fetchNotificationCourt,
  type NotificationCourt,
} from '@/lib/courtNotifications';
import { signInWithKakao } from '@/lib/mobileAuth';
import { supabase } from '@/lib/supabase';
import { useMountedRef } from '@/lib/useMountedRef';
import { APP_WEB_ORIGIN } from '@/lib/webOrigin';

const DEFAULT_WEB_ORIGIN = APP_WEB_ORIGIN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_AUTH_STORAGE_KEY = SUPABASE_URL
  ? `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  : '';

function getCanonicalShareUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (!/^\/courts\/[^/?#]+\/?$/.test(url.pathname)) return rawUrl;
    return `https://courtskorea.com${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return rawUrl;
  }
}

type Props = {
  active: BottomTabKey;
  initialPath: string;
  showReminderAction?: boolean;
  reminderSlug?: string;
  showBottomNav?: boolean;
  hideCalendarActions?: boolean;
  showBackNavigation?: boolean;
  webOrigin?: string;
  showHomeLogoIntro?: boolean;
  lightChrome?: boolean;
};

export function WebTabScreen({
  active,
  initialPath,
  showReminderAction = false,
  reminderSlug,
  showBottomNav = false,
  hideCalendarActions = false,
  showBackNavigation = false,
  webOrigin,
  showHomeLogoIntro = false,
  lightChrome = false,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const webViewRef = useRef<WebView>(null);
  const webCanGoBackRef = useRef(false);
  const detailReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailReadyRef = useRef(false);
  const awaitingLocationSettingsRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [detailContentReady, setDetailContentReady] = useState(!showReminderAction);
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notificationCourt, setNotificationCourt] = useState<NotificationCourt | null>(null);
  const [reminders, setReminders] = useState<Record<string, number[]>>({});
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [webOverlayOpen, setWebOverlayOpen] = useState(false);
  const [locationDialogMode, setLocationDialogMode] = useState<'permission' | 'services'>('permission');
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const useLightSurface = lightChrome || showReminderAction;
  const disablePageZoom = showReminderAction || active === 'map';
  useAppBottomNavHidden(showBottomNav && webOverlayOpen);
  const resolvedWebOrigin = (webOrigin ?? DEFAULT_WEB_ORIGIN).replace(/\/$/, '');
  const rawPath = initialPath.startsWith('/') ? initialPath : `/${initialPath}`;
  const uri = `${resolvedWebOrigin}${rawPath}${showReminderAction ? `${rawPath.includes('?') ? '&' : '?'}app=1` : ''}`;

  const navigateBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const detailReadinessProbeScript = useMemo(() => `
    (function installDetailReadinessProbe() {
      var root = document.documentElement;
      if (!root) {
        window.setTimeout(installDetailReadinessProbe, 0);
        return;
      }
      var report = function () {
        var title = document.querySelector('main h1');
        var locationSection = document.querySelector('section[aria-label="위치 정보"]');
        var titleText = title && (title.textContent || '').trim();
        if (!title || !titleText || !locationSection) return false;
        window.__courtsKoreaDetailReadyReported = true;
        if (window.__courtsKoreaDetailReadinessObserver) {
          window.__courtsKoreaDetailReadinessObserver.disconnect();
        }
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'detail-ready' }));
        }
        return true;
      };
      if (!report() && !window.__courtsKoreaDetailReadinessObserver) {
        window.__courtsKoreaDetailReadinessObserver = new MutationObserver(report);
        window.__courtsKoreaDetailReadinessObserver.observe(root, { childList: true, subtree: true });
      }
    })();
    true;
  `, []);

  const bootstrapScript = useMemo(() => {
    const storageKey = JSON.stringify(SUPABASE_AUTH_STORAGE_KEY);
    const sessionValue = session ? JSON.stringify(JSON.stringify(session)) : 'null';
    return `
      (function () {
        var bootstrap = function () {
          try {
            var root = document.documentElement;
            if (!root) {
              window.setTimeout(bootstrap, 0);
              return;
            }
            root.setAttribute('data-courts-korea-app', 'true');
          ${showHomeLogoIntro
            ? "root.setAttribute('data-courts-korea-logo-intro', 'true');"
            : "root.removeAttribute('data-courts-korea-logo-intro');"}
          ${showReminderAction ? `
            root.style.setProperty('background-color', '#FFFFFF', 'important');
            root.style.setProperty('color-scheme', 'light', 'important');
            var installLightLoadingTheme = function () {
              if (document.body) {
                document.body.style.setProperty('background-color', '#FFFFFF', 'important');
                document.body.style.setProperty('color', '#303030', 'important');
              }
              var styleId = 'courts-korea-detail-loading-theme';
              if (!document.getElementById(styleId)) {
                var style = document.createElement('style');
                style.id = styleId;
                style.textContent = [
                  'html, body, #__next { background: #FFFFFF !important; color-scheme: light !important; }',
                  '[class*="animate-pulse"] [class*="bg-[#2"], [class*="animate-pulse"][class*="bg-[#2"] { background: #ECEEED !important; }',
                  '[class*="animate-pulse"] [class*="bg-[#1"], [class*="animate-pulse"][class*="bg-[#1"] { background: #F5F6F5 !important; }',
                  '[class*="animate-pulse"] [class*="border-[#"] { border-color: #E4E6E5 !important; }',
                  '[class*="fixed"][class*="bottom-0"][class*="z-20"] { display: none !important; }'
                ].join('');
                (document.head || document.documentElement).appendChild(style);
              }
            };
            installLightLoadingTheme();
            window.addEventListener('DOMContentLoaded', installLightLoadingTheme, { once: true });
            var viewport = document.querySelector('meta[name="viewport"]');
            if (!viewport) {
              viewport = document.createElement('meta');
              viewport.setAttribute('name', 'viewport');
              (document.head || document.documentElement).appendChild(viewport);
            }
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no');
            var reportDetailReady = function () {
              if (window.__courtsKoreaDetailReadyReported) return true;
              var title = document.querySelector('main h1');
              var locationSection = document.querySelector('section[aria-label="위치 정보"]');
              var titleText = title && (title.textContent || '').trim();
              if (!title || !titleText || !locationSection) return false;
              window.__courtsKoreaDetailReadyReported = true;
              if (window.__courtsKoreaDetailReadinessObserver) {
                window.__courtsKoreaDetailReadinessObserver.disconnect();
              }
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'detail-ready' }));
              }
              return true;
            };
            if (!reportDetailReady() && !window.__courtsKoreaDetailReadinessObserver) {
              window.__courtsKoreaDetailReadinessObserver = new MutationObserver(reportDetailReady);
              window.__courtsKoreaDetailReadinessObserver.observe(root, { childList: true, subtree: true });
              window.addEventListener('DOMContentLoaded', reportDetailReady, { once: true });
            }
          ` : ''}
          var key = ${storageKey};
          var value = ${sessionValue};
          if (key) {
            if (value) window.localStorage.setItem(key, value);
            else window.localStorage.removeItem(key);
          }
          } catch (error) {}
        };
        bootstrap();
      })();
      true;
    `;
  }, [session, showHomeLogoIntro, showReminderAction]);

  const authSyncScript = useMemo(() => {
    const storageKey = JSON.stringify(SUPABASE_AUTH_STORAGE_KEY);
    const sessionValue = session ? JSON.stringify(JSON.stringify(session)) : 'null';
    return `
      (function () {
        try {
          document.documentElement.setAttribute('data-courts-korea-app', 'true');
          ${showHomeLogoIntro
            ? "document.documentElement.setAttribute('data-courts-korea-logo-intro', 'true');"
            : "document.documentElement.removeAttribute('data-courts-korea-logo-intro');"}
          var key = ${storageKey};
          var value = ${sessionValue};
          if (!window.__courtsKoreaAuthBridgeInstalled) {
            window.__courtsKoreaAuthBridgeInstalled = true;
            var originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);
            window.localStorage.removeItem = function (storageKey) {
              originalRemoveItem(storageKey);
              if (storageKey === key && window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth-sign-out' }));
              }
            };
          }
          if (!window.__courtsKoreaNavigationBridgeInstalled) {
            window.__courtsKoreaNavigationBridgeInstalled = true;
            var lastReportedUrl = window.location.href;
            var reportRoute = function () {
              var nextUrl = window.location.href;
              if (nextUrl === lastReportedUrl) return;
              lastReportedUrl = nextUrl;
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'route-change',
                  url: nextUrl
                }));
              }
            };
            var originalPushState = window.history.pushState.bind(window.history);
            var originalReplaceState = window.history.replaceState.bind(window.history);
            window.history.pushState = function () {
              var result = originalPushState.apply(window.history, arguments);
              setTimeout(reportRoute, 0);
              return result;
            };
            window.history.replaceState = function () {
              var result = originalReplaceState.apply(window.history, arguments);
              setTimeout(reportRoute, 0);
              return result;
            };
            window.addEventListener('popstate', reportRoute);
          }
          var applyAppAppearance = function () {
            ${showReminderAction ? `
              var viewport = document.querySelector('meta[name="viewport"]');
              if (!viewport) {
                viewport = document.createElement('meta');
                viewport.setAttribute('name', 'viewport');
                (document.head || document.documentElement).appendChild(viewport);
              }
              viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no');
              document.documentElement.style.touchAction = 'pan-x pan-y';
            ` : ''}
            var nativeChromeStyleId = 'courts-korea-native-chrome';
            if (!document.getElementById(nativeChromeStyleId)) {
              var nativeChromeStyle = document.createElement('style');
              nativeChromeStyle.id = nativeChromeStyleId;
              nativeChromeStyle.textContent = 'button[aria-label="메뉴 열기"] { display: none !important; }';
              (document.head || document.documentElement).appendChild(nativeChromeStyle);
            }
            ${active === 'map' ? `
              var mapCompactStyleId = 'courts-korea-native-map-compact';
              if (!document.getElementById(mapCompactStyleId)) {
                var mapCompactStyle = document.createElement('style');
                mapCompactStyle.id = mapCompactStyleId;
                mapCompactStyle.textContent = [
                  'html[data-courts-korea-app="true"] article.map-test-scrollbar.fixed { max-height: 54dvh !important; padding: 14px !important; }',
                  'html[data-courts-korea-app="true"] article.map-test-scrollbar.fixed > section { margin-top: 14px !important; padding-top: 14px !important; }',
                  'html[data-courts-korea-app="true"] article.map-test-scrollbar.fixed > p { margin-top: 10px !important; }',
                  'html[data-courts-korea-app="true"] article.map-test-scrollbar.fixed > div[class*="mt-"] { margin-top: 10px !important; }',
                  'html[data-courts-korea-app="true"] article.map-test-scrollbar.fixed button[aria-label="공유하기"] svg { width: 20px !important; height: 20px !important; }'
                ].join('');
                (document.head || document.documentElement).appendChild(mapCompactStyle);
              }
              if (!window.__courtsKoreaNativeCourtLinkBridgeInstalled) {
                window.__courtsKoreaNativeCourtLinkBridgeInstalled = true;
                document.addEventListener('click', function (event) {
                  var target = event.target;
                  var link = target && target.closest ? target.closest('a[href]') : null;
                  if (!link) return;
                  try {
                    var nextUrl = new URL(link.href, window.location.href);
                    var panel = link.closest('article.map-test-scrollbar.fixed');
                    var section = link.closest('section');
                    var sectionTitle = section && section.querySelector('h3');
                    var isBlogReviewLink = Boolean(
                      panel &&
                      section &&
                      sectionTitle &&
                      (sectionTitle.textContent || '').trim().indexOf('방문 후기') !== -1
                    );
                    if (
                      isBlogReviewLink &&
                      (nextUrl.protocol === 'http:' || nextUrl.protocol === 'https:')
                    ) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'open-external',
                          url: nextUrl.toString()
                        }));
                      }
                      return;
                    }
                    var courtPathParts = nextUrl.pathname.split('/').filter(Boolean);
                    if (nextUrl.origin !== window.location.origin || courtPathParts.length !== 2 || courtPathParts[0] !== 'courts') return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'native-route-request',
                        url: nextUrl.toString()
                      }));
                    }
                  } catch (error) {}
                }, true);
              }
              document.querySelectorAll('article.map-test-scrollbar.fixed button[aria-label="공유하기"]').forEach(function (button) {
                if (!button.querySelector('[data-courts-korea-share-icon="true"]')) {
                  button.innerHTML = '<svg data-courts-korea-share-icon="true" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.58268 12.9167C5.47435 12.9167 6.26602 12.5 6.80768 11.8667L12.5327 15.0917C12.5243 15.2 12.4993 15.3083 12.4993 15.4167C12.4993 17.025 13.8077 18.3333 15.416 18.3333C17.0243 18.3333 18.3327 17.025 18.3327 15.4167C18.3327 13.8083 17.0243 12.5 15.416 12.5C14.5243 12.5 13.7327 12.9167 13.191 13.55L7.46602 10.325C7.47435 10.2167 7.49935 10.1083 7.49935 9.99999C7.49935 9.89166 7.48268 9.78332 7.46602 9.67499L13.191 6.44999C13.7243 7.08332 14.516 7.49999 15.416 7.49999C17.0243 7.49999 18.3327 6.19166 18.3327 4.58332C18.3327 2.97499 17.0243 1.66666 15.416 1.66666C13.8077 1.66666 12.4993 2.97499 12.4993 4.58332C12.4993 4.69166 12.516 4.79999 12.5327 4.90832L6.80768 8.13332C6.53646 7.8059 6.19655 7.54212 5.81205 7.36067C5.42755 7.17922 5.00785 7.08454 4.58268 7.08332C2.97435 7.08332 1.66602 8.39166 1.66602 9.99999C1.66602 11.6083 2.97435 12.9167 4.58268 12.9167ZM15.416 14.1667C16.1077 14.1667 16.666 14.725 16.666 15.4167C16.666 16.1083 16.1077 16.6667 15.416 16.6667C14.7243 16.6667 14.166 16.1083 14.166 15.4167C14.166 14.725 14.7243 14.1667 15.416 14.1667ZM15.416 3.33332C16.1077 3.33332 16.666 3.89166 16.666 4.58332C16.666 5.27499 16.1077 5.83332 15.416 5.83332C14.7243 5.83332 14.166 5.27499 14.166 4.58332C14.166 3.89166 14.7243 3.33332 15.416 3.33332ZM4.58268 8.74999C5.27435 8.74999 5.83268 9.30832 5.83268 9.99999C5.83268 10.6917 5.27435 11.25 4.58268 11.25C3.89102 11.25 3.33268 10.6917 3.33268 9.99999C3.33268 9.30832 3.89102 8.74999 4.58268 8.74999Z" fill="#707070"/></svg>';
                }
                if (button.getAttribute('data-courts-korea-native-share-bound') === 'true') return;
                button.setAttribute('data-courts-korea-native-share-bound', 'true');
                button.addEventListener('click', function (event) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  var panel = button.closest('article.map-test-scrollbar.fixed');
                  var detailLink = panel && panel.querySelector('a[href*="/courts/"]');
                  var title = panel && panel.querySelector('h2');
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'native-share',
                      title: title ? (title.textContent || '').trim() : 'Courts Korea',
                      url: detailLink ? detailLink.href : window.location.href
                    }));
                  }
                }, true);
              });
              if (!window.__courtsKoreaCenterSelectedMarkerOnce) {
                window.__courtsKoreaCenterSelectedMarkerOnce = function () {
                  var panel = document.querySelector('article.map-test-scrollbar.fixed');
                  var marker = document.querySelector('.map-test-marker-selected');
                  var backButton = document.querySelector('button[aria-label="뒤로가기"]');
                  if (!panel || !marker || !backButton) return;
                  if (marker.getAttribute('data-courts-korea-centered') === 'true') return;
                  var panelRect = panel.getBoundingClientRect();
                  var headerRect = (backButton.closest('header') || backButton).getBoundingClientRect();
                  var markerRect = marker.getBoundingClientRect();
                  var availableTop = Math.max(0, headerRect.bottom);
                  var desiredCenterY = availableTop + Math.max(0, panelRect.top - availableTop) / 2;
                  var currentCenterY = markerRect.top + markerRect.height / 2;
                  var offset = Math.max(-220, Math.min(220, desiredCenterY - currentCenterY));
                  marker.setAttribute('data-courts-korea-centered', 'true');
                  marker.style.transform = 'translateY(' + offset + 'px) scale(1.12)';
                };
              }
              window.clearTimeout(window.__courtsKoreaCenterSelectedMarkerTimer);
              window.__courtsKoreaCenterSelectedMarkerTimer = window.setTimeout(
                window.__courtsKoreaCenterSelectedMarkerOnce,
                260
              );
            ` : ''}
            ${showBackNavigation ? `
              document.querySelectorAll('header button[aria-label="홈으로 이동"], header a[aria-label="Courts Korea 메인으로 이동"]').forEach(function (button) {
                if (button.getAttribute('data-courts-korea-native-back') === 'true') return;
                button.setAttribute('data-courts-korea-native-back', 'true');
                button.setAttribute('aria-label', '뒤로가기');
                button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 19L8.5 12.5L15 6" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                button.style.cssText = 'display:flex;align-items:center;justify-content:center;width:36px;height:36px;color:currentColor;';
                button.addEventListener('click', function (event) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'native-back-unhandled' }));
                }, true);
              });
            ` : ''}
            ${showReminderAction ? `
              var detailMain = document.querySelector('main');
              var detailBookingSection = document.querySelector('section[aria-label="예약 오픈 정보"]');
              if (detailMain && detailBookingSection) {
                detailMain.setAttribute('data-detail-page', 'true');
                var detailHeader = document.querySelector('header');
                if (detailHeader) detailHeader.setAttribute('data-courts-korea-header', 'true');

                var detailColumn = detailMain.querySelector(':scope > div > div > div:first-child');
                var detailHero = detailColumn && detailColumn.firstElementChild;
                if (detailHero) {
                  detailHero.setAttribute('data-detail-hero', 'true');
                  var detailTitle = detailHero.querySelector('h1');
                  if (detailTitle) detailTitle.setAttribute('data-detail-title', 'true');
                  var detailActions = detailHero.querySelector(':scope > div:last-child');
                  if (detailActions) detailActions.setAttribute('data-detail-actions', 'true');
                }

                detailBookingSection.setAttribute('data-detail-booking', 'true');
                var detailBookingRules = detailBookingSection.querySelector('[data-detail-booking-rules="true"]');
                if (detailBookingRules) {
                  detailBookingRules.setAttribute('data-detail-booking-rules', 'true');
                  detailBookingRules.querySelectorAll('.snap-start').forEach(function (card) {
                    card.setAttribute('data-detail-booking-rule-card', 'true');
                  });
                }

                var detailLocation = document.querySelector('section[aria-label="위치 정보"]');
                if (detailLocation) {
                  detailLocation.setAttribute('data-detail-location', 'true');
                  var detailAddress = detailLocation.querySelector('[data-detail-address="true"]');
                  if (detailAddress) detailAddress.setAttribute('data-detail-address', 'true');
                  var detailLinks = Array.from(detailLocation.querySelectorAll('a'));
                  var detailNearbyLink = detailLinks.find(function (link) {
                    return (link.getAttribute('aria-label') || '').indexOf('근처 테니스장') !== -1;
                  });
                  var detailMapLink = detailLinks.find(function (link) {
                    return link !== detailNearbyLink && (link.textContent || '').indexOf('지도에서 보기') !== -1;
                  });
                  if (detailNearbyLink) detailNearbyLink.setAttribute('data-detail-nearby', 'true');
                  if (detailMapLink) detailMapLink.setAttribute('data-detail-map-link', 'true');
                }

                var detailFees = document.querySelector('section[aria-label="이용요금 정보"]');
                if (detailFees) detailFees.setAttribute('data-detail-fees', 'true');

                var detailSections = Array.from(detailMain.querySelectorAll('section'));
                var findDetailSection = function (heading) {
                  return detailSections.find(function (section) {
                    var title = section.querySelector(':scope > h2');
                    return title && (title.textContent || '').trim() === heading;
                  });
                };
                var detailCourtTypes = findDetailSection('코트 종류') || findDetailSection('바닥 종류');
                if (detailCourtTypes) {
                  detailCourtTypes.setAttribute('data-detail-court-types', 'true');
                  var detailCourtTypesTitle = detailCourtTypes.querySelector(':scope > h2');
                  var isLegacyTennisSurfaceTable = detailCourtTypesTitle && (detailCourtTypesTitle.textContent || '').trim() === '코트 종류';
                  var detailCourtTable = detailCourtTypes.querySelector('table');
                  if (detailCourtTable) {
                    detailCourtTable.setAttribute('data-detail-court-table', 'true');
                    if (!detailCourtTable.parentElement?.hasAttribute('data-detail-court-table-frame')) {
                      var detailCourtFrame = document.createElement('div');
                      detailCourtFrame.setAttribute('data-detail-court-table-frame', 'true');
                      detailCourtTable.parentNode.insertBefore(detailCourtFrame, detailCourtTable);
                      detailCourtFrame.appendChild(detailCourtTable);
                    }
                    if (isLegacyTennisSurfaceTable) {
                      ['하드', '잔디', '클레이'].forEach(function (surface, index) {
                        var cell = detailCourtTable.querySelector('tbody tr:nth-child(' + (index + 1) + ') td:first-child');
                        if (!cell) return;
                        var renderedSurfaceLabel = cell.querySelector('[data-court-surface-label="true"]');
                        var hasVisibleSurfaceText = (cell.textContent || '').trim().length > 0;
                        cell.removeAttribute('data-court-surface');
                        if (!renderedSurfaceLabel && !hasVisibleSurfaceText) {
                          cell.setAttribute('data-court-surface', surface);
                        }
                      });
                    }
                  }
                }
                var detailReviews = findDetailSection('방문 후기') || findDetailSection('후기');
                if (detailReviews) {
                  detailReviews.setAttribute('data-detail-reviews', 'true');
                  var detailReviewsTitle = detailReviews.querySelector(':scope > h2');
                  if (detailReviewsTitle && (detailReviewsTitle.textContent || '').trim() !== '후기') {
                    detailReviewsTitle.textContent = '후기';
                  }
                }
                document.querySelectorAll('[data-detail-reviews="true"] a[href], [data-detail-instagram-banner="true"] a[href]').forEach(function (link) {
                  if (link.getAttribute('data-courts-korea-native-external') === 'true') return;
                  link.setAttribute('data-courts-korea-native-external', 'true');
                  link.addEventListener('click', function (event) {
                    var href = link.href;
                    if (!href || !window.ReactNativeWebView) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'open-external',
                      url: href
                    }));
                  }, true);
                });
                var detailExtra = findDetailSection('부가 정보');
                if (detailExtra) detailExtra.setAttribute('data-detail-extra', 'true');
                var detailRelated = findDetailSection('근처 테니스장');
                if (detailRelated) detailRelated.setAttribute('data-detail-related', 'true');

                document.querySelectorAll('[class*="fixed"][class*="bottom-0"]').forEach(function (element) {
                  var elementText = (element.textContent || '').replace(/\\s+/g, ' ').trim();
                  if (elementText.indexOf('예약하러가기') !== -1 && elementText.indexOf('캘린더 등록하기') !== -1) {
                    element.setAttribute('data-courts-korea-mobile-book-bar', 'true');
                  }
                });
              }

              var detailReadyTitle = document.querySelector('main h1');
              var detailReadyLocation = document.querySelector('section[aria-label="위치 정보"]');
              if (detailReadyTitle && detailReadyLocation && !window.__courtsKoreaDetailReadyReported) {
                window.__courtsKoreaDetailReadyReported = true;
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'detail-ready' }));
                }
                if (window.__courtsKoreaAppearanceObserver) {
                  window.__courtsKoreaAppearanceObserver.disconnect();
                }
              }

              var detailLightStyleId = 'courts-korea-native-detail-light';
              if (!document.getElementById(detailLightStyleId)) {
                var detailLightStyle = document.createElement('style');
                detailLightStyle.id = detailLightStyleId;
                detailLightStyle.textContent = [
                  'html[data-courts-korea-app="true"], html[data-courts-korea-app="true"] body { background: #FFFFFF !important; color: #303030 !important; font-family: Pretendard, sans-serif !important; }',
                  'html[data-courts-korea-app="true"] [data-courts-korea-header="true"] { height: 72px !important; background: #FFFFFF !important; border: 0 !important; }',
                  'html[data-courts-korea-app="true"] [data-courts-korea-header="true"] > div { height: 72px !important; padding-left: 12px !important; padding-right: 12px !important; }',
                  'html[data-courts-korea-app="true"] [data-courts-korea-header="true"] button[aria-label="코트 검색 열기"], html[data-courts-korea-app="true"] [data-courts-korea-header="true"] button[aria-label="메뉴 열기"] { display: none !important; }',
                  'html[data-courts-korea-app="true"] main[data-detail-page="true"] { min-height: 100vh !important; padding-top: 72px !important; padding-bottom: 28px !important; background: #FFFFFF !important; color: #303030 !important; }',
                  'html[data-courts-korea-app="true"] main[data-detail-page="true"] > div { width: 100% !important; max-width: none !important; padding: 28px 16px 16px !important; }',
                  'html[data-courts-korea-app="true"] main[data-detail-page="true"] > div > div { display: block !important; }',
                  'html[data-courts-korea-app="true"] main[data-detail-page="true"] > div > div > div:first-child { display: flex !important; flex-direction: column !important; gap: 0 !important; }',
                  'html[data-courts-korea-app="true"] main[data-detail-page="true"] > div > div > div:last-child { display: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-hero="true"] { align-items: flex-start !important; gap: 12px !important; margin-bottom: 20px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-hero="true"] > div:first-child { min-width: 0 !important; flex: 1 1 auto !important; flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-title="true"] { max-width: calc(100vw - 150px) !important; overflow-wrap: normal !important; word-break: keep-all !important; font-size: 22px !important; line-height: 30px !important; letter-spacing: -0.02em !important; font-weight: 700 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-title="true"] + span { padding: 0 !important; background: transparent !important; color: #9A9A9A !important; font-size: 13px !important; line-height: 20px !important; font-weight: 400 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-actions="true"] { align-self: flex-start !important; gap: 8px !important; margin-top: 0 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-actions="true"] button { width: 40px !important; height: 40px !important; border-radius: 9px !important; background: #F4F4F4 !important; color: #707070 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking="true"] { margin-top: 0 !important; margin-bottom: 20px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking="true"] > h2, html[data-courts-korea-app="true"] [data-detail-booking-rules="true"] > h2 { display: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking-rules="true"] > div { gap: 10px !important; padding: 0 0 2px !important; scroll-snap-type: x mandatory !important; }',
                  'html[data-courts-korea-app="true"] button[aria-label="이전 예약 오픈 정보 보기"], html[data-courts-korea-app="true"] button[aria-label="다음 예약 오픈 정보 보기"] { border: 1px solid #E5E5E5 !important; background: rgba(255,255,255,0.96) !important; color: #707070 !important; box-shadow: 0 3px 10px rgba(0,0,0,0.10) !important; }',
                  'html[data-courts-korea-app="true"] button[aria-label="이전 예약 오픈 정보 보기"]:disabled, html[data-courts-korea-app="true"] button[aria-label="다음 예약 오픈 정보 보기"]:disabled { opacity: 0.28 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking-rule-card="true"] { min-height: 114px !important; gap: 14px !important; padding: 15px 16px !important; border: 1px solid #E7E7E7 !important; border-radius: 12px !important; background: #FFFFFF !important; box-shadow: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking-rule-card="true"]:not(:only-child) { width: 84% !important; max-width: 84% !important; flex: 0 0 84% !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking-rule-card="true"] p:first-child { font-size: 13px !important; line-height: 20px !important; font-weight: 600 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-auth-badge="true"] { display: flex !important; align-items: center !important; gap: 6px !important; color: #282828 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-auth-badge="true"] img { display: block !important; width: auto !important; height: 24px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-auth-badge="true"] svg { display: block !important; width: auto !important; height: 24px !important; flex: 0 0 auto !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-auth-extra="true"] { color: #777777 !important; font-size: 12px !important; font-weight: 500 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking-rule-card="true"] p[class*="mt-2"] { margin-top: 6px !important; color: #9A9A9A !important; font-size: 12px !important; line-height: 18px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-booking-rule-card="true"] > p:last-child { margin-top: auto !important; color: #303030 !important; font-size: 16px !important; line-height: 23px !important; font-weight: 700 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-location="true"], html[data-courts-korea-app="true"] [data-detail-fees="true"], html[data-courts-korea-app="true"] [data-detail-court-types="true"], html[data-courts-korea-app="true"] [data-detail-amenities="true"], html[data-courts-korea-app="true"] [data-detail-review-links="true"], html[data-courts-korea-app="true"] [data-detail-reviews="true"], html[data-courts-korea-app="true"] [data-detail-related="true"], html[data-courts-korea-app="true"] [data-detail-extra="true"] { margin: 0 -16px !important; padding: 24px 16px !important; border: 0 !important; border-top: 8px solid #F6F6F6 !important; background: #FFFFFF !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-address="true"] { display: flex !important; flex-direction: column !important; gap: 14px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-address="true"] > div { width: 100% !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-map-link="true"] { display: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-map="true"] { padding: 0 !important; border: 0 !important; border-radius: 8px !important; background: #D9D9D9 !important; box-shadow: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-map="true"] > div, html[data-courts-korea-app="true"] [data-detail-map="true"] > div > div:first-child { min-height: 240px !important; height: 240px !important; border-radius: 8px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-nearby="true"] { width: 100% !important; height: 48px !important; align-self: stretch !important; border: 0 !important; border-radius: 0 !important; background: #FFFFFF !important; color: #707070 !important; font-size: 14px !important; font-weight: 600 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-nearby="true"] svg { display: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-nearby="true"]::after { content: "›"; margin-left: 8px; font-size: 24px; font-weight: 300; }',
                  'html[data-courts-korea-app="true"] [data-detail-location="true"] > h2, html[data-courts-korea-app="true"] [data-detail-fees="true"] h2, html[data-courts-korea-app="true"] [data-detail-court-types="true"] h2, html[data-courts-korea-app="true"] [data-detail-amenities="true"] h2, html[data-courts-korea-app="true"] [data-detail-reviews="true"] h2, html[data-courts-korea-app="true"] [data-detail-related="true"] h2, html[data-courts-korea-app="true"] [data-detail-extra="true"] h2 { color: #303030 !important; font-size: 22px !important; line-height: 30px !important; font-weight: 700 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-types="true"]::before, html[data-courts-korea-app="true"] [data-detail-court-types="true"]::after, html[data-courts-korea-app="true"] [data-detail-amenities="true"]::before, html[data-courts-korea-app="true"] [data-detail-amenities="true"]::after { display: none !important; content: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-types="true"] > hr, html[data-courts-korea-app="true"] [data-detail-amenities="true"] > hr { display: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-amenities-heading="true"] { margin-bottom: 28px !important; padding-right: 104px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-amenities-report="true"] { color: #777777 !important; font-size: 13px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-amenities-checked-date="true"] { color: #858585 !important; font-size: 12px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-amenities-icon="true"] { filter: invert(1) !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-amenities-label="true"] { color: #303030 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-fees="true"] article, html[data-courts-korea-app="true"] [data-detail-reviews="true"] a, html[data-courts-korea-app="true"] [data-detail-related="true"] a, html[data-courts-korea-app="true"] [data-detail-extra="true"] > div { border-color: #DEDEDE !important; border-radius: 8px !important; box-shadow: none !important; background: #FFFFFF !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-fees="true"] article header { height: auto !important; min-height: 58px !important; background: #FAFAFA !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table-frame="true"] { overflow: hidden !important; border: 1px solid #DEDEDE !important; border-radius: 8px !important; background: #FFFFFF !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] { width: 100% !important; table-layout: fixed !important; border: 0 !important; border-collapse: separate !important; border-spacing: 0 !important; color: #303030 !important; background: #FFFFFF !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] th { height: 28px !important; background: #F4F4F4 !important; color: #777777 !important; font-size: 11px !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] th:first-child, html[data-courts-korea-app="true"] [data-detail-court-table="true"] td:first-child { display: table-cell !important; width: 50% !important; min-width: 0 !important; background: #F4F4F4 !important; vertical-align: middle !important; white-space: nowrap !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] th:nth-child(2), html[data-courts-korea-app="true"] [data-detail-court-table="true"] td:nth-child(2), html[data-courts-korea-app="true"] [data-detail-court-table="true"] th:nth-child(3), html[data-courts-korea-app="true"] [data-detail-court-table="true"] td:nth-child(3) { width: 25% !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] tbody td:not(:first-child) { background: #FFFFFF !important; color: #777777 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] th, html[data-courts-korea-app="true"] [data-detail-court-table="true"] td { height: 32px !important; border: 0 !important; border-right: 1px solid #E8E8E8 !important; border-bottom: 1px solid #E8E8E8 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] tr > *:last-child { border-right: 0 !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-court-table="true"] tbody tr:last-child td { border-bottom: 0 !important; }',
                  'html[data-courts-korea-app="true"] [data-court-surface] { display: table-cell !important; color: #777777 !important; font-size: 12px !important; text-align: center !important; vertical-align: middle !important; white-space: nowrap !important; }',
                  'html[data-courts-korea-app="true"] [data-court-surface] > div { display: inline-flex !important; align-items: center !important; justify-content: center !important; vertical-align: middle !important; }',
                  'html[data-courts-korea-app="true"] [data-court-surface] img { width: auto !important; height: 14px !important; }',
                  'html[data-courts-korea-app="true"] [data-court-surface]::after { content: attr(data-court-surface); margin-left: 5px !important; vertical-align: middle !important; white-space: nowrap !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-instagram-banner="true"] > a { border: 1px solid #E3E5E8 !important; background: #FFFFFF !important; box-shadow: none !important; }',
                  'html[data-courts-korea-app="true"] [data-instagram-banner-title="true"] { color: #303030 !important; }',
                  'html[data-courts-korea-app="true"] [data-instagram-banner-subtitle="true"] { color: #777777 !important; }',
                  'html[data-courts-korea-app="true"] [data-instagram-banner-action="true"] { border: 1px solid #E5E7EB !important; background: #F7F8F9 !important; box-shadow: none !important; }',
                  'html[data-courts-korea-app="true"] [data-detail-extra="true"] > div { min-height: 0 !important; padding: 16px !important; background: #F8F8F8 !important; line-height: 1.65 !important; }',
                  'html[data-courts-korea-app="true"] [data-courts-korea-mobile-book-bar="true"] { display: none !important; }',
                  'html[data-courts-korea-app="true"] [class*="fixed"][class*="bottom-0"][class*="z-20"] { display: none !important; }',
                  'html[data-courts-korea-app="true"] [class*="text-white"] { color: #282828 !important; }',
                  'html[data-courts-korea-app="true"] [class*="text-[#B0B0B0]"] { color: #777777 !important; }',
                  'html[data-courts-korea-app="true"] [class*="text-[#8A8F98]"] { color: #777777 !important; }',
                  'html[data-courts-korea-app="true"] [class*="text-[#C9C9CE]"] { color: #505050 !important; }',
                  'html[data-courts-korea-app="true"] [class*="text-[#8F8F95]"] { color: #858585 !important; }',
                  'html[data-courts-korea-app="true"] [class*="bg-[#1A1A1B]"], html[data-courts-korea-app="true"] [class*="bg-[#18181A]"], html[data-courts-korea-app="true"] [class*="bg-[#191B1E]"] { background: #FFFFFF !important; }',
                  'html[data-courts-korea-app="true"] [class*="bg-[#202023]"], html[data-courts-korea-app="true"] [class*="bg-[#242426]"], html[data-courts-korea-app="true"] [class*="bg-[#2C2C2C]"], html[data-courts-korea-app="true"] [class*="bg-[#2B2B2F]"] { background: #F5F6F5 !important; }',
                  'html[data-courts-korea-app="true"] [class*="bg-[#333333]"], html[data-courts-korea-app="true"] [class*="bg-[#252525]"] { background: #ECEEED !important; }',
                  'html[data-courts-korea-app="true"] [class*="bg-[#0D0D0F]"] { background: #EEF0EF !important; }',
                  'html[data-courts-korea-app="true"] [class*="border-[#242426]"], html[data-courts-korea-app="true"] [class*="border-[#2C2C2C]"], html[data-courts-korea-app="true"] [class*="border-[#303033]"], html[data-courts-korea-app="true"] [class*="border-[#343438]"], html[data-courts-korea-app="true"] [class*="border-[#3C3C3C]"] { border-color: #E4E6E5 !important; }',
                  'html[data-courts-korea-app="true"] [class*="bg-[#2C8B56]"][class*="text-white"] { color: #FFFFFF !important; }',
                  'html[data-courts-korea-app="true"] table { color: #282828 !important; }'
                ].join('');
                (document.head || document.documentElement).appendChild(detailLightStyle);
              }
              document.querySelectorAll('header button[aria-label="홈으로 이동"]').forEach(function (button) {
                if (button.getAttribute('data-courts-korea-native-back') === 'true') return;
                button.setAttribute('data-courts-korea-native-back', 'true');
                button.setAttribute('aria-label', '뒤로가기');
                button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 19L8.5 12.5L15 6" stroke="#1A1A1A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                button.style.cssText = 'display:flex;align-items:center;justify-content:center;width:36px;height:36px;color:#1A1A1A;';
                button.addEventListener('click', function (event) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'native-back-unhandled' }));
                }, true);
              });
              document.querySelectorAll('button[aria-label="공유하기"]').forEach(function (button) {
                if (button.getAttribute('data-courts-korea-native-share-bound') === 'true') return;
                button.setAttribute('data-courts-korea-native-share-bound', 'true');
                button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.58268 12.9167C5.47435 12.9167 6.26602 12.5 6.80768 11.8667L12.5327 15.0917C12.5243 15.2 12.4993 15.3083 12.4993 15.4167C12.4993 17.025 13.8077 18.3333 15.416 18.3333C17.0243 18.3333 18.3327 17.025 18.3327 15.4167C18.3327 13.8083 17.0243 12.5 15.416 12.5C14.5243 12.5 13.7327 12.9167 13.191 13.55L7.46602 10.325C7.47435 10.2167 7.49935 10.1083 7.49935 9.99999C7.49935 9.89166 7.48268 9.78332 7.46602 9.67499L13.191 6.44999C13.7243 7.08332 14.516 7.49999 15.416 7.49999C17.0243 7.49999 18.3327 6.19166 18.3327 4.58332C18.3327 2.97499 17.0243 1.66666 15.416 1.66666C13.8077 1.66666 12.4993 2.97499 12.4993 4.58332C12.4993 4.69166 12.516 4.79999 12.5327 4.90832L6.80768 8.13332C6.53646 7.8059 6.19655 7.54212 5.81205 7.36067C5.42755 7.17922 5.00785 7.08454 4.58268 7.08332C2.97435 7.08332 1.66602 8.39166 1.66602 9.99999C1.66602 11.6083 2.97435 12.9167 4.58268 12.9167ZM15.416 14.1667C16.1077 14.1667 16.666 14.725 16.666 15.4167C16.666 16.1083 16.1077 16.6667 15.416 16.6667C14.7243 16.6667 14.166 16.1083 14.166 15.4167C14.166 14.725 14.7243 14.1667 15.416 14.1667ZM15.416 3.33332C16.1077 3.33332 16.666 3.89166 16.666 4.58332C16.666 5.27499 16.1077 5.83332 15.416 5.83332C14.7243 5.83332 14.166 5.27499 14.166 4.58332C14.166 3.89166 14.7243 3.33332 15.416 3.33332ZM4.58268 8.74999C5.27435 8.74999 5.83268 9.30832 5.83268 9.99999C5.83268 10.6917 5.27435 11.25 4.58268 11.25C3.89102 11.25 3.33268 10.6917 3.33268 9.99999C3.33268 9.30832 3.89102 8.74999 4.58268 8.74999Z" fill="#707070"/></svg>';
                button.addEventListener('click', function (event) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'native-share',
                    title: document.querySelector('h1')?.textContent?.trim() || 'Courts Korea',
                    url: window.location.href
                  }));
                }, true);
              });
              document.querySelectorAll('[data-detail-booking-rule-card="true"] p:first-child, [data-detail-auth-label="true"]').forEach(function (target) {
                if (!target || target.getAttribute('data-detail-auth-badge') === 'true') return;
                var text = (target.textContent || '').trim();
                var match = [
                  { names: ['전체', '누구나'], svg: '<svg width="50" height="24" viewBox="0 0 50 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="24" rx="8" fill="#EEEEEE"/><path d="M17.8008 10.2334V11.5283H9.65039V7.13574H11.2754V10.2334H17.8008ZM8.34277 14.1689V12.8486H18.918V14.1689H14.3857V18.168H12.7607V14.1689H8.34277ZM28.8838 7.28809V8.3291C28.8774 9.4082 28.8774 10.5825 28.5854 12.2012H30.1152V13.5088H25.6084V18.1807H23.9834V13.5088H19.5781V12.2012H26.9414C27.2397 10.7158 27.2651 9.57959 27.2715 8.58301H20.7842V7.28809H28.8838ZM41.5664 10.9951V12.3154H39.9287V18.1426H38.3037V6.61523H39.9287V10.9951H41.5664ZM31.1816 15.3242V7.71973H32.7939V13.9849C34.2729 13.9595 35.8599 13.8198 37.5293 13.4834L37.6943 14.8291C35.7583 15.2227 33.8857 15.3242 32.1846 15.3242H31.1816Z" fill="#3A3A3A"/></svg>' },
                  { names: ['구민'], svg: '<svg width="39" height="24" viewBox="0 0 39 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="39" height="24" rx="8" fill="#EAF8F2"/><path d="M17.6484 7.28809V8.3291C17.6421 9.4082 17.6421 10.5825 17.3501 12.2012H18.8799V13.5088H14.373V18.1807H12.748V13.5088H8.34277V12.2012H15.7061C16.0044 10.7158 16.0298 9.57959 16.0361 8.58301H9.54883V7.28809H17.6484ZM25.8115 7.54199V13.1152H20.1621V7.54199H25.8115ZM21.5078 17.9141V14.0801H23.1455V16.6064H29.5566V17.9141H21.5078ZM21.7617 11.833H24.1992V8.82422H21.7617V11.833ZM27.627 14.8418V6.62793H29.252V14.8418H27.627Z" fill="#30C27C"/></svg>' },
                  { names: ['시민'], svg: '<svg width="39" height="24" viewBox="0 0 39 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="39" height="24" rx="8" fill="#FDEDE1"/><path d="M12.8369 9.23047C12.8306 11.3506 13.7954 13.4771 15.7568 14.3086L14.8047 15.6035C13.4844 15.0068 12.5703 13.8516 12.0435 12.4233C11.5229 13.9849 10.5771 15.2417 9.16797 15.8828L8.19043 14.5371C10.209 13.6865 11.1929 11.4712 11.1992 9.23047V7.50391H12.8369V9.23047ZM16.3789 18.1934V6.61523H18.0166V18.1934H16.3789ZM25.8115 7.54199V13.1152H20.1621V7.54199H25.8115ZM21.5078 17.9141V14.0801H23.1455V16.6064H29.5566V17.9141H21.5078ZM21.7617 11.833H24.1992V8.82422H21.7617V11.833ZM27.627 14.8418V6.62793H29.252V14.8418H27.627Z" fill="#F07A2B"/></svg>' },
                  { names: ['주민'], svg: '<svg width="39" height="24" viewBox="0 0 39 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="39" height="24" rx="8" fill="#E5F0FD"/><path d="M18.8799 12.9883V14.2832H14.3857V18.168H12.7861V14.2832H8.34277V12.9883H18.8799ZM8.86328 11.0459C11.1992 10.7603 12.4941 9.63037 12.6655 8.49414H9.29492V7.22461H17.9404V8.49414H14.5698C14.7349 9.63037 16.0107 10.7603 18.3848 11.0459L17.8008 12.3154C15.7695 12.0425 14.3159 11.1792 13.6177 9.99219C12.9131 11.1792 11.4722 12.0425 9.45996 12.3154L8.86328 11.0459ZM25.8115 7.54199V13.1152H20.1621V7.54199H25.8115ZM21.5078 17.9141V14.0801H23.1455V16.6064H29.5566V17.9141H21.5078ZM21.7617 11.833H24.1992V8.82422H21.7617V11.833ZM27.627 14.8418V6.62793H29.252V14.8418H27.627Z" fill="#2080EE"/></svg>' }
                ].find(function (item) { return item.names.some(function (name) { return text === name || text.indexOf(name + ' ·') === 0; }); });
                if (!match) return;
                var matchedName = match.names.find(function (name) { return text === name || text.indexOf(name + ' ·') === 0; }) || '';
                var extra = text.slice(matchedName.length).replace(/^\\s*·\\s*/, '').trim();
                var badgeAsset = {
                  '전체': '/icon/auth_everyone.svg',
                  '누구나': '/icon/auth_everyone.svg',
                  '구민': '/icon/auth_gu.svg',
                  '시민': '/icon/auth_citizen.svg',
                  '주민': '/icon/auth_ju.svg'
                }[matchedName];
                target.setAttribute('data-detail-auth-badge', 'true');
                target.setAttribute('aria-label', matchedName + (extra ? ' ' + extra : ''));
                target.textContent = '';
                if (badgeAsset) {
                  var badgeImage = document.createElement('img');
                  badgeImage.src = badgeAsset;
                  badgeImage.alt = '';
                  badgeImage.setAttribute('aria-hidden', 'true');
                  target.appendChild(badgeImage);
                } else {
                  target.innerHTML = match.svg;
                }
                if (extra) {
                  var extraLabel = document.createElement('span');
                  extraLabel.setAttribute('data-detail-auth-extra', 'true');
                  extraLabel.textContent = extra;
                  target.appendChild(extraLabel);
                }
              });
              window.__courtsKoreaPositionNearbyAction = function () {
                var detailLocation = document.querySelector('[data-detail-location="true"]');
                var detailNearby = document.querySelector('[data-detail-nearby="true"]');
                var detailMap = detailLocation && detailLocation.querySelector('[data-detail-map="true"]');
                if (!detailLocation || !detailNearby || !detailMap || !detailMap.parentElement) return;
                if (detailMap.nextElementSibling !== detailNearby) {
                  detailMap.parentElement.insertBefore(detailNearby, detailMap.nextElementSibling);
                }
              };
              window.__courtsKoreaPositionNearbyAction();
              [80, 260, 700, 1400].forEach(function (delay) {
                window.setTimeout(window.__courtsKoreaPositionNearbyAction, delay);
              });
            ` : ''}
          };
          applyAppAppearance();
          window.addEventListener('DOMContentLoaded', applyAppAppearance, { once: true });
          if (
            !window.__courtsKoreaAppearanceObserver
            && document.documentElement
            && !(${showReminderAction ? 'true' : 'false'} && window.__courtsKoreaDetailReadyReported)
          ) {
            window.__courtsKoreaAppearanceObserver = new MutationObserver(function () {
              if (window.__courtsKoreaAppearanceTimer) return;
              window.__courtsKoreaAppearanceTimer = window.setTimeout(function () {
                window.__courtsKoreaAppearanceTimer = null;
                applyAppAppearance();
              }, 80);
            });
            window.__courtsKoreaAppearanceObserver.observe(document.documentElement, { childList: true, subtree: true });
          }
          if (${hideCalendarActions ? 'true' : 'false'}) {
            var calendarStyleId = 'courts-korea-native-hide-calendar';
            var applyCalendarStyle = function () {
              if (document.getElementById(calendarStyleId)) return;
              var calendarStyleRoot = document.head || document.documentElement;
              if (!calendarStyleRoot) return;
              var calendarStyle = document.createElement('style');
              calendarStyle.id = calendarStyleId;
              calendarStyle.textContent = '[data-gtm^="calendar_register"] { display: none !important; }';
              calendarStyleRoot.appendChild(calendarStyle);
            };
            applyCalendarStyle();
            window.addEventListener('DOMContentLoaded', applyCalendarStyle, { once: true });

          }
          if (key) {
            if (value) window.localStorage.setItem(key, value);
            else window.localStorage.removeItem(key);
          }
        } catch (error) {}
      })();
      true;
    `;
  }, [active, hideCalendarActions, session, showBackNavigation, showHomeLogoIntro, showReminderAction]);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const syncReminderStateToWeb = useCallback((enabled: boolean) => {
    void enabled;
  }, []);

  useFocusEffect(useCallback(() => {
    let activeFocus = true;

    const loadReminderState = async () => {
      if (!showReminderAction || !reminderSlug) {
        if (activeFocus) {
          setReminderEnabled(false);
          setNotificationCourt(null);
          setReminders({});
          syncReminderStateToWeb(false);
        }
        return;
      }

      try {
        const court = await fetchNotificationCourt(reminderSlug);
        const reminderMap = session ? await fetchCurrentUserReminderMap() : {};
        const enabled = court.rules.some((rule) => (reminderMap[rule.id] ?? []).length > 0);
        if (activeFocus) {
          setNotificationCourt(court);
          setReminders(reminderMap);
          setReminderEnabled(enabled);
          syncReminderStateToWeb(enabled);
        }
      } catch {
        if (activeFocus) {
          setReminderEnabled(false);
          setNotificationCourt(null);
          setReminders({});
          syncReminderStateToWeb(false);
        }
      }
    };

    void loadReminderState();
    return () => { activeFocus = false; };
  }, [reminderSlug, session, showReminderAction, syncReminderStateToWeb]));

  const syncSessionToWeb = useCallback((nextSession: Session | null, reload = false) => {
    const storageKey = JSON.stringify(SUPABASE_AUTH_STORAGE_KEY);
    const sessionValue = nextSession ? JSON.stringify(JSON.stringify(nextSession)) : 'null';
    webViewRef.current?.injectJavaScript(`
      (function () {
        try {
          var key = ${storageKey};
          var value = ${sessionValue};
          if (key) {
            if (value) window.localStorage.setItem(key, value);
            else window.localStorage.removeItem(key);
          }
          ${reload ? 'window.location.reload();' : ''}
        } catch (error) {}
      })();
      true;
    `);
  }, []);

  const startNativeLogin = useCallback(async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const nextSession = await signInWithKakao();
      if (!nextSession || !mountedRef.current) return;
      trackEvent('login_completed', { login_method: 'kakao', source: 'webview' });
      setSession(nextSession);
      syncSessionToWeb(nextSession, true);
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert(
          '로그인하지 못했습니다',
          cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.'
        );
      }
    } finally {
      if (mountedRef.current) setSigningIn(false);
    }
  }, [mountedRef, signingIn, syncSessionToWeb]);

  const handleAppRoute = useCallback((url: string) => {
    if (!url.startsWith(resolvedWebOrigin)) return false;

    const parsed = new URL(url);
    const courtMatch = parsed.pathname.match(/^\/courts\/([^/]+)\/?$/);
    if (courtMatch) {
      const nextSlug = decodeURIComponent(courtMatch[1]);
      if (!(showReminderAction && nextSlug === reminderSlug)) {
        router.push(`/courts/${encodeURIComponent(nextSlug)}` as Href);
        return true;
      }
      return false;
    }

    if (parsed.pathname === '/map' && active !== 'map') {
      router.replace(`/map${parsed.search}` as Href);
      return true;
    }

    if (parsed.pathname === '/mypage' && !initialPath.startsWith('/mypage')) {
      router.push(`/mypage${parsed.search}` as Href);
      return true;
    }

    if (parsed.pathname === '/' && active !== 'search') {
      router.replace('/');
      return true;
    }

    return false;
  }, [active, initialPath, reminderSlug, resolvedWebOrigin, router, showReminderAction]);

  const sendLocationResultToWeb = useCallback((payload: {
    accuracy?: number | null;
    latitude?: number;
    longitude?: number;
    message?: string;
    status: 'success' | 'error';
  }) => {
    const detail = JSON.stringify(payload);
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new CustomEvent('courtskorea:native-location-result', { detail: ${detail} }));
      true;
    `);
  }, []);

  const requestNativeCurrentLocation = useCallback(async ({ requestPermission = true } = {}) => {
    if (active !== 'map') return;
    setLocationBusy(true);

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted && requestPermission && permission.canAskAgain !== false) {
        trackEvent('location_permission_requested', { source: 'map_current_location' });
        permission = await Location.requestForegroundPermissionsAsync();
        trackEvent(permission.granted ? 'location_permission_granted' : 'location_permission_denied', {
          source: 'map_current_location',
        });
      }

      if (!permission.granted) {
        if (mountedRef.current) {
          setLocationDialogMode('permission');
          setLocationDialogOpen(true);
        }
        sendLocationResultToWeb({ status: 'error', message: '위치 권한을 허용해주세요.' });
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (mountedRef.current) {
          setLocationDialogMode('services');
          setLocationDialogOpen(true);
        }
        sendLocationResultToWeb({ status: 'error', message: '휴대폰 위치 서비스를 켜주세요.' });
        return;
      }

      const recentLocation = await getRecentLocationAsync();
      if (recentLocation) {
        if (mountedRef.current) {
          setLocationDialogOpen(false);
          setLocationBusy(false);
        }
        sendLocationResultToWeb({
          status: 'success',
          latitude: recentLocation.coords.latitude,
          longitude: recentLocation.coords.longitude,
          accuracy: recentLocation.coords.accuracy,
        });
        trackEvent('current_location_cache_used', { source: 'map_current_location' });
      }

      try {
        const freshLocation = await getFreshLocationAsync();
        if (!recentLocation || hasMeaningfulLocationChange(recentLocation, freshLocation)) {
          sendLocationResultToWeb({
            status: 'success',
            latitude: freshLocation.coords.latitude,
            longitude: freshLocation.coords.longitude,
            accuracy: freshLocation.coords.accuracy,
          });
        }
        if (mountedRef.current) setLocationDialogOpen(false);
        trackEvent('current_location_success', {
          source: 'map_current_location',
          location_source: recentLocation ? 'background_refresh' : 'fresh',
        });
      } catch (cause) {
        if (recentLocation) {
          trackEvent('current_location_refresh_failed', {
            source: 'map_current_location',
            reason: cause instanceof Error ? cause.message : 'unknown',
          });
          return;
        }
        throw cause;
      }
    } catch (cause) {
      const message = cause instanceof Error && cause.message === 'location-timeout'
        ? '현재 위치 확인이 지연되고 있어요. 다시 시도해주세요.'
        : '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해주세요.';
      sendLocationResultToWeb({ status: 'error', message });
      trackEvent('current_location_failed', {
        source: 'map_current_location',
        reason: cause instanceof Error ? cause.message : 'unknown',
      });
    } finally {
      if (mountedRef.current) setLocationBusy(false);
    }
  }, [active, mountedRef, sendLocationResultToWeb]);

  const openLocationSettings = useCallback(async () => {
    if (locationBusy) return;
    setLocationBusy(true);

    try {
      if (locationDialogMode === 'services' && Platform.OS === 'android') {
        await Location.enableNetworkProviderAsync();
        setLocationBusy(false);
        await requestNativeCurrentLocation({ requestPermission: false });
        return;
      }

      awaitingLocationSettingsRef.current = true;
      trackEvent('location_settings_opened', {
        source: 'map_current_location',
        setting_type: locationDialogMode,
      });
      await Linking.openSettings();
    } catch {
      awaitingLocationSettingsRef.current = false;
      setLocationBusy(false);
    }
  }, [locationBusy, locationDialogMode, requestNativeCurrentLocation]);

  useEffect(() => {
    if (active !== 'map') return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !awaitingLocationSettingsRef.current) return;
      awaitingLocationSettingsRef.current = false;
      setLocationBusy(false);
      void requestNativeCurrentLocation({ requestPermission: false });
    });

    return () => subscription.remove();
  }, [active, requestNativeCurrentLocation]);

  const openExternalUrl = useCallback(async (rawUrl: string) => {
    try {
      const externalUrl = new URL(rawUrl);
      if (externalUrl.protocol !== 'http:' && externalUrl.protocol !== 'https:') return;

      const isInstagram = externalUrl.hostname === 'instagram.com'
        || externalUrl.hostname.endsWith('.instagram.com');
      if (isInstagram) {
        try {
          // Android App Link가 연결돼 있으면 Instagram 앱으로, 없으면 기본 브라우저로 열린다.
          await Linking.openURL(externalUrl.toString());
        } catch {
          await WebBrowser.openBrowserAsync(externalUrl.toString());
        }
        return;
      }

      await WebBrowser.openBrowserAsync(externalUrl.toString());
    } catch {
      Alert.alert('링크를 열지 못했습니다', '잠시 후 다시 시도해 주세요.');
    }
  }, []);

  const handleWebMessage = useCallback(async (message: string) => {
    try {
      const payload = JSON.parse(message) as {
        type?: string;
        url?: string;
        slug?: string;
        title?: string;
        visible?: boolean;
        offset?: number;
        found?: boolean;
        eventName?: string;
        properties?: AnalyticsParameters;
      };
      if (payload.type === 'analytics' && payload.eventName) {
        trackEvent(payload.eventName, {
          ...payload.properties,
          source: 'app_webview',
        });
        return;
      }
      if (payload.type === 'route-change' && payload.url) {
        const handled = handleAppRoute(payload.url);
        if (handled) {
          const parsed = new URL(payload.url);
          if (parsed.pathname.startsWith('/courts/') || parsed.pathname === '/mypage') {
            setTimeout(() => webViewRef.current?.goBack(), 0);
          }
        }
        return;
      }
      if (payload.type === 'native-route-request' && payload.url) {
        handleAppRoute(payload.url);
        return;
      }
      if (payload.type === 'current-location-request' && active === 'map') {
        void requestNativeCurrentLocation();
        return;
      }
      if (payload.type === 'detail-ready') {
        if (detailReadyRef.current) return;
        // 상세 데이터가 준비된 시점과 화이트 앱 스타일이 실제로 그려진 시점은 다르다.
        // 스타일 적용 후 두 프레임을 기다린 뒤에만 네이티브 로딩 화면을 걷어낸다.
        webViewRef.current?.injectJavaScript(`
          ${authSyncScript}
          (function reportDetailAppearanceReady() {
            window.requestAnimationFrame(function () {
              window.requestAnimationFrame(function () {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'detail-appearance-ready' }));
                }
              });
            });
          })();
          true;
        `);
        return;
      }
      if (payload.type === 'detail-appearance-ready') {
        detailReadyRef.current = true;
        if (detailReadyTimeoutRef.current) {
          clearTimeout(detailReadyTimeoutRef.current);
          detailReadyTimeoutRef.current = null;
        }
        if (mountedRef.current) {
          setFailed(false);
          setDetailContentReady(true);
          setLoading(false);
        }
        return;
      }
      if (payload.type === 'auth-sign-out') {
        const { data } = await supabase.auth.getSession();
        if (data.session) await supabase.auth.signOut();
        if (mountedRef.current) setSession(null);
        return;
      }
      if (payload.type === 'open-reminder' && (payload.slug || reminderSlug)) {
        const slug = payload.slug || reminderSlug;
        router.push(`/notification-manage?court=${encodeURIComponent(slug!)}` as Href);
        return;
      }
      if (payload.type === 'native-share' && payload.url) {
        const shareUrl = getCanonicalShareUrl(payload.url);
        await Share.share({ message: shareUrl, url: shareUrl, title: payload.title || 'Courts Korea' });
        return;
      }
      if (payload.type === 'open-external' && payload.url) {
        await openExternalUrl(payload.url);
        return;
      }
      if (payload.type === 'filter-visibility') {
        setWebOverlayOpen(Boolean(payload.visible));
        return;
      }
      if (payload.type === 'native-back-unhandled') {
        if (showReminderAction || showBackNavigation) {
          navigateBack();
        } else if (active === 'map') {
          if (webCanGoBackRef.current) webViewRef.current?.goBack();
          else navigateBack();
        } else if (initialPath !== '/') {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        } else {
          BackHandler.exitApp();
        }
      }
    } catch {
      // Ignore messages that are not part of the app bridge.
    }
  }, [active, authSyncScript, handleAppRoute, initialPath, mountedRef, navigateBack, openExternalUrl, reminderSlug, requestNativeCurrentLocation, router, showBackNavigation, showReminderAction]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showReminderAction || showBackNavigation) {
        navigateBack();
        return true;
      }

      // Map panels own the first back step, before WebView or native history.
      if (active !== 'map' && webCanGoBackRef.current) {
        webViewRef.current?.goBack();
        return true;
      }

      webViewRef.current?.injectJavaScript(`
        (function () {
          var event = new CustomEvent('courtskorea:native-back', { cancelable: true });
          var handled = !window.dispatchEvent(event);
          if (!handled && window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'native-back-unhandled' }));
          }
        })();
        true;
      `);
      return true;
    });

    return () => subscription.remove();
  }, [active, navigateBack, showBackNavigation, showReminderAction]);

  useEffect(() => () => {
    if (detailReadyTimeoutRef.current) clearTimeout(detailReadyTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!showReminderAction || !authReady || detailReadyRef.current || detailReadyTimeoutRef.current) return;

    detailReadyTimeoutRef.current = setTimeout(() => {
      detailReadyTimeoutRef.current = null;
      if (!mountedRef.current || detailReadyRef.current) return;
      setDetailContentReady(false);
      setLoading(false);
      setFailed(true);
    }, 35000);

    return () => {
      if (detailReadyTimeoutRef.current) {
        clearTimeout(detailReadyTimeoutRef.current);
        detailReadyTimeoutRef.current = null;
      }
    };
  }, [authReady, mountedRef, showReminderAction, uri]);

  const handleInternalRoute = (url: string) => {
    if (
      SUPABASE_URL &&
      url.startsWith(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/authorize`)
    ) {
      void startNativeLogin();
      return false;
    }

    try {
      const parsedUrl = new URL(url);
      const isExternalHttpUrl = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')
        && parsedUrl.origin !== resolvedWebOrigin;
      if (isExternalHttpUrl) {
        void openExternalUrl(parsedUrl.toString());
        return false;
      }
    } catch {
      // WebView 내부의 about:blank 등 URL이 아닌 요청은 기존 처리로 넘긴다.
    }

    return !handleAppRoute(url);
  };

  const openReservationSite = async () => {
    const rawUrl = notificationCourt?.bookingSiteLink?.trim()
      || notificationCourt?.rules.find((rule) => rule.reservation_url?.trim())?.reservation_url?.trim();
    if (!rawUrl) return;
    const url = /^(https?:\/\/|tel:)/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      trackEvent('booking_button_clicked', {
        court_id: notificationCourt?.id,
        source: 'court_detail',
      });
      if (url.startsWith('tel:')) await Linking.openURL(url);
      else await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('예약 사이트를 열지 못했습니다', '잠시 후 다시 시도해 주세요.');
    }
  };

  const hasReminderRules = Boolean(notificationCourt?.rules.length);
  const hasReservationLink = Boolean(
    notificationCourt?.bookingSiteLink?.trim()
    || notificationCourt?.rules.some((rule) => rule.reservation_url?.trim())
  );

  return (
    <SafeAreaView style={[styles.safeArea, useLightSurface && styles.lightBackground]} edges={showBottomNav ? ['top'] : ['top', 'bottom']}>
      <View
        style={[
          styles.webWrap,
          useLightSurface && styles.lightBackground,
          showBottomNav && !webOverlayOpen && { marginBottom: BOTTOM_NAV_HEIGHT + insets.bottom },
          showBottomNav && webOverlayOpen && { marginBottom: insets.bottom },
        ]}>
        {authReady ? (
          <WebView
            ref={webViewRef}
            source={{ uri }}
            applicationNameForUserAgent="CourtsKoreaApp/1.0"
            style={[styles.webView, useLightSurface && styles.lightBackground]}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled={!showReminderAction}
            cacheMode={showReminderAction ? 'LOAD_NO_CACHE' : 'LOAD_DEFAULT'}
            scalesPageToFit={!disablePageZoom}
            setBuiltInZoomControls={!disablePageZoom}
            setDisplayZoomControls={false}
            textZoom={100}
            setSupportMultipleWindows={false}
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            injectedJavaScriptBeforeContentLoaded={bootstrapScript}
            injectedJavaScript={authSyncScript}
            onLoadStart={() => {
              if (showReminderAction) {
                detailReadyRef.current = false;
                setDetailContentReady(false);
                setLoading(true);
              } else if (!detailReadyRef.current) {
                setLoading(true);
              }
              setFailed(false);
            }}
            onLoadEnd={() => {
              syncSessionToWeb(session);
              syncReminderStateToWeb(reminderEnabled);
              if (showReminderAction) {
                // Next.js의 문서 로드가 끝나도 상세 데이터가 아직 스켈레톤일 수 있다.
                // 실제 상세 DOM을 확인한 detail-ready 메시지만 로딩 완료로 인정한다.
                if (!detailReadyRef.current) {
                  webViewRef.current?.injectJavaScript(detailReadinessProbeScript);
                }
              } else {
                detailReadyRef.current = true;
                if (detailReadyTimeoutRef.current) {
                  clearTimeout(detailReadyTimeoutRef.current);
                  detailReadyTimeoutRef.current = null;
                }
                setFailed(false);
                setLoading(false);
              }
            }}
            onLoadProgress={() => {
              if (showReminderAction && !detailReadyRef.current) {
                webViewRef.current?.injectJavaScript(detailReadinessProbeScript);
              }
            }}
            onError={() => {
              if (detailReadyTimeoutRef.current) {
                clearTimeout(detailReadyTimeoutRef.current);
                detailReadyTimeoutRef.current = null;
              }
              setDetailContentReady(false);
              setLoading(false);
              setFailed(true);
            }}
            onMessage={(event) => void handleWebMessage(event.nativeEvent.data)}
            onNavigationStateChange={(navigationState) => {
              webCanGoBackRef.current = navigationState.canGoBack;
            }}
            onShouldStartLoadWithRequest={(request) => handleInternalRoute(request.url)}
          />
        ) : null}

        {loading || signingIn ? (
          <LoadingState
            style={[styles.loadingOverlay, useLightSurface && styles.lightBackground]}
            tone={useLightSurface ? 'light' : 'dark'}
          />
        ) : null}

        {failed ? (
          <ErrorState
            description="인터넷 연결을 확인하고 다시 시도해 주세요."
            onAction={() => webViewRef.current?.reload()}
            style={[styles.errorOverlay, useLightSurface && styles.lightBackground]}
            title={active === 'map' ? '지도를 불러오지 못했어요' : '페이지를 불러오지 못했어요'}
            tone={useLightSurface ? 'light' : 'dark'}
          />
        ) : null}

        {showBackNavigation && !webOverlayOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={8}
            onPress={navigateBack}
            style={({ pressed }) => [styles.detailBackButton, pressed && styles.pressed]}>
            <NavigationArrow direction="left" />
          </Pressable>
        ) : null}

      </View>

      {showReminderAction && detailContentReady && !loading && !signingIn && !failed && !webOverlayOpen ? (
        <View style={styles.detailActionBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="예약 알림 신청"
            disabled={!hasReminderRules}
            onPress={() => {
              trackEvent('reminder_sheet_opened', {
                court_id: notificationCourt?.id,
                rule_count: notificationCourt?.rules.length ?? 0,
              });
              setReminderSheetOpen(true);
            }}
            style={({ pressed }) => [
              styles.detailActionButton,
              styles.reminderActionButton,
              !hasReminderRules && styles.detailActionDisabled,
              pressed && styles.pressed,
            ]}>
            <Image
              source={detailAlarmIcon}
              contentFit="contain"
              style={[styles.actionAlarmIcon, !hasReminderRules && styles.actionAlarmIconDisabled]}
            />
            <Text style={[styles.reminderActionText, !hasReminderRules && styles.disabledActionText]}>
              {hasReminderRules ? '예약알림 신청' : '준비중'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            disabled={!hasReservationLink}
            onPress={() => void openReservationSite()}
            style={({ pressed }) => [
              styles.detailActionButton,
              styles.reserveActionButton,
              !hasReservationLink && styles.detailActionDisabled,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.reserveActionText, !hasReservationLink && styles.disabledActionText]}>예약하러가기</Text>
          </Pressable>
        </View>
      ) : null}

      {showReminderAction && notificationCourt ? (
        <DetailReminderSheet
          court={notificationCourt}
          reminders={reminders}
          session={session}
          visible={reminderSheetOpen}
          onClose={() => setReminderSheetOpen(false)}
          onRemindersChange={(next) => {
            setReminders(next);
            setReminderEnabled(notificationCourt.rules.some((rule) => (next[rule.id] ?? []).length > 0));
          }}
        />
      ) : null}

      {active === 'map' ? (
        <LocationPermissionDialog
          busy={locationBusy}
          mode={locationDialogMode}
          visible={locationDialogOpen}
          onCancel={() => {
            awaitingLocationSettingsRef.current = false;
            setLocationBusy(false);
            setLocationDialogOpen(false);
          }}
          onConfirm={openLocationSettings}
        />
      ) : null}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  webWrap: { flex: 1, backgroundColor: '#000000' },
  webView: { flex: 1, backgroundColor: '#000000' },
  lightBackground: { backgroundColor: '#FFFFFF' },
  lightText: { color: '#303030' },
  lightMutedText: { color: '#8A8A8A' },
  detailBackButton: {
    position: 'absolute',
    top: 14,
    left: 12,
    zIndex: 40,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000',
  },
  errorOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#000000',
  },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Pretendard-ExtraBold' },
  errorDescription: { marginTop: 8, color: '#8A8F98', fontSize: 13 },
  retryButton: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: '#2F9461' },
  retryText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Pretendard-ExtraBold' },
  detailActionBar: { minHeight: 76, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#ECECEC', flexDirection: 'row', gap: 10, backgroundColor: '#FFFFFF' },
  detailActionButton: { flex: 1, minHeight: 52, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  reminderActionButton: { backgroundColor: '#30C27C' },
  reserveActionButton: { backgroundColor: '#303030' },
  detailActionDisabled: { backgroundColor: '#D8D8D8' },
  reminderActionText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Bold' },
  reserveActionText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Bold' },
  disabledActionText: { color: '#9A9A9A' },
  actionAlarmIcon: { width: 20, height: 20 },
  actionAlarmIconDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.76 },
});
