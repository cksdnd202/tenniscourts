import type { User } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavigationArrow } from '@/components/NavigationArrow';
import { LoadingState } from '@/components/ScreenState';
import { clearLocalRecentCourts } from '@/lib/courtData';
import { publicSupabase, supabase } from '@/lib/supabase';
import { useMountedRef } from '@/lib/useMountedRef';
import { APP_WEB_ORIGIN } from '@/lib/webOrigin';

type Profile = { id?: string; display_name?: string | null; avatar_url?: string | null; home_region?: string | null; home_city?: string | null };
type CourtRegionRow = { basic_region?: string | null; basic_city?: string | null };
type RegionOption = { region: string; cities: string[] };
const WEB_ORIGIN = APP_WEB_ORIGIN;

function displayName(user: User | null, profile: Profile | null) {
  const metadata = user?.user_metadata ?? {};
  return profile?.display_name || metadata.full_name || metadata.name || metadata.nickname || user?.email?.split('@')[0] || '사용자';
}

function avatarUrl(user: User | null, profile: Profile | null) {
  const metadata = user?.user_metadata ?? {};
  return profile?.avatar_url || metadata.avatar_url || metadata.picture || metadata.profile_image_url || null;
}

export default function ProfileInfoScreen() {
  const router = useRouter();
  const mountedRef = useMountedRef();
  const loadIdRef = useRef(0);
  const signOutInFlightRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<'name' | 'region' | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftRegion, setDraftRegion] = useState('');
  const [draftCity, setDraftCity] = useState('');
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const [regionOptionsLoading, setRegionOptionsLoading] = useState(false);
  const [openRegionDropdown, setOpenRegionDropdown] = useState<'region' | 'city' | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (nextUser: User | null) => {
    const loadId = ++loadIdRef.current;
    if (!mountedRef.current) return;
    setUser(nextUser);
    if (!nextUser) { setProfile(null); setLoading(false); return; }
    const profiles = supabase.from('profiles' as never) as any;
    let result = await profiles.select('id, display_name, avatar_url, home_region, home_city').eq('id', nextUser.id).maybeSingle();
    if (result.error) result = await profiles.select('id, display_name, avatar_url').eq('id', nextUser.id).maybeSingle();
    if (!mountedRef.current || loadId !== loadIdRef.current) return;
    setProfile((result.data as Profile | null) ?? null);
    setLoading(false);
  }, [mountedRef]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (mountedRef.current) void load(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) void load(session?.user ?? null);
    });
    return () => {
      loadIdRef.current += 1;
      subscription.unsubscribe();
    };
  }, [load, mountedRef]);

  useEffect(() => {
    let mounted = true;
    const loadRegionOptions = async () => {
      setRegionOptionsLoading(true);
      const { data, error } = await (publicSupabase.from('courtinfo' as never) as any)
        .select('basic_region, basic_city')
        .eq('sport_type', 'tennis')
        .eq('use_or_not', true)
        .range(0, 4999);

      if (!mounted) return;
      if (!error) {
        const cityMap = new Map<string, Set<string>>();
        for (const row of (data ?? []) as CourtRegionRow[]) {
          const nextRegion = row.basic_region?.trim();
          const nextCity = row.basic_city?.trim();
          if (!nextRegion) continue;
          if (!cityMap.has(nextRegion)) cityMap.set(nextRegion, new Set());
          if (nextCity) cityMap.get(nextRegion)?.add(nextCity);
        }
        setRegionOptions(Array.from(cityMap.entries())
          .map(([nextRegion, cities]) => ({ region: nextRegion, cities: Array.from(cities).sort((a, b) => a.localeCompare(b, 'ko')) }))
          .sort((a, b) => a.region.localeCompare(b.region, 'ko')));
      }
      setRegionOptionsLoading(false);
    };
    void loadRegionOptions();
    return () => { mounted = false; };
  }, []);

  const name = displayName(user, profile);
  const region = [profile?.home_region, profile?.home_city].filter(Boolean).join(' ') || '설정 안 됨';
  const cityOptions = useMemo(
    () => regionOptions.find((option) => option.region === draftRegion)?.cities ?? [],
    [draftRegion, regionOptions],
  );
  const provider = user?.app_metadata?.provider === 'kakao' ? '카카오' : (user?.app_metadata?.provider ?? '-');
  const joined = user?.created_at ? new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(user.created_at)) : '-';

  const saveName = async () => {
    if (!user || draftName.trim().length < 2) { Alert.alert('닉네임을 확인해 주세요', '2자 이상 입력해 주세요.'); return; }
    setSaving(true);
    const profiles = supabase.from('profiles' as never) as any;
    const { data, error } = await profiles.upsert({ id: user.id, display_name: draftName.trim(), avatar_url: avatarUrl(user, profile), updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('id, display_name, avatar_url, home_region, home_city').single();
    if (!mountedRef.current) return;
    setSaving(false);
    if (error) { Alert.alert('저장하지 못했습니다', '잠시 후 다시 시도해 주세요.'); return; }
    setProfile(data as Profile); setEditor(null);
  };

  const saveRegion = async () => {
    if (!user || !draftRegion.trim() || !draftCity.trim()) { Alert.alert('지역을 확인해 주세요', '시/도와 시/군/구를 모두 선택해 주세요.'); return; }
    setSaving(true);
    const profiles = supabase.from('profiles' as never) as any;
    const { data, error } = await profiles.upsert({ id: user.id, display_name: name, avatar_url: avatarUrl(user, profile), home_region: draftRegion.trim(), home_city: draftCity.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('id, display_name, avatar_url, home_region, home_city').single();
    if (!mountedRef.current) return;
    setSaving(false);
    if (error) { Alert.alert('저장하지 못했습니다', '잠시 후 다시 시도해 주세요.'); return; }
    setProfile(data as Profile); setEditor(null);
  };

  const signOut = async () => {
    if (signOutInFlightRef.current) return;
    signOutInFlightRef.current = true;
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      if (mountedRef.current) Alert.alert('로그아웃하지 못했습니다', '잠시 후 다시 시도해 주세요.');
      signOutInFlightRef.current = false;
    }
  };

  const confirmSignOut = () => Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
    { text: '취소', style: 'cancel' },
    { text: '로그아웃', style: 'destructive', onPress: () => { void signOut(); } },
  ]);

  const deleteAccount = () => Alert.alert('회원 탈퇴', '계정과 저장된 사용자 정보가 삭제됩니다. 정말 탈퇴하시겠습니까?', [
    { text: '취소', style: 'cancel' },
    { text: '회원 탈퇴', style: 'destructive', onPress: async () => {
      const { data } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      if (!data.session?.access_token) return Alert.alert('로그인 정보를 확인해 주세요.');
      const response = await fetch(`${WEB_ORIGIN}/api/account/delete`, { method: 'DELETE', headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!mountedRef.current) return;
      if (!response.ok) return Alert.alert('탈퇴하지 못했습니다', body?.error ?? '잠시 후 다시 시도해 주세요.');
      await clearLocalRecentCourts();
      await supabase.auth.signOut({ scope: 'local' });
    } },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityLabel="뒤로가기" onPress={() => router.back()} style={styles.back}><NavigationArrow direction="left" /></Pressable>
      <Text style={styles.title}>프로필 정보</Text>
      {loading ? <LoadingState style={styles.loader} /> : <>
        <Pressable onPress={() => { setDraftName(name); setEditor('name'); }} style={({ pressed }) => [styles.actionRow, styles.firstActionRow, pressed && styles.pressed]}>
          <Text style={styles.rowLabel}>닉네임</Text><View style={styles.rowRight}><Text style={styles.rowValue}>{name}</Text><Image source={require('../../assets/images/mypage/edit.png')} resizeMode="contain" style={styles.editIcon} /></View>
        </Pressable>
        <Pressable onPress={() => { setDraftRegion(profile?.home_region ?? ''); setDraftCity(profile?.home_city ?? ''); setOpenRegionDropdown(null); setEditor('region'); }} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
          <Text style={styles.rowLabel}>내 지역</Text><View style={styles.rowRight}><Text style={styles.rowValue}>{region}</Text><Image source={require('../../assets/images/mypage/edit.png')} resizeMode="contain" style={styles.editIcon} /></View>
        </Pressable>
        <View style={[styles.divider, styles.profileDivider]} />
        <Text style={styles.sectionTitle}>로그인 정보</Text>
        <View style={styles.infoRow}><Text style={styles.rowLabel}>이름</Text><Text style={styles.rowValue}>{user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? name}</Text></View>
        <View style={styles.infoRow}><Text style={styles.rowLabel}>계정</Text><Text numberOfLines={1} style={styles.rowValue}>{user?.email ?? '-'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.rowLabel}>로그인 방식</Text><Text style={styles.rowValue}>{provider}</Text></View>
        <View style={styles.infoRow}><Text style={styles.rowLabel}>가입일</Text><Text style={styles.rowValue}>{joined}</Text></View>
        <View style={[styles.divider, styles.loginDivider]} />
        <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.textAction, styles.firstTextAction, pressed && styles.pressed]}><Text style={styles.textActionLabel}>로그아웃</Text></Pressable>
        <Pressable onPress={deleteAccount} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionLabel}>회원탈퇴</Text></Pressable>
      </>}
    </ScrollView>

    <Modal visible={editor !== null} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
      <Pressable style={styles.backdrop} onPress={() => !saving && setEditor(null)}>
        <Pressable style={styles.dialog} onPress={() => undefined}>
          <Text style={styles.dialogTitle}>{editor === 'name' ? '닉네임 수정' : '내 지역 수정'}</Text>
          {editor === 'name' ? <TextInput autoFocus maxLength={24} value={draftName} onChangeText={setDraftName} placeholder="닉네임" placeholderTextColor="#A0A0A0" style={styles.input} /> : <>
            <Text style={styles.inputLabel}>시/도</Text>
            <Pressable
              disabled={regionOptionsLoading}
              onPress={() => setOpenRegionDropdown((current) => current === 'region' ? null : 'region')}
              style={({ pressed }) => [styles.select, pressed && styles.selectPressed]}>
              <Text style={[styles.selectText, !draftRegion && styles.selectPlaceholder]}>{regionOptionsLoading ? '지역 불러오는 중...' : draftRegion || '시/도를 선택해 주세요'}</Text>
              <Text style={styles.selectChevron}>{openRegionDropdown === 'region' ? '⌃' : '⌄'}</Text>
            </Pressable>
            {openRegionDropdown === 'region' ? <View style={styles.optionBox}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {regionOptions.map((option) => <Pressable
                  key={option.region}
                  onPress={() => { setDraftRegion(option.region); setDraftCity(''); setOpenRegionDropdown('city'); }}
                  style={({ pressed }) => [styles.optionRow, option.region === draftRegion && styles.optionRowSelected, pressed && styles.selectPressed]}>
                  <Text style={[styles.optionText, option.region === draftRegion && styles.optionTextSelected]}>{option.region}</Text>
                </Pressable>)}
              </ScrollView>
            </View> : null}

            <Text style={styles.inputLabel}>시/군/구</Text>
            <Pressable
              disabled={!draftRegion || regionOptionsLoading}
              onPress={() => setOpenRegionDropdown((current) => current === 'city' ? null : 'city')}
              style={({ pressed }) => [styles.select, (!draftRegion || regionOptionsLoading) && styles.selectDisabled, pressed && draftRegion && styles.selectPressed]}>
              <Text style={[styles.selectText, !draftCity && styles.selectPlaceholder]}>{draftCity || (draftRegion ? '시/군/구를 선택해 주세요' : '시/도를 먼저 선택해 주세요')}</Text>
              <Text style={styles.selectChevron}>{openRegionDropdown === 'city' ? '⌃' : '⌄'}</Text>
            </Pressable>
            {openRegionDropdown === 'city' ? <View style={styles.optionBox}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {cityOptions.map((nextCity) => <Pressable
                  key={nextCity}
                  onPress={() => { setDraftCity(nextCity); setOpenRegionDropdown(null); }}
                  style={({ pressed }) => [styles.optionRow, nextCity === draftCity && styles.optionRowSelected, pressed && styles.selectPressed]}>
                  <Text style={[styles.optionText, nextCity === draftCity && styles.optionTextSelected]}>{nextCity}</Text>
                </Pressable>)}
              </ScrollView>
            </View> : null}
          </>}
          <View style={styles.actions}><Pressable disabled={saving} onPress={() => setEditor(null)} style={styles.cancel}><Text style={styles.cancelText}>취소</Text></Pressable><Pressable disabled={saving} onPress={() => void (editor === 'name' ? saveName() : saveRegion())} style={styles.save}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>저장</Text>}</Pressable></View>
        </Pressable>
      </Pressable>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' }, content: { flexGrow: 1, paddingBottom: 36 },
  back: { width: 64, height: 64, justifyContent: 'center', paddingLeft: 16 },
  title: { marginTop: 15, marginBottom: 23, paddingHorizontal: 16, color: '#202020', fontSize: 20, lineHeight: 28, letterSpacing: -0.2, fontFamily: 'Pretendard-Regular', includeFontPadding: false }, loader: { flex: 1, minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  actionRow: { height: 45, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, firstActionRow: { height: 40 }, pressed: { backgroundColor: '#F4F4F4' },
  divider: { height: 1, marginHorizontal: 16, backgroundColor: '#ECEDEF' },
  profileDivider: { marginTop: 23 },
  loginDivider: { marginTop: 18 },
  rowLabel: { color: '#303030', fontSize: 16, lineHeight: 22, letterSpacing: -0.16, fontFamily: 'Pretendard-Regular', includeFontPadding: false }, rowRight: { flex: 1, marginLeft: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }, rowValue: { flexShrink: 1, color: '#999999', fontSize: 16, lineHeight: 22, letterSpacing: -0.16, textAlign: 'right', fontFamily: 'Pretendard-Regular', includeFontPadding: false }, editIcon: { width: 20, height: 20 },
  sectionTitle: { marginTop: 20, marginBottom: 26, paddingHorizontal: 16, color: '#202020', fontSize: 20, lineHeight: 28, letterSpacing: -0.2, fontFamily: 'Pretendard-Regular', includeFontPadding: false }, infoRow: { height: 45, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }, textAction: { height: 45, paddingHorizontal: 16, justifyContent: 'center' }, firstTextAction: { marginTop: 23 }, textActionLabel: { color: '#303030', fontSize: 16, lineHeight: 22, letterSpacing: -0.16, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  backdrop: { flex: 1, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.48)' }, dialog: { width: '100%', maxWidth: 390, padding: 20, borderRadius: 16, backgroundColor: '#FFF' }, dialogTitle: { marginBottom: 18, color: '#202020', fontSize: 20, fontFamily: 'Pretendard-Bold' }, inputLabel: { marginTop: 10, marginBottom: 7, color: '#777C84', fontSize: 13 }, input: { height: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D8DADD', borderRadius: 8, color: '#202020', fontSize: 16 }, select: { height: 50, paddingLeft: 14, paddingRight: 12, borderWidth: 1, borderColor: '#D8DADD', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF' }, selectDisabled: { backgroundColor: '#F4F4F5', opacity: 0.7 }, selectPressed: { backgroundColor: '#F4F4F4' }, selectText: { flex: 1, color: '#202020', fontSize: 16, fontFamily: 'Pretendard-Regular' }, selectPlaceholder: { color: '#A0A0A0' }, selectChevron: { marginLeft: 10, color: '#777C84', fontSize: 18, lineHeight: 20 }, optionBox: { maxHeight: 164, marginTop: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#D8DADD', borderRadius: 8, backgroundColor: '#FFF' }, optionRow: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }, optionRowSelected: { backgroundColor: '#EAF8F1' }, optionText: { color: '#303030', fontSize: 15, fontFamily: 'Pretendard-Regular' }, optionTextSelected: { color: '#20A866', fontFamily: 'Pretendard-SemiBold' }, actions: { marginTop: 20, flexDirection: 'row', gap: 10 }, cancel: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D8DADD', borderRadius: 8 }, cancelText: { color: '#555B63', fontFamily: 'Pretendard-SemiBold' }, save: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#303030' }, saveText: { color: '#FFF', fontFamily: 'Pretendard-SemiBold' },
});
