import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, type } from '@/theme';

const TOTAL_STEPS = 5;

export function StepHeader({
  step,
  title,
  subtitle,
  onBack,
  onClose,
}: {
  step: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconButton} onPress={onBack} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={type.cap}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <Pressable style={styles.iconButton} onPress={onClose} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={[type.sub, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  track: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: '#EAE7DE',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    marginTop: -6,
  },
});
