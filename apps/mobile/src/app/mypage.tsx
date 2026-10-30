import type { User } from '@supabase/supabase-js';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_NAV_HEIGHT } from '@/components/AppBottomNav';
import { NavigationArrow } from '@/components/NavigationArrow';
import { NotificationInboxButton } from '@/components/NotificationInboxButton';
import { LoadingState } from '@/components/ScreenState';
import { signInWithKakao } from '@/lib/mobileAuth';
import { supabase } from '@/lib/supabase';
import { useMountedRef } from '@/lib/useMountedRef';

type Profile = { display_name?: string | null; avatar_url?: string | null };
function getName(user: User | null, profile: Profile | null) {
  const metadata = user?.user_metadata ?? {};
  return profile?.display_name || metadata.name || metadata.full_name || metadata.nickname || user?.email?.split('@')[0] || '사용자';
}
function getAvatar(user: User | null, profile: Profile | null) {
  const metadata = user?.user_metadata ?? {};
  return profile?.avatar_url || metadata.avatar_url || metadata.picture || metadata.profile_image_url || null;
}
function Chevron() { return <NavigationArrow direction="right" />; }
const menuIcons = {
  favorite: require('../../assets/images/mypage/bookmark.png'),
  history: require('../../assets/images/mypage/history.png'),
  notification: require('../../assets/images/gnb/icon_alarm_active.png'),
  notificationSettings: require('../../assets/images/mypage/alarm_setting.png'),
  terms: require('../../assets/images/mypage/clause.png'),
  notice: require('../../assets/images/mypage/icon_announcement.svg'),
  support: require('../../assets/images/mypage/icon_question.svg'),
};
function MenuIcon({ name }: { name: keyof typeof menuIcons }) {
  return <View style={styles.menuIconWrap}><ExpoImage source={menuIcons[name]} contentFit="contain" style={styles.menuIconImage} /></View>;
}

