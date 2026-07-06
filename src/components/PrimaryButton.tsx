import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'blue';
type Size = 'default' | 'small';

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.default,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, size === 'small' && styles.labelSmall, variantLabelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.sm - 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  default: {
    height: 54,
    paddingHorizontal: 20,
  },
  small: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 13,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 14,
  },
});

const variantStyles: Record<Variant, object> = StyleSheet.create({
  primary: { backgroundColor: colors.btn },
  secondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', height: 44 },
  blue: { backgroundColor: colors.blue },
});

const variantLabelStyles: Record<Variant, object> = StyleSheet.create({
  primary: { color: '#FFFFFF' },
  secondary: { color: colors.ink },
  ghost: { color: colors.ink2 },
  blue: { color: '#FFFFFF' },
});
