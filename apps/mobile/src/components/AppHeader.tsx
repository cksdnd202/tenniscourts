import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import brandMark from '@/assets/images/brand-mark.png';
import brandWord from '@/assets/images/brand-word.png';
import searchIcon from '@/assets/images/header/icon_search_dark.png';

type Props = {
  title?: string;
  showBrand?: boolean;
  playBrandIntro?: boolean;
  onSearch?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function AppHeader({ title, showBrand = false, playBrandIntro = false, onSearch, left, right }: Props) {
  const [koreanOpacity] = useState(() => new Animated.Value(playBrandIntro ? 1 : 0));
  const [koreanX] = useState(() => new Animated.Value(0));
  const [englishOpacity] = useState(() => new Animated.Value(playBrandIntro ? 0 : 1));
  const [englishX] = useState(() => new Animated.Value(playBrandIntro ? -26 : 0));

  useEffect(() => {
    if (!showBrand || !playBrandIntro) return;
    let exitAnimation: Animated.CompositeAnimation | null = null;
    let enterAnimation: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      exitAnimation = Animated.parallel([
        Animated.timing(koreanOpacity, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(koreanX, { toValue: -105, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]);
      exitAnimation.start(({ finished }) => {
        if (!finished) return;
        enterAnimation = Animated.parallel([
          Animated.timing(englishOpacity, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(englishX, { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]);
        enterAnimation.start();
      });
    }, 3000);
    return () => {
      clearTimeout(timer);
      exitAnimation?.stop();
      enterAnimation?.stop();
    };
  }, [englishOpacity, englishX, koreanOpacity, koreanX, playBrandIntro, showBrand]);

  return (
    <View style={styles.header}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.titleArea}>
        {showBrand ? (
          <View style={styles.brand}>
            <Image source={brandMark} resizeMode="contain" style={styles.brandMark} />
            {playBrandIntro ? (
              <Animated.Text style={[styles.koreanBrand, { opacity: koreanOpacity, transform: [{ translateX: koreanX }] }]}>코츠 코리아</Animated.Text>
            ) : null}
            <Animated.Image
              source={brandWord}
              resizeMode="contain"
              style={[styles.brandWord, { opacity: englishOpacity, transform: [{ translateX: englishX }] }]}
            />
          </View>
        ) : (
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
        )}
      </View>
      <View style={styles.actions}>
        {onSearch ? (
          <Pressable accessibilityRole="button" accessibilityLabel="테니스장 검색" onPress={onSearch} style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
            <Image source={searchIcon} resizeMode="contain" style={styles.searchIcon} />
          </Pressable>
        ) : null}
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 63, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECECEC', backgroundColor: '#FFFFFF' },
  left: { marginRight: 8 },
  titleArea: { flex: 1, minWidth: 0 },
  title: { color: '#282828', fontSize: 22, lineHeight: 30, letterSpacing: -0.22, fontFamily: 'Pretendard-Bold' },
  actions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchIcon: { width: 23, height: 23 },
  pressed: { opacity: 0.55 },
  brand: { height: 38, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  brandMark: { width: 22, height: 29, zIndex: 3, backgroundColor: '#FFFFFF' },
  brandWord: { width: 157, height: 28, marginLeft: 3 },
  koreanBrand: { position: 'absolute', left: 32, color: '#3A3A3A', fontSize: 18, lineHeight: 24, letterSpacing: -0.18, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
});
