import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { hasCurrentLegalConsent, saveCurrentLegalConsent } from '@/lib/legalConsent';
import { supabase } from '@/lib/supabase';

const ONBOARDING_STORAGE_PREFIX = 'courtskorea:onboarding-completed';
const NOTIFICATION_INTRO_STORAGE_PREFIX = 'courtskorea:notification-intro-completed';

type AuthFlowValue = {
  initialized: boolean;
  session: Session | null;
  legalConsentCompleted: boolean;
  onboardingCompleted: boolean;
  notificationIntroCompleted: boolean;
  locationIntroCompleted: boolean;
  completeLegalConsent: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  completeNotificationIntro: () => Promise<void>;
};

const AuthFlowContext = createContext<AuthFlowValue | null>(null);

function onboardingStorageKey(userId: string) {
  return `${ONBOARDING_STORAGE_PREFIX}:${userId}`;
}

function notificationIntroStorageKey(userId: string) {
  return `${NOTIFICATION_INTRO_STORAGE_PREFIX}:${userId}`;
}



export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const syncId = useRef(0);
  const sessionRef = useRef<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [legalConsentCompleted, setLegalConsentCompleted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [notificationIntroCompleted, setNotificationIntroCompleted] = useState(false);
  // Retained for existing routing/analytics consumers; location onboarding is retired.
  const locationIntroCompleted = true;

  useEffect(() => {
    let mounted = true;

    const syncSession = async (nextSession: Session | null) => {
      const currentSyncId = ++syncId.current;
      let consentCompleted = false;
      let completed = false;
      let notificationCompleted = false;
      if (nextSession) {
        try {
          const [nextConsentCompleted, onboardingValue, notificationIntroValue] = await Promise.all([
            hasCurrentLegalConsent(nextSession.user.id).catch(() => false),
            AsyncStorage.getItem(onboardingStorageKey(nextSession.user.id)),
            AsyncStorage.getItem(notificationIntroStorageKey(nextSession.user.id)),
          ]);
          consentCompleted = nextConsentCompleted;
          completed = onboardingValue === 'true';
          notificationCompleted = notificationIntroValue === 'true';
        } catch {
          // A damaged or unavailable preference must not discard a valid login.
          // The gated screens can retry their own writes without losing the session.
          consentCompleted = false;
          completed = false;
          notificationCompleted = false;
        }
      }
      if (!mounted || currentSyncId !== syncId.current) return;
      sessionRef.current = nextSession;
      setSession(nextSession);
      setLegalConsentCompleted(consentCompleted);
      setOnboardingCompleted(completed);
      setNotificationIntroCompleted(notificationCompleted);
      setInitialized(true);
    };

    void supabase.auth.getSession()
      .then(({ data }) => syncSession(data.session))
      .catch(() => syncSession(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      mounted = false;
      syncId.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const completeLegalConsent = async () => {
    const activeSession = sessionRef.current ?? session;
    if (!activeSession) throw new Error('로그인 세션을 확인하지 못했습니다.');
    await saveCurrentLegalConsent(activeSession.user.id);
    if (sessionRef.current?.user.id !== activeSession.user.id) return;
    setLegalConsentCompleted(true);
  };

  const completeOnboarding = async () => {
    const activeSession = sessionRef.current ?? session;
    if (!activeSession) throw new Error('로그인 세션을 확인하지 못했습니다.');
    await AsyncStorage.setItem(onboardingStorageKey(activeSession.user.id), 'true');
    if (sessionRef.current?.user.id !== activeSession.user.id) return;
    setOnboardingCompleted(true);
  };

  const completeNotificationIntro = async () => {
    const activeSession = sessionRef.current ?? session;
    if (!activeSession) throw new Error('로그인 세션을 확인하지 못했습니다.');
    await AsyncStorage.setItem(notificationIntroStorageKey(activeSession.user.id), 'true');
    if (sessionRef.current?.user.id !== activeSession.user.id) return;
    setNotificationIntroCompleted(true);
  };


  return (
    <AuthFlowContext.Provider value={{
      initialized,
      session,
      legalConsentCompleted,
      onboardingCompleted,
      notificationIntroCompleted,
      locationIntroCompleted,
      completeLegalConsent,
      completeOnboarding,
      completeNotificationIntro,
    }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow() {
  const value = useContext(AuthFlowContext);
  if (!value) throw new Error('useAuthFlow는 AuthFlowProvider 안에서 사용해야 합니다.');
  return value;
}
