import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { BudgetComfort, CoverKey, Vibe } from '@/data/types';

export type InviteeStatus = 'joined' | 'pending';

export type Invitee = {
  id: string;
  name: string;
  status: InviteeStatus;
};

export type CreateTripDraft = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverKey: CoverKey;
  invitees: Invitee[];
  vibes: Vibe[];
  budgetComfort: BudgetComfort;
  // Generated once (in step-2) and reused when building the trip, so the code
  // people share is exactly the code stored on the trip.
  inviteCode: string;
};

const emptyDraft: CreateTripDraft = {
  name: '',
  destination: '',
  startDate: '',
  endDate: '',
  coverKey: 'default',
  invitees: [],
  vibes: [],
  budgetComfort: 'Mid-range',
  inviteCode: '',
};

type CreateTripContextValue = {
  draft: CreateTripDraft;
  setDraft: (patch: Partial<CreateTripDraft>) => void;
  reset: () => void;
};

const CreateTripContext = createContext<CreateTripContextValue | null>(null);

export function CreateTripProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<CreateTripDraft>(emptyDraft);

  const setDraft = useCallback((patch: Partial<CreateTripDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setDraftState(emptyDraft), []);

  const value = useMemo(() => ({ draft, setDraft, reset }), [draft, setDraft, reset]);

  return <CreateTripContext.Provider value={value}>{children}</CreateTripContext.Provider>;
}

export function useCreateTrip() {
  const ctx = useContext(CreateTripContext);
  if (!ctx) throw new Error('useCreateTrip must be used within a CreateTripProvider');
  return ctx;
}
