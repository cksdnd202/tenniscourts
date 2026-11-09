import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import locationPermissionImage from '@/assets/images/onboarding/location-permission-v2.png';

type LocationDialogMode = 'permission' | 'services';

type Props = {
  action?: ReactNode;
  busy?: boolean;
  mode: LocationDialogMode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  visible: boolean;
};

const copy = {
  permission: {
    title: '위치 권한이 꺼져 있어요',
    description: '현재 위치 주변의 테니스장을 보려면 휴대폰 설정에서 위치 권한을 허용해주세요.',
    confirm: '설정으로 이동',
  },
  services: {
    title: '휴대폰 위치가 꺼져 있어요',
    description: '현재 위치를 확인하려면 휴대폰의 위치 서비스를 켜주세요.',
    confirm: '위치 켜기',
  },
} satisfies Record<LocationDialogMode, { title: string; description: string; confirm: string }>;

export function LocationPermissionDialog({ action, busy = false, mode, onCancel, onConfirm, visible }: Props) {
  if (!visible) return null;

  const content = action && mode === 'permission'
    ? { ...copy.permission, description: '현재 위치를 이용해 가까운 운동 시설을 찾고 지도에서 위치를 확인해 보세요.' }
    : copy[mode];

  return (
    <View style={styles.layer}>
      <Pressable accessibilityLabel="위치 권한 안내 닫기" disabled={busy} onPress={onCancel} style={styles.backdrop} />
      <View accessibilityViewIsModal style={styles.dialog}>
        <View style={styles.header}>
          <Text style={styles.title}>{content.title}</Text>
          <Pressable
            accessibilityLabel="닫기"
            disabled={busy}
            onPress={onCancel}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <Image
          alt="현재 위치 주변 테니스장 안내"
          contentFit="contain"
          source={locationPermissionImage}
          style={styles.illustration}
        />

        <Text style={styles.description}>{content.description}</Text>

        <View style={styles.actions}>
          {!action ? <Pressable
            disabled={busy}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>취소</Text>
          </Pressable> : null}
          {action ?? <Pressable
            disabled={busy}
            onPress={() => void onConfirm()}
            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>{content.confirm}</Text>}
          </Pressable>}
        </View>
        {action && mode === 'permission' ? (
          <Pressable disabled={busy} onPress={() => void onConfirm()} style={{alignItems:'center',paddingTop:14,paddingBottom:4}}>
            <Text style={{color:'#5F5F5F',fontSize:14}}>설정에서 위치 허용</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    elevation: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  dialog: {
    width: '89.7%',
    maxWidth: 350,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-start' },
  title: {
    flex: 1,
    paddingRight: 8,
    color: '#3A3A3A',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontFamily: 'Pretendard-Bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    marginTop: -1,
    marginRight: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F1F1',
  },
  closeText: {
    marginTop: -2,
    color: '#111111',
    fontSize: 34,
    lineHeight: 36,
    fontFamily: 'Pretendard-Light',
  },
  illustration: { alignSelf: 'center', width: 260, height: 260, marginTop: 4 },
  description: {
    marginTop: 7,
    color: '#5F5F5F',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.35,
    fontFamily: 'Pretendard-Regular',
  },
  actions: { height: 52, marginTop: 18, flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#30C27C',
  },
  cancelText: { color: '#303030', fontSize: 18, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  confirmText: { color: '#FFFFFF', fontSize: 17, lineHeight: 24, fontFamily: 'Pretendard-Bold' },
  pressed: { opacity: 0.68 },
});
