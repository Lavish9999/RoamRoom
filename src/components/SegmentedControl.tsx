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
    backgroundColor: '#EEF1F5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentOn: {
    backgroundColor: colors.btn,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.ink2,
  },
  labelOn: {
    color: '#FFFFFF',
  },
});