export default function MyPageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const syncIdRef = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const syncUser = useCallback(async (nextUser: User | null) => {
    const syncId = ++syncIdRef.current;
    if (!mountedRef.current) return;
    setUser(nextUser);
    if (!nextUser) { setProfile(null); setLoading(false); return; }
    const profiles = supabase.from('profiles' as never) as any;
    const { data } = await profiles.select('display_name, avatar_url').eq('id', nextUser.id).maybeSingle();
    if (!mountedRef.current || syncId !== syncIdRef.current) return;
    setProfile((data as Profile | null) ?? null); setLoading(false);
  }, [mountedRef]);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (mountedRef.current) void syncUser(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) void syncUser(session?.user ?? null);
    });
    return () => {
      syncIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [mountedRef, syncUser]);

  const login = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const nextSession = await signInWithKakao();
      if (nextSession && mountedRef.current) await syncUser(nextSession.user);
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('로그인하지 못했습니다', cause instanceof Error ? cause.message : '다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setSigningIn(false);
    }
  };

  const navigate = (path: Href) => router.push(path);
  const name = getName(user, profile);
  const avatar = getAvatar(user, profile);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <StatusBar style="dark" />
    <View style={styles.header}>
      <Text style={styles.title}>마이페이지</Text>
      <View style={styles.headerActions}>
        <Pressable accessibilityLabel="테니스장 검색" onPress={() => router.replace('/')} style={styles.searchButton}>
          <Image source={require('../../assets/images/header/icon_search_dark.png')} resizeMode="contain" style={styles.searchIcon} />
        </Pressable>
        <NotificationInboxButton />
      </View>
    </View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_NAV_HEIGHT + insets.bottom + 22 }]} showsVerticalScrollIndicator={false}>
      {loading ? <LoadingState style={styles.loader} /> : user ? <>
        <View style={styles.profileRow}>
          {avatar && !avatarFailed ? <Image onError={() => setAvatarFailed(true)} source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{name.slice(0, 1)}</Text></View>}
          <View style={styles.profileText}><Text numberOfLines={1} style={styles.name}>{name}</Text><Text numberOfLines={1} style={styles.email}>{user.email ?? '카카오 계정'}</Text></View>
          <Pressable onPress={() => navigate('/profile-info' as Href)} style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}><Text style={styles.profileButtonText}>프로필 보기</Text></Pressable>
        </View>
        <View style={styles.rule} /><Text style={styles.sectionTitle}>내 활동</Text>
        <Pressable onPress={() => navigate('/favorites' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="favorite" /><Text style={styles.menuText}>찜한 테니스장</Text><Chevron /></Pressable>
        <Pressable onPress={() => navigate('/recent-courts' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="history" /><Text style={styles.menuText}>최근 본 테니스장</Text><Chevron /></Pressable>
        <Pressable onPress={() => navigate('/notifications' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="notification" /><Text style={styles.menuText}>오픈 알림</Text><Chevron /></Pressable>
        <View style={styles.ruleSmall} /><Text style={styles.sectionTitle}>고객 지원</Text>
        <Pressable onPress={() => navigate('/notices' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="notice" /><Text style={styles.menuText}>공지사항</Text><Chevron /></Pressable>
        <Pressable onPress={() => navigate('/customer-support' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="support" /><Text style={styles.menuText}>고객문의</Text><Chevron /></Pressable>
        <View style={styles.ruleSmall} /><Text style={styles.sectionTitle}>설정</Text>
        <Pressable onPress={() => navigate('/notification-settings' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="notificationSettings" /><Text style={styles.menuText}>알림 설정</Text><Chevron /></Pressable>
        <Pressable onPress={() => navigate('/terms-menu' as Href)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MenuIcon name="terms" /><Text style={styles.menuText}>약관</Text><Chevron /></Pressable>
      </> : <View style={styles.signedOut}><Text style={styles.signedOutTitle}>로그인이 필요합니다</Text><Text style={styles.signedOutBody}>찜과 오픈 알림을 한곳에서 관리해 보세요.</Text><Pressable disabled={signingIn} onPress={() => void login()} style={styles.loginButton}>{signingIn ? <ActivityIndicator color="#202020" /> : <Text style={styles.loginText}>카카오로 로그인</Text>}</Pressable></View>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' }, content: { flexGrow: 1, paddingHorizontal: 16 }, header: { height: 63, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECECEC', backgroundColor: '#FFFFFF' }, title: { color: '#282828', fontSize: 22, lineHeight: 30, letterSpacing: -0.22, fontFamily: 'Pretendard-Bold' }, headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12 }, searchButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, searchIcon: { width: 22, height: 22 }, loader: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  profileRow: { height: 134, flexDirection: 'row', alignItems: 'center' }, avatar: { width: 48, height: 48, borderRadius: 24 }, avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9D9D9' }, avatarLetter: { color: '#888', fontSize: 18, fontFamily: 'Pretendard-SemiBold' }, profileText: { flex: 1, minWidth: 0, marginLeft: 10 }, name: { color: '#303030', fontSize: 18, fontFamily: 'Pretendard-Bold' }, email: { marginTop: 3, color: '#999', fontSize: 14 }, profileButton: { height: 42, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D8DADD', borderRadius: 5 }, profileButtonText: { color: '#303030', fontSize: 16, fontFamily: 'Pretendard-Medium' },
  rule: { height: 1, backgroundColor: '#ECEDEF' }, ruleSmall: { height: 1, marginTop: 18, backgroundColor: '#ECEDEF' }, sectionTitle: { marginTop: 28, marginBottom: 18, color: '#202020', fontSize: 22, fontFamily: 'Pretendard-Regular' }, menuRow: { height: 45, marginHorizontal: -16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, pressed: { backgroundColor: '#F4F4F4' }, menuIconWrap: { width: 33, height: 24, alignItems: 'flex-start', justifyContent: 'center' }, menuIconImage: { width: 24, height: 24 }, menuText: { flex: 1, color: '#303030', fontSize: 17 },
  signedOut: { marginTop: 40, padding: 24, alignItems: 'center', borderRadius: 12, backgroundColor: '#F6F6F6' }, signedOutTitle: { color: '#202020', fontSize: 20, fontFamily: 'Pretendard-Bold' }, signedOutBody: { marginTop: 8, color: '#777', fontSize: 14 }, loginButton: { width: '100%', height: 50, marginTop: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#FEE500' }, loginText: { color: '#202020', fontSize: 16, fontFamily: 'Pretendard-Bold' },
});
