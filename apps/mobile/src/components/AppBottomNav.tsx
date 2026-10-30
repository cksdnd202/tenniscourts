import { type Href, useRouter } from 'expo-router';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import alarmActive from '@/assets/images/gnb/icon_alarm_active.png';
import alarmInactive from '@/assets/images/gnb/icon_alarm_unactive.png';
import courtActive from '@/assets/images/gnb/icon_court_active.png';
import courtInactive from '@/assets/images/gnb/icon_court_unactive.png';
import mapActive from '@/assets/images/gnb/icon_map_active.png';
import mapInactive from '@/assets/images/gnb/icon_map_unactive.png';
import profileActive from '@/assets/images/gnb/icon_profile_active.png';
import profileInactive from '@/assets/images/gnb/icon_profile_unactive.png';
import { trackEvent } from '@/lib/analytics';

export type BottomTabKey = 'search' | 'map' | 'notifications' | 'mypage';

const tabs: Array<{ key: BottomTabKey; label: string; href: Href }> = [
  { key: 'search', label: '코트', href: '/' },
  { key: 'map', label: '지도', href: '/map' as Href },
  { key: 'notifications', label: '오픈 알림', href: '/notifications' as Href },
  { key: 'mypage', label: '마이페이지', href: '/mypage' as Href },
];

const tabIcons = {
  search: {
    active: courtActive,
    inactive: courtInactive,
  },
  map: {
    active: mapActive,
    inactive: mapInactive,
  },
  notifications: {
    active: alarmActive,
    inactive: alarmInactive,
  },
  mypage: {
    active: profileActive,
    inactive: profileInactive,
  },
} as const;

export const BOTTOM_NAV_HEIGHT = 75;

const BottomNavVisibilityContext = createContext<{
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
} | null>(null);

export function AppBottomNavVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <BottomNavVisibilityContext.Provider value={{ hidden, setHidden }}>
      {children}
    </BottomNavVisibilityContext.Provider>
  );
}

export function useAppBottomNavHidden(hidden: boolean) {
  const context = useContext(BottomNavVisibilityContext);
  const setHidden = context?.setHidden;
  useEffect(() => {
    if (!setHidden) return;
    setHidden(hidden);
    return () => setHidden(false);
  }, [hidden, setHidden]);
}

export function useIsAppBottomNavHidden() {
  return useContext(BottomNavVisibilityContext)?.hidden ?? false;
}

function TabIcon({ name, selected }: { name: BottomTabKey; selected: boolean }) {
  const source = tabIcons[name][selected ? 'active' : 'inactive'];
  return <Image source={source} resizeMode="contain" style={styles.icon} />;
}

export function AppBottomNav({ active }: { active: BottomTabKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { height: BOTTOM_NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            disabled={selected}
            onPress={() => {
              if (!selected) {
                trackEvent('bottom_nav_clicked', { destination_tab: tab.key });
                router.replace(tab.href);
              }
            }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <TabIcon name={tab.key} selected={selected} />
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#ECECEC',
  },
  tab: { flex: 1, height: BOTTOM_NAV_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { color: '#9CA3B2', fontSize: 12, lineHeight: 17, fontFamily: 'Pretendard-Medium', includeFontPadding: false },
  selected: { color: '#303030', fontFamily: 'Pretendard-Bold' },
  icon: { width: 24, height: 24 },
  pressed: { opacity: 0.65 },
});
