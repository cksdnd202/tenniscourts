import { requireNativeViewManager } from 'expo-modules-core';
import { Alert, Platform, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentType } from 'react';

type Props = {
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  onResult: (event: { nativeEvent: { granted: boolean } }) => void;
  onError?: (event: { nativeEvent: { message: string } }) => void;
};
const NativeButton = Platform.OS === 'android'
  ? requireNativeViewManager<Props>('CourtsLocationButton') as ComponentType<Props>
  : null;
export function AndroidLocationButton(props: Props) {
  if (!NativeButton) return null;
  return <NativeButton {...props} onError={props.onError ?? (() => Alert.alert('위치 확인', '위치 버튼을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.'))} />;
}
