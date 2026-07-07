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

export function seedChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((label, index) => ({ id: `chk-${index}`, label, done: false }));
}
