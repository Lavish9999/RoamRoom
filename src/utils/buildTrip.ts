import type { AvatarKey } from '@/theme';
import type { BudgetComfort, CoverKey, Member, Trip, Vibe } from '@/data/types';
import type { CreateTripDraft } from '@/state/CreateTripContext';
import { createInviteCode } from '@/utils/inviteCode';

type TripOverrides = { name?: string; coverKey?: CoverKey; vibes?: Vibe[]; budgetComfort?: BudgetComfort };

const inviteeAvatarCycle: AvatarKey[] = ['maya', 'chris', 'lena'];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatFallbackDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function buildTripFromDraft(draft: CreateTripDraft, overrides?: TripOverrides): Trip {
  const fallbackStart = addDays(new Date(), 30);
  const fallbackEnd = addDays(fallbackStart, 6);

  const members: Member[] = [
    { id: 'robert', name: 'Robert', initial: 'R', role: 'Owner', avatarKey: 'robert' },
    ...draft.invitees.map((invitee, index) => ({
      id: invitee.id,
      name: invitee.name,
      initial: invitee.name.trim().charAt(0).toUpperCase() || '?',
      role: 'Traveler' as const,
      avatarKey: inviteeAvatarCycle[index % inviteeAvatarCycle.length],
    })),
  ];

  const name = overrides?.name ?? draft.name.trim() ?? '';
  const finalName = name || 'New trip';

  return {
    id: `${Date.now()}`,
    name: finalName,
    destination: draft.destination.trim() || 'Somewhere new',
    startDate: draft.startDate.trim() || formatFallbackDate(fallbackStart),
    endDate: draft.endDate.trim() || formatFallbackDate(fallbackEnd),
    status: 'Planning',
    coverKey: overrides?.coverKey ?? draft.coverKey,
    members,
    readinessDone: draft.invitees.length > 0 ? 2 : 1,
    readinessTotal: 6,
    inviteCode: draft.inviteCode?.trim() || createInviteCode(finalName),
    vibes: overrides?.vibes ?? draft.vibes,
    budgetComfort: overrides?.budgetComfort ?? draft.budgetComfort,
    origin: overrides?.name ? 'template' : 'blank',
  };
}
