import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import type { Trip, TripInvite } from '@/data/types';

import { clearTripData, loadActiveTripId, loadInvites, loadTrips, saveActiveTripId, saveInvites, saveTrips } from './storage';

// Small AsyncStorage-backed hook for reading/writing the trip list + pending
// invites. Reloads whenever the screen it's used in regains focus, so it
// picks up trips created from the create-trip flow without needing a global
// store.
export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    const [nextTrips, nextInvites, nextActiveId] = await Promise.all([loadTrips(), loadInvites(), loadActiveTripId()]);
    setTrips(nextTrips);
    setInvites(nextInvites);
    setActiveTripId(nextActiveId);
    setIsReady(true);
  }, []);

  // The trip that Map/Plan/Expenses follow. Falls back to the first trip when
  // nothing has been explicitly selected (or the selected trip was deleted).
  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId) ?? trips[0],
    [trips, activeTripId],
  );

  const setActiveTrip = useCallback(async (id: string) => {
    setActiveTripId(id);
    await saveActiveTripId(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function addTrip(trip: Trip) {
    const next = [trip, ...trips];
    setTrips(next);
    await saveTrips(next);
  }

  async function updateTrip(id: string, patch: Partial<Trip>) {
    const next = trips.map((trip) => (trip.id === id ? { ...trip, ...patch } : trip));
    setTrips(next);
    await saveTrips(next);
  }

  async function removeTrip(id: string) {
    const next = trips.filter((trip) => trip.id !== id);
    setTrips(next);
    await saveTrips(next);
    // Drop the deleted trip's map places, itinerary, expenses, checklist, and photos.
    await clearTripData(id);
  }

  async function joinInvite(inviteId: string): Promise<TripInvite | null> {
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite) return null;

    const joinedTrip: Trip = {
      id: invite.id,
      name: invite.tripName,
      destination: invite.tripName,
      startDate: invite.dates,
      endDate: invite.dates,
      status: 'Planning',
      coverKey: invite.coverKey,
      members: [{ id: 'you', name: 'You', initial: 'R', role: 'Traveler', avatarKey: 'you' }],
      readinessDone: 0,
      readinessTotal: 6,
      inviteCode: invite.inviteCode,
      vibes: [],
      budgetComfort: 'Mid-range',
      origin: 'invite',
    };

    const nextTrips = [joinedTrip, ...trips];
    const nextInvites = invites.filter((item) => item.id !== inviteId);
    setTrips(nextTrips);
    setInvites(nextInvites);
    await Promise.all([saveTrips(nextTrips), saveInvites(nextInvites)]);
    return invite;
  }

  async function joinByCode(code: string): Promise<TripInvite | null> {
    const normalized = code.trim().toUpperCase();
    const invite = invites.find((item) => item.inviteCode.toUpperCase() === normalized);
    if (!invite) return null;
    return joinInvite(invite.id);
  }

  return { trips, invites, activeTrip, activeTripId, setActiveTrip, isReady, addTrip, updateTrip, removeTrip, joinInvite, joinByCode, reload };
}
