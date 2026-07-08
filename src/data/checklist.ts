export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

// Default trip-prep tasks seeded for a new trip. Users can check them off, add
// their own, or remove ones that don't apply.
export const DEFAULT_CHECKLIST: string[] = [
  'Book flights',
  'Book accommodation',
  'Check passport / visa',
  'Get travel insurance',
  'Plan the first day',
  'Pack essentials',
  'Download offline maps',
  'Notify bank / get currency',
];

// Tasks that only make sense for an international (non-domestic) trip.
const INTERNATIONAL_ONLY = new Set(['Check passport / visa', 'Notify bank / get currency']);

/** True when the destination is within the US (so passports/currency don't apply). */
function isDomesticUS(destination?: string): boolean {
  if (!destination) return false;
  const country = destination.split(',').pop()?.trim().toLowerCase() ?? '';
  return country === 'usa' || country === 'united states' || country === 'us' || country === 'united states of america';
}

export function seedChecklist(destination?: string): ChecklistItem[] {
  const domestic = isDomesticUS(destination);
  const labels = domestic ? DEFAULT_CHECKLIST.filter((label) => !INTERNATIONAL_ONLY.has(label)) : DEFAULT_CHECKLIST;
  return labels.map((label, index) => ({ id: `chk-${index}`, label, done: false }));
}
