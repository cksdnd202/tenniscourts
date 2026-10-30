import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import arrowLeft from '@/assets/images/navigation/icon_arrow_outline_left.svg';
import arrowRight from '@/assets/images/navigation/icon_arrow_outline_right.svg';

const arrowSources = {
  left: arrowLeft,
  right: arrowRight,
};

export function NavigationArrow({ direction }: { direction: keyof typeof arrowSources }) {
  return <Image alt="" source={arrowSources[direction]} contentFit="contain" style={styles.icon} />;
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24 },
});
