import { StatusBar } from 'expo-status-bar';
import { Image as ExpoImage } from 'expo-image';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import kakaoLogo from '@/assets/images/kakao-logo-2x.png';
import { trackEvent } from '@/lib/analytics';
import { signInWithKakao } from '@/lib/mobileAuth';
import { useMountedRef } from '@/lib/useMountedRef';

export default function LoginScreen() {
  const mountedRef = useMountedRef();
  const loginInFlightRef = useRef(false);
  const [signingIn, setSigningIn] = useState(false);

  const login = async () => {
    if (loginInFlightRef.current) return;
    loginInFlightRef.current = true;
    setSigningIn(true);
    try {
      const session = await signInWithKakao();
      if (session) trackEvent('login_completed', { login_method: 'kakao' });
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('로그인하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      loginInFlightRef.current = false;
      if (mountedRef.current) setSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.loginGroup}>
          <ExpoImage
            contentFit="contain"
            source={require('../../assets/images/splash-logo.svg')}
            style={styles.brandLogo}
            tintColor="#1A1A1A"
          />
          <Text style={styles.description}>{'간편하게 로그인하고\n코츠코리아 서비스를 이용해보세요'}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="카카오 로그인"
            disabled={signingIn}
            onPress={() => void login()}
            style={({ pressed }) => [styles.kakaoButton, pressed && !signingIn && styles.pressed, signingIn && styles.disabled]}>
            <Image source={kakaoLogo} resizeMode="contain" style={styles.kakaoLogo} />
            {signingIn ? <ActivityIndicator color="#313131" /> : <Text style={styles.kakaoButtonText}>카카오 로그인</Text>}
          </Pressable>
        </View>
      </View>
      <View style={styles.legalLinks}>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL('https://courtskorea.com/privacy')}
          style={({ pressed }) => pressed && styles.linkPressed}>
          <Text style={styles.legalLinkText}>개인정보처리방침</Text>
        </Pressable>
        <Text style={styles.legalDivider}>·</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL('https://courtskorea.com/account-deletion')}
          style={({ pressed }) => pressed && styles.linkPressed}>
          <Text style={styles.legalLinkText}>계정 및 데이터 삭제</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 36, justifyContent: 'center' },
  loginGroup: { width: '100%', alignItems: 'center', transform: [{ translateY: -42 }] },
  brandLogo: { width: 150, height: 24 },
  description: {
    height: 60,
    marginTop: 25,
    color: '#1A1A1A',
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: -0.2,
    textAlign: 'center',
    fontFamily: 'Pretendard-Regular',
  },
  kakaoButton: {
    width: '100%',
    height: 51,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#FDDC3F',
  },
  kakaoLogo: { position: 'absolute', left: 21, width: 22, height: 21 },
  kakaoButtonText: { color: '#313131', fontSize: 16, lineHeight: 22, fontFamily: 'Pretendard-Bold' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.7 },
  legalLinks: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkText: { color: '#8A8A8A', fontSize: 12, lineHeight: 18, fontFamily: 'Pretendard-Regular' },
  legalDivider: { color: '#BDBDBD', fontSize: 12, lineHeight: 18, fontFamily: 'Pretendard-Regular' },
  linkPressed: { opacity: 0.55 },
});
