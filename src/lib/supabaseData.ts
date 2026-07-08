import type { ExpenseCategory, TripExpense } from '@/data/expenses';
import type { ItineraryItem, ItineraryKind } from '@/data/itinerary';
import type { MapPlace, MapPlaceStatus } from '@/data/mapPlaces';
import type { BudgetComfort, CoverKey, Member, MemberRole, Trip, TripStatus, Vibe } from '@/data/types';
import type { AvatarKey } from '@/theme';
import { parseDate } from '@/utils/parseDate';

export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null) {
  return Boolean(value && uuidPattern.test(value));
}

type TripRow = {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  cover_key: string;
  invite_code: string;
  vibes: string[] | null;
  budget_comfort: string;
  origin: string;
};

type MemberRow = {
  trip_id: string;
  user_id: string;
  role: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type ItineraryRow = {
  id: string;
  trip_id: string;
  day: number;
  time: string | null;
  title: string;
  location: string;
  kind: string;
  status: string;
  notes: string | null;
  lat: number | null;
  lng: number | null;
};

type PlaceRow = {
  id: string;
  trip_id: string;
  title: string;
  area: string;
  day: number | null;
  time: string | null;
  kind: string;
  status: string;
  note: string | null;
  lat: number;
  lng: number;
  source: string;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  trip_id: string;
  title: string;
  amount: number | string;
  currency: string;
  category: string;
  paid_by: string | null;
  split_user_ids: string[] | null;
  note: string | null;
  created_at: string;
};

const coverKeys: CoverKey[] = ['tokyo', 'lisbon', 'kyoto', 'goldengai', 'sky', 'teamlab', 'ichiran', 'default'];
const statuses: TripStatus[] = ['Planning', 'Live', 'Done'];
const budgetComforts: BudgetComfort[] = ['Budget', 'Mid-range', 'Premium', 'Mixed'];
const vibes: Vibe[] = ['Foodie', 'Culture', 'Relaxing', 'Nightlife', 'Adventure', 'Shopping', 'Family', 'Road trip'];
const roles: MemberRole[] = ['Owner', 'Planner', 'Traveler'];
const itineraryKinds: ItineraryKind[] = ['flight', 'stay', 'food', 'activity', 'transport', 'free'];
const mapStatuses: MapPlaceStatus[] = ['idea', 'planned', 'booked', 'visited'];
const expenseCategories: ExpenseCategory[] = ['lodging', 'food', 'transport', 'activity', 'shopping', 'other'];
const avatarKeys: AvatarKey[] = ['robert', 'maya', 'chris', 'lena', 'you'];

function oneOf<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function dbDateFromTripDate(value: string) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function tripDateFromDb(value: string | null) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function nameFromProfile(profile: ProfileRow | undefined, fallback: string) {
  return profile?.display_name?.trim() || profile?.email?.split('@')[0] || fallback;
}

function avatarForUserId(userId: string): AvatarKey {
  let total = 0;
  for (let index = 0; index < userId.length; index += 1) total += userId.charCodeAt(index);
  return avatarKeys[total % avatarKeys.length];
}

export function mapMemberRow(row: MemberRow, profile?: ProfileRow, currentUserId?: string): Member {
  const fallbackName = row.user_id === currentUserId ? 'You' : 'Traveler';
  const name = nameFromProfile(profile, fallbackName);
  return {
    id: row.user_id,
    name,
    initial: name.trim().charAt(0).toUpperCase() || '?',
    role: oneOf(row.role, roles, 'Traveler'),
    avatarKey: row.user_id === currentUserId ? 'you' : avatarForUserId(row.user_id),
  };
}

export function mapTripRow(row: TripRow, members: Member[]): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: tripDateFromDb(row.start_date),
    endDate: tripDateFromDb(row.end_date),
    status: oneOf(row.status, statuses, 'Planning'),
    coverKey: oneOf(row.cover_key, coverKeys, 'default'),
    members,
    readinessDone: 0,
    readinessTotal: 6,
    inviteCode: row.invite_code,
    vibes: (row.vibes ?? []).filter((item): item is Vibe => vibes.includes(item as Vibe)),
    budgetComfort: oneOf(row.budget_comfort, budgetComforts, 'Mixed'),
    origin: row.origin || 'blank',
  };
}

export function tripToInsert(trip: Trip, ownerId: string) {
  return {
    owner_id: ownerId,
    name: trip.name,
    destination: trip.destination,
    start_date: dbDateFromTripDate(trip.startDate),
    end_date: dbDateFromTripDate(trip.endDate),
    status: trip.status,
    cover_key: trip.coverKey,
    invite_code: trip.inviteCode.toUpperCase(),
    vibes: trip.vibes,
    budget_comfort: trip.budgetComfort,
    origin: trip.origin,
  };
}

