import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationArrow } from '@/components/NavigationArrow';
import { trackEvent } from '@/lib/analytics';
import { useAuthFlow } from '@/lib/authFlow';
import { useMountedRef } from '@/lib/useMountedRef';

function ConsentCheck({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.check, selected && styles.checkSelected]}>
      {selected ? <Text style={styles.checkMark}>✓</Text> : null}
    </View>
  );
}

export default function TermsConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mountedRef = useMountedRef();
  const { completeLegalConsent } = useAuthFlow();
  const [termsSelected, setTermsSelected] = useState(false);
  const [privacySelected, setPrivacySelected] = useState(false);
  const [saving, setSaving] = useState(false);
  const allSelected = termsSelected && privacySelected;

  const toggleAll = () => {
    const next = !allSelected;
    setTermsSelected(next);
    setPrivacySelected(next);
  };

  const agree = async () => {
    if (!allSelected || saving) return;
    setSaving(true);
    try {
      await completeLegalConsent();
      trackEvent('legal_consent_completed', {
        terms_agreed: true,
        privacy_collection_agreed: true,
      });
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert(
          '약관 동의를 저장하지 못했습니다',
          cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.'
        );
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const openLegal = (type: 'terms' | 'privacy') => {
    router.push(`/legal/${type}` as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{'가입 전,\n약관을 확인해보세요'}</Text>

        <View style={styles.agreementGroup}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            onPress={toggleAll}
            style={({ pressed }) => [styles.allRow, pressed && styles.pressed]}
          >
            <ConsentCheck selected={allSelected} />
            <Text style={styles.allLabel}>약관 전체동의</Text>
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.termRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsSelected }}
              onPress={() => setTermsSelected((value) => !value)}
              style={({ pressed }) => [styles.termCheckArea, pressed && styles.pressed]}
            >
              <ConsentCheck selected={termsSelected} />
              <Text style={styles.termLabel}><Text style={styles.required}>(필수)</Text> 서비스 이용약관</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="서비스 이용약관 보기"
              onPress={() => openLegal('terms')}
              style={({ pressed }) => [styles.chevronButton, pressed && styles.pressed]}
            >
              <NavigationArrow direction="right" />
            </Pressable>
          </View>

          <View style={styles.termRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: privacySelected }}
              onPress={() => setPrivacySelected((value) => !value)}
              style={({ pressed }) => [styles.termCheckArea, pressed && styles.pressed]}
            >
              <ConsentCheck selected={privacySelected} />
              <Text style={styles.termLabel}><Text style={styles.required}>(필수)</Text> 개인정보 수집·이용 동의</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="개인정보 수집 이용 동의 보기"
              onPress={() => openLegal('privacy')}
              style={({ pressed }) => [styles.chevronButton, pressed && styles.pressed]}
            >
              <NavigationArrow direction="right" />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!allSelected || saving}
          onPress={() => void agree()}
          style={({ pressed }) => [
            styles.agreeButton,
            { bottom: Math.max(insets.bottom, 20) + 22 },
            !allSelected && styles.agreeButtonDisabled,
            pressed && allSelected && !saving && styles.pressed,
          ]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.agreeButtonText}>동의하기</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  title: {
    marginTop: 76,
    color: '#3A3A3A',
    fontSize: 29,
    lineHeight: 38,
    letterSpacing: -0.75,
    fontFamily: 'Pretendard-Bold',
  },
  agreementGroup: { marginTop: 103 },
  allRow: { height: 64, flexDirection: 'row', alignItems: 'center' },
  check: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A4A4A4',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  checkSelected: { borderColor: '#30C27C', backgroundColor: '#30C27C' },
  checkMark: {
    marginTop: -1,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontFamily: 'Pretendard-Bold',
  },
  allLabel: {
    marginLeft: 12,
    color: '#3A3A3A',
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.4,
    fontFamily: 'Pretendard-Bold',
  },
  divider: { height: 1, backgroundColor: '#ECECEC' },
  termRow: { height: 47, flexDirection: 'row', alignItems: 'center' },
  termCheckArea: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center' },
  termLabel: {
    marginLeft: 12,
    color: '#3A3A3A',
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.35,
    fontFamily: 'Pretendard-Regular',
  },
  required: { fontFamily: 'Pretendard-Bold' },
  chevronButton: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 5 },
  agreeButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#30C27C',
  },
  agreeButtonDisabled: { backgroundColor: '#E2E2E2' },
  agreeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Pretendard-Bold',
  },
  pressed: { opacity: 0.65 },
});
