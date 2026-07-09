import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { glass, MiniAvatar, rise, useStagger } from './shared';

const EXPENSES: { title: string; amount: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }[] = [
  { title: 'Dinner', amount: '$84', icon: 'restaurant', bg: '#301F19', fg: '#F08A6A' },
  { title: 'Uber', amount: '$32', icon: 'car', bg: '#1B2733', fg: '#8FB0CC' },
  { title: 'Tickets', amount: '$120', icon: 'ticket', bg: '#241E33', fg: '#B79BE6' },
];

const SPLITS = [
  { letter: 'R', color: '#3A63D6', amount: '$79' },
  { letter: 'M', color: '#D65C46', amount: '$79' },
  { letter: 'C', color: '#2FA968', amount: '$78' },
];

/**
 * Expense preview: tracked costs stagger in, then the total splits into
 * per-person avatar chips whose "settled" checkmarks pop in one-by-one.
 */
export function ExpenseSplitPreview({ play }: { play: number }) {
  const rows = useStagger(EXPENSES.length, play, 160, 110);
  const chips = useStagger(SPLITS.length, play, 780, 130);
  const checks = useStagger(SPLITS.length, play, 1220, 170);
  const settled = useStagger(1, play, 1780)[0];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.headTitle}>Trip expenses</Text>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>$236 tracked</Text>
        </View>
      </View>

      {EXPENSES.map((expense, index) => (
        <Animated.View key={expense.title} style={[styles.row, rise(rows[index], 16)]}>
          <View style={[styles.rowIcon, { backgroundColor: expense.bg }]}>
            <Ionicons name={expense.icon} size={15} color={expense.fg} />
          </View>
          <Text style={styles.rowTitle}>{expense.title}</Text>
          <Text style={styles.rowAmount}>{expense.amount}</Text>
        </Animated.View>
      ))}

      <View style={styles.divider} />
      <View style={styles.splitHead}>
        <Text style={styles.splitLabel}>Split 3 ways</Text>
        <Animated.View style={[styles.settledPill, rise(settled, 8)]}>
          <Ionicons name="checkmark-circle" size={13} color={colors.green} />
          <Text style={styles.settledText}>Settled</Text>
        </Animated.View>
      </View>

      <View style={styles.chipsRow}>
        {SPLITS.map((split, index) => {
          const checkScale = checks[index].interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.3, 1] });
          return (
            <Animated.View key={split.letter} style={[styles.chip, rise(chips[index], 14)]}>
              <MiniAvatar letter={split.letter} color={split.color} />
              <Text style={styles.chipAmount}>{split.amount}</Text>
              <Animated.View style={[styles.check, { opacity: checks[index], transform: [{ scale: checkScale }] }]}>
                <Ionicons name="checkmark" size={10} color="#0E1217" />
              </Animated.View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 304, borderRadius: 22, padding: 16, ...glass, ...shadows.float },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  totalPill: { backgroundColor: '#182B45', borderRadius: radii.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  totalPillText: { fontSize: 11.5, fontWeight: '800', color: '#8FB4FF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink },
  rowAmount: { fontSize: 14, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.09)', marginVertical: 10 },
  splitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  splitLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink2 },
  settledPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#123024', borderRadius: radii.pill, paddingHorizontal: 9, height: 24 },
  settledText: { fontSize: 11, fontWeight: '800', color: '#4FD39E' },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  chipAmount: { fontSize: 12.5, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  check: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});
