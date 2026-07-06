import { StyleSheet, Text, View } from 'react-native';

import { chipVariants, radii, type ChipVariant } from '@/theme';

export function Chip({ variant, label }: { variant: ChipVariant; label: string }) {
  const { bg, fg, dot } = chipVariants[variant];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
