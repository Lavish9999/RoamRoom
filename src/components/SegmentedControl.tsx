import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} onPress={() => onChange(option)} style={[styles.segment, active && styles.segmentOn]}>
            <Text style={[styles.label, active && styles.labelOn]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#2A323D',
    borderRadius: 15,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentOn: {
    backgroundColor: colors.card,
    shadowColor: 'rgba(16,21,28,1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink2,
  },
  labelOn: {
    color: colors.ink,
  },
});
