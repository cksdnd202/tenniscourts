import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

const KEY = 'courtskorea:app-onboarding-v1';
const steps = [
  { eyebrow: '01 · SEARCH', title: '전국 테니스장을\n빠르게 찾아보세요', text: '지역, 코트 종류, 운영 주체로 좁히고 예약 오픈 정보를 한눈에 확인할 수 있어요.', visual: '⌕' },
  { eyebrow: '02 · MAP', title: '지도에서 주변 코트를\n바로 확인하세요', text: '지도 마커를 눌러 가까운 테니스장의 예약 정보로 이동할 수 있어요.', visual: '⌖' },
  { eyebrow: '03 · REMINDER', title: '예약이 열리기 전에\n앱이 알려드릴게요', text: '상세화면에서 1일 전 또는 10분 전 알림을 선택하면 예약 사이트까지 바로 연결돼요.', visual: '◴' },
];

export function AppOnboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then((value) => {
      if (active) setVisible(value !== 'done');
    });
    return () => { active = false; };
  }, []);
  const finish = async () => { await AsyncStorage.setItem(KEY, 'done'); setVisible(false); };
  const current = steps[step];
  return <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
    <View style={styles.backdrop}><View style={styles.sheet}>
      <View style={styles.visual}><Text style={styles.visualText}>{current.visual}</Text><View style={styles.visualRing} /></View>
      <Text style={styles.eyebrow}>{current.eyebrow}</Text><Text style={styles.title}>{current.title}</Text><Text style={styles.text}>{current.text}</Text>
      <View style={styles.dots}>{steps.map((_, index) => <View key={index} style={[styles.dot, index === step && styles.dotActive]} />)}</View>
      <Pressable onPress={() => step === steps.length - 1 ? void finish() : setStep((value) => value + 1)} style={styles.primary}><Text style={styles.primaryText}>{step === steps.length - 1 ? 'Courts Korea 시작하기' : '다음'}</Text></Pressable>
      <Pressable onPress={() => void finish()} style={styles.skip}><Text style={styles.skipText}>건너뛰기</Text></Pressable>
    </View></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' }, sheet: { paddingHorizontal: 24, paddingTop: 34, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#111311', borderWidth: 1, borderColor: colors.border },
  visual: { height: 160, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18231C', overflow: 'hidden' }, visualText: { color: colors.green, fontSize: 70, fontFamily: 'Pretendard-Light', zIndex: 2 }, visualRing: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: '#326848' },
  eyebrow: { marginTop: 24, color: colors.green, fontSize: 10, fontFamily: 'Pretendard-Black', letterSpacing: 1.6 }, title: { marginTop: 10, color: colors.text, fontSize: 27, lineHeight: 36, fontFamily: 'Pretendard-Black' }, text: { marginTop: 13, color: colors.muted, fontSize: 14, lineHeight: 22 },
  dots: { marginTop: 20, flexDirection: 'row', gap: 6 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A3E3B' }, dotActive: { width: 22, backgroundColor: colors.green },
  primary: { height: 56, marginTop: 22, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green }, primaryText: { color: '#07100B', fontSize: 15, fontFamily: 'Pretendard-Black' }, skip: { paddingTop: 16, alignItems: 'center' }, skipText: { color: colors.subtle, fontSize: 12, fontFamily: 'Pretendard-Bold' },
});
