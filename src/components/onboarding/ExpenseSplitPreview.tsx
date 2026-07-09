import { Ionicons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { MiniAvatar, panel, pop, rise, useStagger } from './shared';

const BUDGET_CHIPS: { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }[] = [
  { label: 'Mid-range', icon: 'options', bg: colors.softBlue, fg: colors.blue },
  { label: '$120/day', icon: 'wallet', bg: colors.softYellow, fg: '#B7791F' },
  { label: 'Split evenly', icon: 'people', bg: colors.softMint, fg: '#0FA47F' },
];

const EXPENSES: { title: string; amount: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; payer: { letter: string; color: string } }[] = [
  { title: 'Dinner', amount: '$84', icon: 'restaurant', bg: colors.softCoral, fg: '#E5533C', payer: { letter: 'R', color: '#4A90D9' } },
  { title: 'Uber', amount: '$32', icon: 'car', bg: colors.softBlue, fg: colors.blue, payer: { letter: 'M', color: '#FF8A65' } },
  { title: 'Tickets', amount: '$120', icon: 'ticket', bg: colors.softYellow, fg: '#B7791F', payer: { letter: 'C', color: '#34B37E' } },
];

/**
 * Slide 3 hero: budget chips snap into place, real expense rows (with who
 * paid) stagger in, and each row resolves with a mint "settled" check —
 * ending on an all-square summary.
 */
export function ExpenseSplitPreview({ play }: { play: number }) {
  const chips = useStagger(BUDGET_CHIPS.length, play, 140, 110);
  const rows = useStagger(EXPENSES.length, play, 520, 130);
  const checks = useStagger(EXPENSES.length, play, 1050, 180);
  const settled = useStagger(1, play, 1700)[0];

  return (
    <View style={styles.stage}>
      <View style={styles.chipRow}>
        {BUDGET_CHIPS.map((chip, index) => (
          <Animated.View key={chip.label} style={[styles.budgetChip, { backgroundColor: chip.bg }, pop(chips[index])]}>
            <Ionicons name={chip.icon} size={13} color={chip.fg} />
            <Text style={[styles.budgetChipText, { color: chip.fg }]}>{chip.label}</Text>
          </Animated.View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.head}>
          <Text style={styles.headTitle}>Trip expenses</Text>
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>$236 tracked</Text>
          </View>
        </View>

        {EXPENSES.map((expense, index) => {
          const checkStyle = pop(checks[index]);
          return (
            <Animated.View key={expense.title} style={[styles.row, rise(rows[index], 16)]}>
              <View style={[styles.rowIcon, { backgroundColor: expense.bg }]}>
                <Ionicons name={expense.icon} size={15} color={expense.fg} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{expense.title}</Text>
                <View style={styles.payerRow}>
                  <MiniAvatar letter={expense.payer.letter} color={expense.payer.color} size={16} />
                  <Text style={styles.payerText}>{expense.payer.letter === 'R' ? 'You paid' : `${expense.payer.letter} paid`}</Text>
                </View>
              </View>
              <Text style={styles.rowAmount}>{expense.amount}</Text>
              <Animated.View style={[styles.check, checkStyle]}>
                <Ionicons name="checkmark" size={11} color="#FFFFFF" />
              </Animated.View>
            </Animated.View>
          );
        })}

        <View style={styles.divider} />
        <Animated.View style={[styles.settledRow, rise(settled, 10)]}>
          <View style={styles.settledPill}>
            <Ionicons name="checkmark-circle" size={14} color="#0FA47F" />
            <Text style={styles.settledText}>All settled</Text>
          </View>
          <Text style={styles.settledMeta}>$79 each · no one owes</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 312, gap: 12 },
  chipRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  budgetChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: radii.pill, ...shadows.card },
  budgetChipText: { fontSize: 12.5, fontWeight: '800' },
  card: { borderRadius: 24, padding: 16, ...panel, ...shadows.float },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  totalPill: { backgroundColor: colors.softBlue, borderRadius: radii.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  totalPillText: { fontSize: 11.5, fontWeight: '800', color: colors.blue },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14.5, fontWeight: '800', color: colors.ink },
  payerRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  payerText: { fontSize: 11.5, fontWeight: '600', color: colors.ink2 },
  rowAmount: { fontSize: 14.5, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(16,24,40,0.10)', marginVertical: 10 },
  settledRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settledPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.softMint, borderRadius: radii.pill, paddingHorizontal: 11, height: 28 },
  settledText: { fontSize: 12, fontWeight: '800', color: '#0FA47F' },
  settledMeta: { fontSize: 12, fontWeight: '700', color: colors.ink2 },
});
