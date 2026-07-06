import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton } from '@/components';
import { calculateSettlements, type ExpenseCategory, type TripExpense } from '@/data/expenses';
import type { Member } from '@/data/types';
import { useExpenses } from '@/state/useExpenses';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';

const categoryOptions: ExpenseCategory[] = ['lodging', 'food', 'transport', 'activity', 'shopping', 'other'];

const categoryMeta: Record<ExpenseCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  lodging: { label: 'Lodging', icon: 'bed-outline', bg: '#F0EBFA', fg: '#7455B0' },
  food: { label: 'Food', icon: 'restaurant-outline', bg: '#FFF0EA', fg: '#CE5A3C' },
  transport: { label: 'Transit', icon: 'train-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  activity: { label: 'Activity', icon: 'sparkles-outline', bg: '#EEF3FF', fg: '#3563D9' },
  shopping: { label: 'Shopping', icon: 'bag-outline', bg: '#FFF4E3', fg: '#B87A16' },
  other: { label: 'Other', icon: 'receipt-outline', bg: '#F1EFE9', fg: '#72706A' },
};

function formatMoney(amount: number, currency: 'USD' | 'JPY' = 'USD') {
  if (currency === 'JPY') return `¥${Math.round(amount)}`;
  return `$${amount.toFixed(2)}`;
}

