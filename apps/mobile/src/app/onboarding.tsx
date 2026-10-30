import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import onboarding01 from '../../assets/images/onboarding/onboarding-01.png';
import onboarding02 from '../../assets/images/onboarding/onboarding-02.png';
import onboarding03 from '../../assets/images/onboarding/onboarding-03.png';
import { trackEvent } from '@/lib/analytics';
import { useAuthFlow } from '@/lib/authFlow';
import { useMountedRef } from '@/lib/useMountedRef';

const PAGES = [
  {
    id: 'booking-complexity',
    image: onboarding01,
    message: '테니스장별 복잡한 예약정보,\n확인하기 어려우신가요?',
  },
  {
    id: 'booking-information',
    image: onboarding02,
    message: '코츠코리아에서\n예약 오픈 정보를 확인해보세요',
  },
  {
    id: 'notification',
    image: onboarding03,
    message: '원하는 테니스장의 예약이 열리기 전에\n알림을 드릴게요',
  },
] as const;

type OnboardingPage = (typeof PAGES)[number];

function Chevron({ direction, color }: { direction: 'left' | 'right'; color: string }) {
  return <View style={[styles.chevron, { borderColor: color }, direction === 'left' ? styles.chevronLeft : styles.chevronRight]} />;
}

export default function OnboardingScreen() {
  const mountedRef = useMountedRef();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<OnboardingPage>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { completeOnboarding } = useAuthFlow();
  const completionInFlightRef = useRef(false);
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const finish = async (completionMethod: 'completed' | 'skipped') => {
    if (completionInFlightRef.current) return;
    completionInFlightRef.current = true;
    setFinishing(true);
    try {
      await completeOnboarding();
      trackEvent('onboarding_completed', { completion_method: completionMethod });
    } catch (cause) {
      if (mountedRef.current) {
        Alert.alert('시작하지 못했습니다', cause instanceof Error ? cause.message : '잠시 후 다시 시도해 주세요.');
        setFinishing(false);
      }
      completionInFlightRef.current = false;
    }
  };

  const moveTo = (nextPage: number) => {
    const target = Math.max(0, Math.min(PAGES.length - 1, nextPage));
    setPage(target);
    listRef.current?.scrollToIndex({ index: target, animated: true });
  };

  const handleNext = () => {
    if (page === PAGES.length - 1) {
      void finish('completed');
      return;
    }
    moveTo(page + 1);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const lastTransitionRange = [width, width * 2];
  const nextButtonWidth = scrollX.interpolate({
    inputRange: lastTransitionRange,
    outputRange: [50, 92],
    extrapolate: 'clamp',
  });
  const startLabelOpacity = scrollX.interpolate({
    inputRange: [width * 1.35, width * 1.8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const startLabelWidth = scrollX.interpolate({
    inputRange: lastTransitionRange,
    outputRange: [0, 43],
    extrapolate: 'clamp',
  });
  const backButtonOpacity = scrollX.interpolate({
    inputRange: [0, width * 0.65, width],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Animated.FlatList
          ref={listRef}
          data={PAGES}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          keyExtractor={(item) => item.id}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={handleMomentumEnd}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          renderItem={({ item }) => (
            <View style={[styles.page, { width }]}>
              <Image
                alt={`${item.id} 온보딩 일러스트`}
                contentFit="contain"
                source={item.image}
                style={styles.illustration}
              />
              <Text style={styles.message}>{item.message}</Text>
            </View>
          )}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
        />

        <View pointerEvents="none" style={styles.pagination}>
          {PAGES.map((item, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const indicatorWidth = scrollX.interpolate({ inputRange, outputRange: [8, 33, 8], extrapolate: 'clamp' });
            const indicatorColor = scrollX.interpolate({
              inputRange,
              outputRange: ['#D9D9D9', '#30C27C', '#D9D9D9'],
              extrapolate: 'clamp',
            });
            return <Animated.View key={item.id} style={[styles.indicator, { width: indicatorWidth, backgroundColor: indicatorColor }]} />;
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="온보딩 건너뛰기"
          disabled={finishing}
          onPress={() => void finish('skipped')}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </Pressable>

        <View style={styles.navigationButtons}>
          <Animated.View style={[styles.backButtonWrap, { opacity: backButtonOpacity }]} pointerEvents={page > 0 ? 'auto' : 'none'}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 안내"
              onPress={() => moveTo(page - 1)}
              style={({ pressed }) => [styles.roundButton, styles.backButton, pressed && styles.pressed]}>
              <Chevron color="#C6C5C9" direction="left" />
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.nextButtonWrap, { width: nextButtonWidth }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={page === PAGES.length - 1 ? '시작' : '다음 안내'}
              disabled={finishing}
              onPress={handleNext}
              style={({ pressed }) => [styles.nextButton, pressed && !finishing && styles.pressed, finishing && styles.disabled]}>
              {finishing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.nextButtonContent}>
                  <Animated.View style={[styles.startLabelWrap, { width: startLabelWidth, opacity: startLabelOpacity }]}>
                    <Text numberOfLines={1} style={styles.startLabel}>
                      시작
                    </Text>
                  </Animated.View>
                  <Chevron color="#FFFFFF" direction="right" />
                </View>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flex: 1, alignItems: 'center' },
  illustration: {
    position: 'absolute',
    top: '17.2%',
    width: 315,
    height: 315,
  },
  message: {
    position: 'absolute',
    top: '59.7%',
    paddingHorizontal: 28,
    color: '#393939',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
    textAlign: 'center',
    fontFamily: 'Pretendard-Bold',
  },
  pagination: {
    position: 'absolute',
    top: '69.4%',
    left: 0,
    right: 0,
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  indicator: { height: 8, borderRadius: 4 },
  skipButton: {
    position: 'absolute',
    left: 20,
    bottom: '13%',
    height: 50,
    justifyContent: 'center',
  },
  skipText: { color: '#A2A2A2', fontSize: 18, lineHeight: 25, letterSpacing: -0.36, fontFamily: 'Pretendard-Bold' },
  navigationButtons: {
    position: 'absolute',
    right: 24,
    bottom: '13%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButtonWrap: { width: 50, height: 50 },
  roundButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  backButton: { backgroundColor: '#F2F2F2' },
  nextButtonWrap: { height: 50, borderRadius: 25, overflow: 'hidden' },
  nextButton: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#30C27C',
  },
  nextButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  startLabelWrap: { overflow: 'hidden' },
  startLabel: { color: '#FFFFFF', fontSize: 20, lineHeight: 26, letterSpacing: -0.4, fontFamily: 'Pretendard-Bold' },
  chevron: { width: 12, height: 12, borderTopWidth: 2, borderRightWidth: 2, borderRadius: 1 },
  chevronRight: { transform: [{ rotate: '45deg' }, { translateX: -1 }] },
  chevronLeft: { transform: [{ rotate: '-135deg' }, { translateX: -1 }] },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.7 },
});
