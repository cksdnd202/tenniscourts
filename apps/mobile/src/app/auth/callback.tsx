import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { SportLoadingIndicator } from '@/components/SportLoadingIndicator';
import { completeAuthSessionFromUrl } from '@/lib/mobileAuth';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const callbackUrl = Linking.useURL();
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!callbackUrl || !callbackUrl.startsWith('courtskorea://auth/callback')) return;
    if (handledUrl.current === callbackUrl) return;
    handledUrl.current = callbackUrl;

    void completeAuthSessionFromUrl(callbackUrl).catch((cause) => {
      Alert.alert(
        '로그인하지 못했습니다',
        cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.',
        [{ text: '확인', onPress: () => router.replace('/login') }],
      );
    });
  }, [callbackUrl, router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SportLoadingIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