export function tripToUpdate(patch: Partial<Trip>) {
  return {
    ...(patch.name != null ? { name: patch.name } : {}),
    ...(patch.destination != null ? { destination: patch.destination } : {}),
    ...(patch.startDate != null ? { start_date: dbDateFromTripDate(patch.startDate) } : {}),
    ...(patch.endDate != null ? { end_date: dbDateFromTripDate(patch.endDate) } : {}),
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.coverKey != null ? { cover_key: patch.coverKey } : {}),
    ...(patch.inviteCode != null ? { invite_code: patch.inviteCode.toUpperCase() } : {}),
    ...(patch.vibes != null ? { vibes: patch.vibes } : {}),
    ...(patch.budgetComfort != null ? { budget_comfort: patch.budgetComfort } : {}),
    ...(patch.origin != null ? { origin: patch.origin } : {}),
    updated_at: new Date().toISOString(),
  };
}

export function mapItineraryRow(row: ItineraryRow): ItineraryItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    day: row.day,
    time: row.time ?? '',
    title: row.title,
    location: row.location,
    kind: oneOf(row.kind, itineraryKinds, 'activity'),
    status: oneOf(row.status, ['idea', 'planned', 'booked', 'done'] as const, 'planned'),
    notes: row.notes ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}

export function itineraryToInsert(item: Omit<ItineraryItem, 'id'>, userId: string) {
  return {
    trip_id: item.tripId,
    day: item.day,
    time: item.time || null,
    title: item.title,
    location: item.location,
    kind: item.kind,
    status: item.status,
    notes: item.notes ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    created_by: userId,
  };
}

export function itineraryToUpdate(patch: Partial<ItineraryItem>) {
  return {
    ...(patch.day != null ? { day: patch.day } : {}),
    ...(patch.time != null ? { time: patch.time || null } : {}),
    ...(patch.title != null ? { title: patch.title } : {}),
    ...(patch.location != null ? { location: patch.location } : {}),
    ...(patch.kind != null ? { kind: patch.kind } : {}),
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {}),
    ...(patch.lat !== undefined ? { lat: patch.lat ?? null } : {}),
    ...(patch.lng !== undefined ? { lng: patch.lng ?? null } : {}),
  };
}

export function mapPlaceRow(row: PlaceRow): MapPlace {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    area: row.area,
    day: row.day ?? undefined,
    time: row.time ?? undefined,
    kind: oneOf(row.kind, itineraryKinds, 'activity'),
    status: oneOf(row.status, mapStatuses, 'idea'),
    note: row.note ?? undefined,
    lat: row.lat,
    lng: row.lng,
    source: oneOf(row.source, ['itinerary', 'saved'] as const, 'saved'),
    createdAt: row.created_at,
  };
}

export function placeToInsert(place: Omit<MapPlace, 'id'>, userId: string) {
  return {
    trip_id: place.tripId,
    title: place.title,
    area: place.area,
    day: place.day ?? null,
    time: place.time ?? null,
    kind: place.kind,
    status: place.status,
    note: place.note ?? null,
    lat: place.lat,
    lng: place.lng,
    source: place.source,
    created_by: userId,
  };
}

export function placeToUpdate(patch: Partial<MapPlace>) {
  return {
    ...(patch.title != null ? { title: patch.title } : {}),
    ...(patch.area != null ? { area: patch.area } : {}),
    ...(patch.day !== undefined ? { day: patch.day ?? null } : {}),
    ...(patch.time !== undefined ? { time: patch.time ?? null } : {}),
    ...(patch.kind != null ? { kind: patch.kind } : {}),
    ...(patch.status != null ? { status: patch.status } : {}),
    ...(patch.note !== undefined ? { note: patch.note ?? null } : {}),
    ...(patch.lat !== undefined ? { lat: patch.lat } : {}),
    ...(patch.lng !== undefined ? { lng: patch.lng } : {}),
    ...(patch.source != null ? { source: patch.source } : {}),
  };
}

export function mapExpenseRow(row: ExpenseRow): TripExpense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency === 'JPY' ? 'JPY' : 'USD',
    category: oneOf(row.category, expenseCategories, 'other'),
    paidByMemberId: row.paid_by ?? '',
    splitMemberIds: row.split_user_ids ?? [],
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export function expenseToInsert(expense: Omit<TripExpense, 'id' | 'createdAt'>, userId: string) {
  return {
    trip_id: expense.tripId,
    title: expense.title,
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    paid_by: isUuid(expense.paidByMemberId) ? expense.paidByMemberId : userId,
    split_user_ids: expense.splitMemberIds.filter(isUuid),
    note: expense.note ?? null,
    created_by: userId,
  };
}

export function expenseToUpdate(patch: Partial<TripExpense>, userId: string) {
  return {
    ...(patch.title != null ? { title: patch.title } : {}),
    ...(patch.amount != null ? { amount: patch.amount } : {}),
    ...(patch.currency != null ? { currency: patch.currency } : {}),
    ...(patch.category != null ? { category: patch.category } : {}),
    ...(patch.paidByMemberId != null ? { paid_by: isUuid(patch.paidByMemberId) ? patch.paidByMemberId : userId } : {}),
    ...(patch.splitMemberIds != null ? { split_user_ids: patch.splitMemberIds.filter(isUuid) } : {}),
    ...(patch.note !== undefined ? { note: patch.note ?? null } : {}),
  };
}
