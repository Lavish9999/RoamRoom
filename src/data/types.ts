import type { AvatarKey } from '@/theme';

export type MemberRole = 'Owner' | 'Planner' | 'Traveler';

export type Member = {
  id: string;
  name: string;
  initial: string;
  role: MemberRole;
  avatarKey: AvatarKey;
};

export type TripStatus = 'Planning' | 'Live' | 'Done';

export type CoverKey = 'tokyo' | 'lisbon' | 'kyoto' | 'goldengai' | 'sky' | 'teamlab' | 'ichiran' | 'default';

export type Vibe = 'Foodie' | 'Culture' | 'Relaxing' | 'Nightlife' | 'Adventure' | 'Shopping' | 'Family' | 'Road trip';

export type BudgetComfort = 'Budget' | 'Mid-range' | 'Premium' | 'Mixed';

export type Trip = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  coverKey: CoverKey;
  members: Member[];
  readinessDone: number;
  readinessTotal: number;
  inviteCode: string;
  vibes: Vibe[];
  budgetComfort: BudgetComfort;
  origin: 'blank' | string;
};

export type TripInvite = {
  id: string;
  tripName: string;
  invitedBy: string;
  dates: string;
  goingCount: number;
  coverKey: CoverKey;
  inviteCode: string;
};
