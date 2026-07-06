import type { Member } from './types';

export type ExpenseCategory = 'lodging' | 'food' | 'transport' | 'activity' | 'shopping' | 'other';

export type TripExpense = {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: 'USD' | 'JPY';
  category: ExpenseCategory;
  paidByMemberId: string;
  splitMemberIds: string[];
  note?: string;
  createdAt: string;
};

export type NewTripExpense = Omit<TripExpense, 'id' | 'tripId' | 'createdAt'>;

export type ExpenseSettlement = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
};

export const starterExpenses: Record<string, TripExpense[]> = {
  'tokyo-spring-trip': [
    {
      id: 'expense-hotel-deposit',
      tripId: 'tokyo-spring-trip',
      title: 'Hotel deposit',
      amount: 420,
      currency: 'USD',
      category: 'lodging',
      paidByMemberId: 'robert',
      splitMemberIds: ['robert', 'maya', 'chris', 'lena'],
      note: 'Deposit held for Hotel Metropolitan Tokyo Marunouchi.',
      createdAt: '2026-04-02T12:00:00.000Z',
    },
    {
      id: 'expense-teamlab',
      tripId: 'tokyo-spring-trip',
      title: 'teamLab Planets tickets',
      amount: 96,
      currency: 'USD',
      category: 'activity',
      paidByMemberId: 'maya',
      splitMemberIds: ['robert', 'maya', 'chris', 'lena'],
      note: 'Four timed-entry tickets.',
      createdAt: '2026-04-04T12:00:00.000Z',
    },
    {
      id: 'expense-rail-pass-estimate',
      tripId: 'tokyo-spring-trip',
      title: 'Kyoto rail estimate',
      amount: 148,
      currency: 'USD',
      category: 'transport',
      paidByMemberId: 'chris',
      splitMemberIds: ['robert', 'maya', 'chris', 'lena'],
      note: 'Placeholder until rail-pass decision is locked.',
      createdAt: '2026-04-05T12:00:00.000Z',
    },
    {
      id: 'expense-ramen-hold',
      tripId: 'tokyo-spring-trip',
      title: 'Ichiran dinner estimate',
      amount: 78,
      currency: 'USD',
      category: 'food',
      paidByMemberId: 'lena',
      splitMemberIds: ['robert', 'maya', 'chris', 'lena'],
      note: 'Budget placeholder for arrival-night ramen.',
      createdAt: '2026-04-06T12:00:00.000Z',
    },
  ],
};

export function getStarterExpenses(tripId: string): TripExpense[] {
  return starterExpenses[tripId] ? [...starterExpenses[tripId]] : [];
}

export function calculateSettlements(expenses: TripExpense[], members: Member[]): ExpenseSettlement[] {
  const balances = new Map(members.map((member) => [member.id, 0]));

  expenses.forEach((expense) => {
    const splitMembers = expense.splitMemberIds.filter((memberId) => balances.has(memberId));
    if (!splitMembers.length || !balances.has(expense.paidByMemberId)) return;

    balances.set(expense.paidByMemberId, (balances.get(expense.paidByMemberId) ?? 0) + expense.amount);
    const share = expense.amount / splitMembers.length;
    splitMembers.forEach((memberId) => {
      balances.set(memberId, (balances.get(memberId) ?? 0) - share);
    });
  });

  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < -0.01)
    .map(([memberId, balance]) => ({ memberId, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0.01)
    .map(([memberId, balance]) => ({ memberId, amount: balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: ExpenseSettlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.01) {
      settlements.push({ fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amount });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }

  return settlements;
}
