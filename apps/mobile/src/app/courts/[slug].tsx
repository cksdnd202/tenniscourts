import { useLocalSearchParams } from 'expo-router';

import { WebTabScreen } from '@/components/WebTabScreen';

export default function CourtDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const routeKey = Array.isArray(slug) ? slug[0] : slug;
  const encodedRouteKey = encodeURIComponent(routeKey ?? '');

  return (
    <WebTabScreen
      active="search"
      initialPath={`/courts/${encodedRouteKey}`}
      reminderSlug={routeKey}
      showReminderAction
      hideCalendarActions
      showBackNavigation
      lightChrome
    />
  );
}
