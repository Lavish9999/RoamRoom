import type { BudgetComfort } from '@/data/types';

// Rough per-person, per-day spend targets by comfort level (USD). Used to turn
// the "budget comfort" chosen at trip creation into a real spending goal.
const DAILY_BUDGET: Record<BudgetComfort, number> = {
  Budget: 80,
  'Mid-range': 160,
  Premium: 320,
  Mixed: 160,
};

export function dailyBudget(comfort: BudgetComfort): number {
  return DAILY_BUDGET[comfort] ?? 160;
}

export function tripNights(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 3;
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? nights : 3;
}
