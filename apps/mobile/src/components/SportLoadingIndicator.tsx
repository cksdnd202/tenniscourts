import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const SPORT_FRAMES = [
  require('../../assets/images/loading/loading-badminton.svg'),
  require('../../assets/images/loading/loading-basketball.svg'),
  require('../../assets/images/loading/loading-soccer.svg'),
  require('../../assets/images/loading/loading-tabletennis.svg'),
  require('../../assets/images/loading/loading-tennis.svg'),
] as const;

type SportLoadingIndicatorProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function SportLoadingIndicator({
  size = 30,
  style,
  accessibilityLabel = '불러오는 중',
}: SportLoadingIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % SPORT_FRAMES.length);
    }, 180);
    return () => clearInterval(timer);
  }, []);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={[styles.root, { width: size, height: size }, style]}>
      <ExpoImage source={SPORT_FRAMES[frameIndex]} contentFit="contain" style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
