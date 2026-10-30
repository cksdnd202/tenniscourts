import { useLocalSearchParams } from 'expo-router';

import { WebTabScreen } from '@/components/WebTabScreen';

export default function MapScreen() {
  const params = useLocalSearchParams<{ courtId?: string; nearbyCourtId?: string }>();
  const query = new URLSearchParams();
  if (params.courtId) query.set('courtId', params.courtId);
  if (params.nearbyCourtId) query.set('nearbyCourtId', params.nearbyCourtId);
  const queryString = query.toString();

  return (
    <WebTabScreen
      active="map"
      initialPath={`/map/tennis${queryString ? `?${queryString}` : ''}`}
      showBottomNav
      showBackNavigation
      hideCalendarActions
      lightChrome
      webOrigin="https://courtskorea.com"
    />
  );
}
