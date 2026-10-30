import { useLocalSearchParams } from 'expo-router';

import { WebTabScreen } from '@/components/WebTabScreen';

export default function LegalDetailScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const page = type === 'privacy' ? '/privacy' : '/terms';
  return <WebTabScreen active="mypage" initialPath={page} showBackNavigation />;
}
