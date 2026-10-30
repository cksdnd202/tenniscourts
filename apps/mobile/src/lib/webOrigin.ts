const PRODUCTION_WEB_ORIGIN = 'https://courtskorea.com';

// APK 빌드 당시 사용한 로컬 IP가 앱에 남지 않도록, 로컬 웹은 미리보기
// 스크립트가 명시적으로 활성화한 경우에만 사용한다.
export const APP_WEB_ORIGIN = (
  process.env.EXPO_PUBLIC_USE_LOCAL_WEB === 'true'
    ? process.env.EXPO_PUBLIC_WEB_URL || PRODUCTION_WEB_ORIGIN
    : PRODUCTION_WEB_ORIGIN
).replace(/\/$/, '');
