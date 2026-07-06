import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/theme';

export function PillButton({
  label,
  selected,
  onPress,
  badgeCount,
  large,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  badgeCount?: number;
  large?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        large && styles.pillLarge,
        selected && styles.pillOn,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelOn]}>{label}</Text>
      {typeof badgeCount === 'number' && badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillLarge: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  pillOn: {
    backgroundColor: colors.btn,
    borderColor: colors.btn,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink2,
  },
  labelOn: {
    color: '#FFFFFF',
  },
  badge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
