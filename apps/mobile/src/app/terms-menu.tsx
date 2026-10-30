import { StatusBar } from 'expo-status-bar';
import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavigationArrow } from '@/components/NavigationArrow';

function Chevron() { return <NavigationArrow direction="right" />; }
export default function TermsMenuScreen() {
  const router = useRouter();
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><StatusBar style="dark" />
    <Pressable accessibilityLabel="뒤로가기" onPress={() => router.back()} style={styles.back}><NavigationArrow direction="left" /></Pressable>
    <Text style={styles.title}>약관</Text>
    <View style={styles.rows}>
      <Pressable onPress={() => router.push('/legal/privacy' as Href)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Text style={styles.label}>개인정보처리방침</Text><Chevron /></Pressable>
      <Pressable onPress={() => router.push('/legal/terms' as Href)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Text style={styles.label}>이용약관</Text><Chevron /></Pressable>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#FFF' }, back: { width: 64, height: 64, justifyContent: 'center', paddingLeft: 16 }, title: { marginTop: 18, paddingHorizontal: 16, color: '#202020', fontSize: 28, fontFamily: 'Pretendard-Regular' }, rows: { marginTop: 34 }, row: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }, pressed: { backgroundColor: '#F4F4F4' }, label: { flex: 1, color: '#303030', fontSize: 17 } });
