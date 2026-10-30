import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

const AUTH_REDIRECT_URL = 'courtskorea://auth/callback';

WebBrowser.maybeCompleteAuthSession();

let kakaoSignInPromise: ReturnType<typeof runKakaoSignIn> | null = null;
let authCallbackPromise: Promise<Session> | null = null;

function readAuthParams(url: string) {
  const parsedUrl = new URL(url);
  const query = new URLSearchParams(parsedUrl.search);
  const fragment = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  return {
    accessToken: query.get('access_token') ?? fragment.get('access_token'),
    refreshToken: query.get('refresh_token') ?? fragment.get('refresh_token'),
    errorDescription:
      query.get('error_description') ?? fragment.get('error_description') ?? query.get('error'),
  };
}

export function completeAuthSessionFromUrl(url: string) {
  if (authCallbackPromise) return authCallbackPromise;

  authCallbackPromise = (async () => {
    const { accessToken, refreshToken, errorDescription } = readAuthParams(url);
    if (errorDescription) throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
    if (!accessToken || !refreshToken) {
      throw new Error('로그인 결과에서 사용자 세션을 확인하지 못했습니다.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) throw sessionError;
    if (!sessionData.session) throw new Error('로그인 세션을 저장하지 못했습니다.');
    return sessionData.session;
  })().finally(() => {
    authCallbackPromise = null;
  });

  return authCallbackPromise;
}

async function runKakaoSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('카카오 로그인 주소를 만들지 못했습니다.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT_URL);
  if (result.type !== 'success') {
    if (result.type === 'cancel' || result.type === 'dismiss') return null;
    throw new Error('카카오 로그인을 완료하지 못했습니다.');
  }

  return completeAuthSessionFromUrl(result.url);
}

export function signInWithKakao() {
  if (kakaoSignInPromise) return kakaoSignInPromise;

  kakaoSignInPromise = runKakaoSignIn().finally(() => {
    kakaoSignInPromise = null;
  });
  return kakaoSignInPromise;
}