export default function ExpensesScreen() {
  const { trips, isReady: tripsReady } = useTrips();
  const trip = trips[0];
  const { expenses, addExpense, removeExpense } = useExpenses(trip?.id);
  const [isAdding, setIsAdding] = useState(false);

  const membersById = useMemo(() => new Map((trip?.members ?? []).map((member) => [member.id, member])), [trip?.members]);
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const settlements = useMemo(() => calculateSettlements(expenses, trip?.members ?? []), [expenses, trip?.members]);
  const categoryTotals = useMemo(
    () =>
      expenses.reduce<Record<ExpenseCategory, number>>(
        (totals, expense) => {
          totals[expense.category] += expense.amount;
          return totals;
        },
        { lodging: 0, food: 0, transport: 0, activity: 0, shopping: 0, other: 0 },
      ),
    [expenses],
  );

  if (!tripsReady) {
    return <Centered title="Loading expenses" copy="Getting your saved group costs ready." />;
  }

  if (!trip) {
    return <Centered title="Create a trip first" copy="Create a trip, then shared expenses and balances will live here." action="Create trip" />;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={type.eyebrow}>Shared costs</Text>
            <Text style={styles.h1}>Trip expenses</Text>
            <Text style={type.sub}>
              {expenses.length} expenses · {trip.members.length} travelers · {settlements.length ? `${settlements.length} balances open` : 'everyone square'}
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setIsAdding(true)} accessibilityLabel="Add expense">
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <Card padded style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={type.eyebrow}>Total tracked</Text>
              <Text style={styles.totalText}>{formatMoney(total)}</Text>
            </View>
            <View style={[styles.statusPill, settlements.length ? styles.statusOpen : styles.statusDone]}>
              <Text style={[styles.statusPillText, settlements.length ? styles.statusOpenText : styles.statusDoneText]}>{settlements.length ? 'Settle up' : 'Settled'}</Text>
            </View>
          </View>
          <Text style={styles.heroCopy}>Add receipts as the group pays. RoamRoom calculates the cleanest payback path automatically.</Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Balances</Text>
          <Text style={type.cap}>Equal split</Text>
        </View>

        {settlements.length ? (
          <View style={styles.settlementList}>
            {settlements.map((settlement) => {
              const from = membersById.get(settlement.fromMemberId)?.name ?? 'Someone';
              const to = membersById.get(settlement.toMemberId)?.name ?? 'someone';
              return (
                <Card key={`${settlement.fromMemberId}-${settlement.toMemberId}`} padded style={styles.settlementCard}>
                  <View style={styles.settlementIcon}>
                    <Ionicons name="swap-horizontal-outline" size={20} color={colors.blue} />
                  </View>
                  <View style={styles.settlementText}>
                    <Text style={styles.settlementTitle}>{from} pays {to}</Text>
                    <Text style={type.sub}>Suggested settlement from tracked expenses.</Text>
                  </View>
                  <Text style={styles.settlementAmount}>{formatMoney(settlement.amount)}</Text>
                </Card>
              );
            })}
          </View>
        ) : (
          <Card padded style={styles.emptyBalanceCard}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.green} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>Everyone is square</Text>
              <Text style={type.sub}>No paybacks needed from the current expense list.</Text>
            </View>
          </Card>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Text style={type.cap}>{formatMoney(total)} total</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categoryOptions.map((category) => {
            const meta = categoryMeta[category];
            return (
              <View key={category} style={[styles.categoryCard, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={18} color={meta.fg} />
                <Text style={[styles.categoryLabel, { color: meta.fg }]}>{meta.label}</Text>
                <Text style={[styles.categoryAmount, { color: meta.fg }]}>{formatMoney(categoryTotals[category])}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Expense list</Text>
          <Text style={type.cap}>Tap trash to remove</Text>
        </View>

        <View style={styles.expenseList}>
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} membersById={membersById} onDelete={() => removeExpense(expense.id)} />
          ))}
        </View>

        {expenses.length === 0 ? (
          <Card padded style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={type.body}>Add the first group cost and RoamRoom will start calculating balances.</Text>
            <PrimaryButton label="Add expense" size="small" onPress={() => setIsAdding(true)} />
          </Card>
        ) : null}
      </ScrollView>

      <AddExpenseModal
        members={trip.members}
        visible={isAdding}
        onClose={() => setIsAdding(false)}
        onAdd={async (expense) => {
          await addExpense(expense);
          setIsAdding(false);
        }}
      />
    </View>
  );
}

function Centered({ title, copy, action }: { title: string; copy: string; action?: string }) {
  return (
    <View style={styles.centered}>
      <Card padded style={styles.centeredCard}>
        <Text style={type.eyebrow}>Expenses</Text>
        <Text style={styles.h1}>{title}</Text>
        <Text style={type.body}>{copy}</Text>
        {action ? <PrimaryButton label={action} onPress={() => router.push('/create/step-1')} /> : null}
      </Card>
    </View>
  );
}

function ExpenseCard({ expense, membersById, onDelete }: { expense: TripExpense; membersById: Map<string, Member>; onDelete: () => void }) {
  const meta = categoryMeta[expense.category];
  const payer = membersById.get(expense.paidByMemberId)?.name ?? 'Unknown';
  const splitCount = expense.splitMemberIds.length;

  return (
    <Card padded style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={[styles.expenseIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.fg} />
        </View>
        <View style={styles.expenseTitleWrap}>
          <Text style={styles.expenseTitle}>{expense.title}</Text>
          <Text style={styles.expenseMeta}>Paid by {payer} · split {splitCount} ways</Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={styles.expenseAmount}>{formatMoney(expense.amount, expense.currency)}</Text>
          <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityLabel={`Delete ${expense.title}`}>
            <Ionicons name="trash-outline" size={17} color={colors.ink2} />
          </Pressable>
        </View>
      </View>
      {expense.note ? <Text style={styles.note}>{expense.note}</Text> : null}
      <View style={[styles.kindPill, { backgroundColor: meta.bg }]}>
        <Text style={[styles.kindPillText, { color: meta.fg }]}>{meta.label}</Text>
      </View>
    </Card>
  );
}

function AddExpenseModal({
  members,
  visible,
  onClose,
  onAdd,
}: {
  members: Member[];
  visible: boolean;
  onClose: () => void;
  onAdd: (expense: {
    title: string;
    amount: number;
    currency: 'USD' | 'JPY';
    category: ExpenseCategory;
    paidByMemberId: string;
    splitMemberIds: string[];
    note?: string;
  }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setPaidByMemberId(members[0]?.id ?? '');
    setSplitMemberIds(members.map((member) => member.id));
  }, [members, visible]);

  const parsedAmount = Number.parseFloat(amount.replace(/[^0-9.]/g, ''));
  const canAdd = title.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0 && paidByMemberId.length > 0 && splitMemberIds.length > 0;

  function toggleSplit(memberId: string) {
    setSplitMemberIds((current) => (current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]));
  }

  async function handleAdd() {
    if (!canAdd) return;

    await onAdd({
      title: title.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      currency: 'USD',
      category,
      paidByMemberId,
      splitMemberIds,
      note: note.trim() || undefined,
    });

    setTitle('');
    setAmount('');
    setNote('');
    setCategory('food');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalVeil} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={type.eyebrow}>New cost</Text>
            <Text style={styles.sheetTitle}>Add expense</Text>

            <View style={styles.categoryPickRow}>
              {categoryOptions.map((option) => {
                const meta = categoryMeta[option];
                const selected = category === option;
                return (
                  <Pressable key={option} style={[styles.categoryOption, selected && { backgroundColor: meta.bg, borderColor: meta.fg }]} onPress={() => setCategory(option)}>
                    <Ionicons name={meta.icon} size={16} color={selected ? meta.fg : colors.ink2} />
                    <Text style={[styles.categoryOptionText, selected && { color: meta.fg }]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Airport taxi" />
            <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="42.50" keyboardType="decimal-pad" />
            <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional details" multiline />

            <View style={styles.pickBlock}>
              <Text style={styles.fieldLabel}>Paid by</Text>
              <View style={styles.memberRow}>
                {members.map((member) => {
                  const selected = paidByMemberId === member.id;
                  return (
                    <Pressable key={member.id} style={[styles.memberChip, selected && styles.memberChipActive]} onPress={() => setPaidByMemberId(member.id)}>
                      <Text style={[styles.memberChipText, selected && styles.memberChipTextActive]}>{member.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.pickBlock}>
              <Text style={styles.fieldLabel}>Split with</Text>
              <View style={styles.memberRow}>
                {members.map((member) => {
                  const selected = splitMemberIds.includes(member.id);
                  return (
                    <Pressable key={member.id} style={[styles.memberChip, selected && styles.memberChipActive]} onPress={() => toggleSplit(member.id)}>
                      <Text style={[styles.memberChipText, selected && styles.memberChipTextActive]}>{member.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
              <PrimaryButton label="Add expense" onPress={handleAdd} disabled={!canAdd} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#A6A296"
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 112 },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 112 },
  centeredCard: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16 },
  headerCopy: { flex: 1 },
  h1: { marginTop: 4, fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.ink },
  addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  heroCard: { gap: 13, marginBottom: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  totalText: { marginTop: 4, fontSize: 34, lineHeight: 40, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  statusPill: { height: 34, paddingHorizontal: 13, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  statusOpen: { backgroundColor: '#FFF4E3' },
  statusDone: { backgroundColor: '#E7F9F0' },
  statusPillText: { fontSize: 12.5, fontWeight: '800' },
  statusOpenText: { color: '#B87A16' },
  statusDoneText: { color: '#178A5B' },
  heroCopy: { fontSize: 14, lineHeight: 21, color: colors.ink2 },
  sectionHeader: { marginTop: 4, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  settlementList: { gap: 10, marginBottom: 16 },
  settlementCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settlementIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center' },
  settlementText: { flex: 1 },
  settlementTitle: { fontSize: 15.5, fontWeight: '800', color: colors.ink },
  settlementAmount: { fontSize: 15, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  emptyBalanceCard: { marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  categoryRow: { gap: 10, paddingRight: 20, marginBottom: 18 },
  categoryCard: { width: 126, minHeight: 92, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, gap: 5 },
  categoryLabel: { fontSize: 12.5, fontWeight: '800' },
  categoryAmount: { marginTop: 'auto', fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  expenseList: { gap: 12 },
  expenseCard: { gap: 12 },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  expenseIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  expenseTitleWrap: { flex: 1 },
  expenseTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  expenseMeta: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  amountWrap: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { fontSize: 15.5, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  deleteButton: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1EA' },
  note: { fontSize: 13.5, lineHeight: 20, color: colors.ink2 },
  kindPill: { alignSelf: 'flex-start', height: 28, paddingHorizontal: 11, borderRadius: radii.pill, justifyContent: 'center' },
  kindPillText: { fontSize: 12, fontWeight: '800' },
  emptyCard: { marginTop: 12, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,21,28,0.34)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.cream, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, ...shadows.float },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#D8D4C9', alignSelf: 'center', marginBottom: 8 },
  sheetContent: { gap: 12, paddingBottom: 4 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink },
  categoryPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { height: 36, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryOptionText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  input: { minHeight: 50, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 15, fontSize: 15, color: colors.ink },
  inputMultiline: { minHeight: 76, paddingTop: 13, textAlignVertical: 'top' },
  pickBlock: { gap: 8 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { height: 36, paddingHorizontal: 13, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, justifyContent: 'center' },
  memberChipActive: { backgroundColor: colors.btn, borderColor: colors.btn },
  memberChipText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  memberChipTextActive: { color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 10, paddingTop: 2 },
});
