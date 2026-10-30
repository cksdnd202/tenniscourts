import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import locationPermissionImage from '@/assets/images/onboarding/location-permission-v2.png';
import { trackEvent } from '@/lib/analytics';
import { useAuthFlow } from '@/lib/authFlow';
import { useMountedRef } from '@/lib/useMountedRef';

export default function LocationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const { completeLocationIntro } = useAuthFlow();
  const completionRef = useRef(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  const finish = useCallback(async (method: 'granted' | 'later' | 'denied' | 'already_granted') => {
    if (completionRef.current) return;
    completionRef.current = true;
    try {
      await completeLocationIntro();
      trackEvent('location_intro_completed', { completion_method: method });
    } catch (cause) {
      completionRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
        Alert.alert('위치 안내를 완료하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    }
  }, [completeLocationIntro, mountedRef]);

  useEffect(() => {
    let active = true;
    void Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (active && permission.granted) await finish('already_granted');
      })
      .finally(() => {
        if (active && mountedRef.current) setChecking(false);
      });
    return () => { active = false; };
  }, [finish, mountedRef]);

  const allow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      trackEvent('location_permission_requested', { source: 'location_intro' });
      const permission = await Location.requestForegroundPermissionsAsync();
      trackEvent(permission.granted ? 'location_permission_granted' : 'location_permission_denied', { source: 'location_intro' });
      await finish(permission.granted ? 'granted' : 'denied');
    } catch {
      await finish('denied');
    }
  };

  const later = async () => {
    if (busy) return;
    setBusy(true);
    await finish('later');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{'내 주변 테니스장을\n빠르게 찾아보세요'}</Text>
        <Text style={styles.description}>{'현재 위치를 기준으로 가까운 테니스장을\n거리순으로 보여드려요'}</Text>

        <Image
          alt="현재 위치 주변 테니스장"
          contentFit="contain"
          source={locationPermissionImage}
          style={styles.illustration}
        />

        <View style={[styles.actions, { bottom: Math.max(insets.bottom, 20) + 22 }]}>
          <Pressable disabled={busy || checking} onPress={() => void later()} style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}>
            <Text style={styles.laterText}>나중에</Text>
          </Pressable>
          <Pressable disabled={busy || checking} onPress={() => void allow()} style={({ pressed }) => [styles.allowButton, pressed && styles.pressed]}>
            {busy || checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.allowText}>위치 허용</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  title: { marginTop: 76, color: '#3A3A3A', fontSize: 29, lineHeight: 38, letterSpacing: -0.75, fontFamily: 'Pretendard-Bold' },
  description: { marginTop: 23, color: '#858585', fontSize: 18, lineHeight: 28, letterSpacing: -0.45, fontFamily: 'Pretendard-Regular' },
  illustration: { alignSelf: 'center', width: 315, height: 315, marginTop: 35 },
  actions: { position: 'absolute', left: 20, right: 20, height: 52, flexDirection: 'row', gap: 10 },
  laterButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D4D4D4', borderRadius: 4, backgroundColor: '#FFFFFF' },
  allowButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: '#30C27C' },
  laterText: { color: '#303030', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  allowText: { color: '#FFFFFF', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  pressed: { opacity: 0.68 },
});
