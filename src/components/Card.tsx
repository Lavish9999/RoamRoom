import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows } from '@/theme';

export function Card({
  children,
  onPress,
  padded,
  selected,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = [styles.card, padded && styles.padded, selected && styles.selected, style];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...content, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={content}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  padded: {
    padding: 18,
  },
  selected: {
    borderColor: colors.blue,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.92,
  },
});
