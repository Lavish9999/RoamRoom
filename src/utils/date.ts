export function formatTodayEyebrow(now = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${startDate} - ${endDate}`;

  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel}-${endLabel}`;
}

export function countdownLabel(startDate: string, status: 'Planning' | 'Live' | 'Done'): string {
  if (status === 'Live') return 'Live now';
  if (status === 'Done') return 'Completed';

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 'Starting soon';

  const today = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((startDay.getTime() - todayDay.getTime()) / 86_400_000);

  if (days < 0) return 'Starting soon';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}
