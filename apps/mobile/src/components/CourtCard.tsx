import { type Href, useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import bookmarkActive from '@/assets/images/bookmark-active.png';
import bookmarkInactive from '@/assets/images/bookmark-inactive.png';
import { courtRoute, type AppCourt } from '@/lib/courtData';
import { getRuleScheduleLabel, getRuleTargetLabel } from '@/lib/courtNotifications';

type Props = {
  court: AppCourt;
  compact?: boolean;
  favorite?: boolean;
  onOpen?: (court: AppCourt) => void;
  onToggleFavorite?: (court: AppCourt) => void;
};

export function CourtCard({ court, compact = false, favorite = false, onOpen, onToggleFavorite }: Props) {
  const router = useRouter();
  const displayedRules = court.rules.slice(0, 3);
  const distanceLabel = formatDistance(court.distance_meters);
  const isBadminton = court.sport_type === 'badminton';
  const venueLabel = court.sport_type === 'badminton' ? '배드민턴장' : '테니스장';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${court.basic_court_name || venueLabel} 상세 보기`}
      onPress={() => {
        if (onOpen) onOpen(court);
        else router.push(courtRoute(court) as Href);
      }}
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}>
      <View style={[styles.headerRow, compact && styles.compactHeaderRow]}>
        <View style={styles.titleWrap}>
          <Text numberOfLines={1} style={[styles.title, compact && styles.compactTitle]}>{court.basic_court_name || `이름 없는 ${venueLabel}`}</Text>
          <View style={styles.addressRow}>
            <LocationPin />
            <Text numberOfLines={1} style={styles.address}>{court.basic_address || [court.basic_region, court.basic_city].filter(Boolean).join(' ') || '주소 정보 확인 중'}</Text>
            {distanceLabel ? <View style={styles.distanceBadge}><Text style={styles.distanceText}>{distanceLabel}</Text></View> : null}
          </View>
        </View>
        {onToggleFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? '찜 해제' : '찜하기'}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite(court);
            }}
            style={({ pressed }) => [styles.bookmarkButton, pressed && styles.bookmarkPressed]}>
            <Image
              alt=""
              source={favorite
                ? bookmarkActive
                : bookmarkInactive}
              resizeMode="contain"
              style={styles.bookmark}
            />
          </Pressable>
        ) : null}
      </View>

      {!compact ? (
        <View style={[styles.openInfo, isBadminton && styles.openInfoBadminton, !displayedRules.length && styles.emptyOpenInfo]}>
          {displayedRules.length ? (
            <>
              <Text style={styles.openInfoTitle}>예약 오픈 정보 {court.rules.length}개</Text>
              {displayedRules.map((rule) => (
                <Text key={rule.id} numberOfLines={1} ellipsizeMode="tail" style={styles.ruleRow}>
                  <Text style={[styles.ruleTarget, isBadminton && styles.ruleTargetBadminton]}>{getRuleTargetLabel(rule)} : </Text>
                  <Text style={styles.ruleSchedule}>{getRuleScheduleLabel(rule) || '예약 일정 확인 중'}</Text>
                </Text>
              ))}
            </>
          ) : <Text style={styles.emptyRule}>예약 오픈 정보 없음</Text>}
        </View>
      ) : null}
    </Pressable>
  );
}

function formatDistance(distanceMeters: number | null | undefined) {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
  const kilometers = distanceMeters / 1000;
  if (kilometers < 10) return `${Math.max(0.1, kilometers).toFixed(1)}km`;
  return `${Math.round(kilometers)}km`;
}

function LocationPin() {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinShape}><View style={styles.pinHole} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 1px 10px rgba(0, 0, 0, 0.10)',
  },
  compact: { minHeight: 76, paddingVertical: 14 },
  pressed: { backgroundColor: '#F7F7F7', transform: [{ scale: 0.995 }] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  compactHeaderRow: { alignItems: 'center' },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { color: '#3A3A3A', fontSize: 16, lineHeight: 22, letterSpacing: -0.16, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  compactTitle: { fontSize: 16, lineHeight: 21 },
  addressRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { flexShrink: 1, color: '#979797', fontSize: 14, lineHeight: 20, letterSpacing: -0.14, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  distanceBadge: { height: 20, marginLeft: 3, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F0F0F0' },
  distanceText: { color: '#3A3A3A', fontSize: 12, lineHeight: 16, letterSpacing: -0.12, fontFamily: 'Pretendard-Bold', includeFontPadding: false },
  pinWrap: { width: 10, height: 14, alignItems: 'center', justifyContent: 'center' },
  pinShape: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderBottomRightRadius: 2, backgroundColor: '#D2D2D2', transform: [{ rotate: '45deg' }] },
  pinHole: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  bookmarkButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bookmarkPressed: { opacity: 0.55 },
  bookmark: { width: 27, height: 27 },
  openInfo: { alignSelf: 'stretch', marginTop: 12, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 8, borderRadius: 8, backgroundColor: '#F4FAEE' },
  openInfoBadminton: { backgroundColor: '#EDF3FF' },
  emptyOpenInfo: { paddingVertical: 10 },
  openInfoTitle: { color: '#939393', fontSize: 12, lineHeight: 19, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
  ruleRow: { height: 21, color: '#666666', fontSize: 14, lineHeight: 21, fontFamily: 'Pretendard-SemiBold', includeFontPadding: false },
  ruleTarget: { color: '#06AD5D', fontFamily: 'Pretendard-SemiBold' },
  ruleTargetBadminton: { color: '#337DFF' },
  ruleSchedule: { color: '#666666', fontFamily: 'Pretendard-SemiBold' },
  emptyRule: { color: '#939393', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-Regular', includeFontPadding: false },
});
