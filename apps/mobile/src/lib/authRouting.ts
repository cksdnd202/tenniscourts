export type AuthRouteState = {
  hasSession: boolean;
  legalConsentCompleted: boolean;
  onboardingCompleted: boolean;
  notificationIntroCompleted: boolean;
  locationIntroCompleted: boolean;
};

function authenticatedStartRoute(state: AuthRouteState) {
  if (!state.legalConsentCompleted) return '/terms-consent';
  if (!state.onboardingCompleted) return '/onboarding';
  if (!state.notificationIntroCompleted) return '/notification-permission';
  if (!state.locationIntroCompleted) return '/location-permission';
  return '/';
}

export function getAuthRedirect(pathname: string, state: AuthRouteState) {
  // The OAuth browser returns through this native deep link. Keep the callback
  // route mounted until its tokens have been exchanged instead of redirecting
  // it to the login screen (or exposing Expo Router's unmatched-route screen).
  if (pathname === '/auth/callback') {
    if (!state.hasSession) return null;
    return authenticatedStartRoute(state);
  }

  if (!state.hasSession) {
    return pathname === '/login' ? null : '/login';
  }

  if (!state.legalConsentCompleted) {
    if (pathname === '/terms-consent' || /^\/legal\//.test(pathname)) return null;
    return '/terms-consent';
  }

  if (!state.onboardingCompleted) {
    return pathname === '/onboarding' ? null : '/onboarding';
  }

  if (!state.notificationIntroCompleted) {
    return pathname === '/notification-permission' ? null : '/notification-permission';
  }

  if (!state.locationIntroCompleted) {
    return pathname === '/location-permission' ? null : '/location-permission';
  }

  if (
    pathname === '/login'
    || pathname === '/terms-consent'
    || pathname === '/onboarding'
    || pathname === '/notification-permission'
    || pathname === '/location-permission'
  ) {
    return '/';
  }

  return null;
}
