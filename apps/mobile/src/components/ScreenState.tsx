import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { SportLoadingIndicator } from '@/components/SportLoadingIndicator';

type StateTone = 'light' | 'dark';

type BaseStateProps = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: StateTone;
};

type MessageStateProps = BaseStateProps & {
  actionLabel?: string;
  action?: ReactNode;
  description?: string;
  icon?: ReactNode;
  onAction?: () => void;
  title: string;
};

export function LoadingState({ compact = false, label, style, tone = 'light' }: BaseStateProps & { label?: string }) {
  return (
    <View accessibilityLabel={label ?? '불러오는 중'} style={[styles.root, compact && styles.compact, style]}>
      <SportLoadingIndicator />
      {label ? <Text style={[styles.description, tone === 'dark' && styles.darkDescription]}>{label}</Text> : null}
    </View>
  );
}

function MessageState({
  actionLabel,
  action,
  compact = false,
  description,
  icon,
  onAction,
  title,
  tone = 'light',
  style,
  variant,
}: MessageStateProps & { variant: 'error' | 'empty' }) {
  const dark = tone === 'dark';
  return (
    <View accessibilityRole={variant === 'error' ? 'alert' : undefined} style={[styles.root, compact && styles.compact, style]}>
      <View style={[styles.icon, dark && styles.darkIcon]}>
        {icon ?? (variant === 'error'
          ? <Text style={[styles.iconText, dark && styles.darkIconText]}>!</Text>
          : <View style={[styles.emptyGlyph, dark && styles.darkEmptyGlyph]}><View style={[styles.emptyGlyphLine, dark && styles.darkEmptyGlyphLine]} /></View>)}
      </View>
      <Text style={[styles.title, dark && styles.darkTitle]}>{title}</Text>
      {description ? <Text style={[styles.description, dark && styles.darkDescription]}>{description}</Text> : null}
      {action ?? (onAction && actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null)}
    </View>
  );
}

export function ErrorState({
  actionLabel = '다시 시도',
  description = '인터넷 연결을 확인하고 다시 시도해 주세요.',
  onAction,
  title = '정보를 불러오지 못했어요',
  ...props
}: Partial<Pick<MessageStateProps, 'title'>> & Omit<MessageStateProps, 'title'>) {
  return <MessageState {...props} actionLabel={actionLabel} description={description} onAction={onAction} title={title} variant="error" />;
}

export function EmptyState(props: MessageStateProps) {
  return <MessageState {...props} variant="empty" />;
}

const styles = StyleSheet.create({
  root: { minHeight: 300, paddingHorizontal: 28, paddingVertical: 52, alignItems: 'center', justifyContent: 'center' },
  compact: { minHeight: 190, paddingVertical: 28 },
  icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: '#F1F3F2' },
  darkIcon: { backgroundColor: '#292B2A' },
  iconText: { color: '#858A87', fontSize: 24, lineHeight: 28, fontFamily: 'Pretendard-SemiBold' },
  darkIconText: { color: '#A9AEAB' },
  emptyGlyph: { width: 25, height: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#858A87', borderRadius: 4 },
  darkEmptyGlyph: { borderColor: '#A9AEAB' },
  emptyGlyphLine: { width: 9, height: 2, borderRadius: 1, backgroundColor: '#858A87' },
  darkEmptyGlyphLine: { backgroundColor: '#A9AEAB' },
  title: { marginTop: 18, color: '#303230', fontSize: 18, lineHeight: 25, letterSpacing: -0.18, textAlign: 'center', fontFamily: 'Pretendard-Bold' },
  darkTitle: { color: '#FFFFFF' },
  description: { maxWidth: 300, marginTop: 8, color: '#8A8F8C', fontSize: 14, lineHeight: 21, letterSpacing: -0.14, textAlign: 'center', fontFamily: 'Pretendard-Regular' },
  darkDescription: { color: '#9A9E9C' },
  button: { minWidth: 120, height: 44, marginTop: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#30C27C' },
  buttonPressed: { opacity: 0.72 },
  buttonText: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontFamily: 'Pretendard-SemiBold' },
});
