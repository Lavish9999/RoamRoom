import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Trip, TripInvite } from '@/data/types';
import { supabase } from '@/lib/supabase';
import { isUuid, mapMemberRow, mapTripRow, tripToInsert, tripToUpdate } from '@/lib/supabaseData';

import { useAuth } from './AuthContext';
import { clearTripData, loadActiveTripId, loadInvites, loadTrips, saveActiveTripId, saveInvites, saveTrips } from './storage';
import { useStorageScope } from './storageScope';
import type { SyncStatus } from './syncStatus';

// Small AsyncStorage-backed hook for reading/writing the trip list + pending
// invites. Reloads whenever the screen it's used in regains focus, so it
// picks up trips created from the create-trip flow without needing a global
// store.
export function useTrips() {
  const { user } = useAuth();
  const scope = useStorageScope();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');

  // When the account (scope) changes, drop the previous user's data from memory
  // immediately — don't wait for the async reload to replace it.
  useEffect(() => {
    setTrips([]);
    setInvites([]);
    setActiveTripId(null);
    setIsReady(false);
    setSyncStatus('local-only');
  }, [scope]);

  const reload = useCallback(async () => {
    const [nextTrips, nextInvites, nextActiveId] = await Promise.all([loadTrips(), loadInvites(), loadActiveTripId()]);
    setTrips(nextTrips);
    setInvites(nextInvites);
    setActiveTripId(nextActiveId);
    setIsReady(true);

    if (!supabase || !user) {
      setSyncStatus('local-only');
      return;
    }

    try {
      setSyncStatus('syncing');
      const remoteTrips = await loadRemoteTrips(user.id, nextTrips);
      if (remoteTrips) {
        setTrips(remoteTrips);
        await saveTrips(remoteTrips);
      }
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
      // Stay on the offline cache when the backend is unavailable.
    }
  }, [user, scope]);

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

  async function addTrip(trip: Trip): Promise<{ trip: Trip; syncError: string | null }> {
    let savedTrip = trip;
    let syncError: string | null = null;

    if (supabase && user) {
      try {
        setSyncStatus('syncing');
        const { data, error } = await supabase.from('trips').insert(tripToInsert(trip, user.id)).select('*').single();
        if (error) throw error;
        savedTrip = mapTripRow(data, [
          {
            id: user.id,
            name: user.name ?? 'You',
            initial: (user.name ?? user.email ?? 'You').charAt(0).toUpperCase(),
            role: 'Owner',
            avatarKey: 'you',
          },
        ]);
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        savedTrip = trip;
        // Surface the real reason instead of silently keeping a local-only trip
        // that can never be shared (its invite code won't exist in the cloud).
        syncError = error instanceof Error ? error.message : 'Could not save this trip to the cloud.';
      }
    } else if (supabase && !user) {
      setSyncStatus('local-only');
      syncError = 'Sign in to sync and share this trip.';
    } else {
      setSyncStatus('local-only');
    }

    const next = [savedTrip, ...trips.filter((item) => item.id !== savedTrip.id)];
    setTrips(next);
    await saveTrips(next);
    return { trip: savedTrip, syncError };
  }

  async function updateTrip(id: string, patch: Partial<Trip>) {
    const next = trips.map((trip) => (trip.id === id ? { ...trip, ...patch } : trip));
    setTrips(next);
    await saveTrips(next);

    if (supabase && user && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('trips').update(tripToUpdate(patch)).eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local cache remains the fallback source of truth until sync works.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  async function removeTrip(id: string) {
    const next = trips.filter((trip) => trip.id !== id);
    setTrips(next);
    await saveTrips(next);
    // Drop the deleted trip's map places, itinerary, expenses, checklist, and photos.
    await clearTripData(id);

    if (supabase && user && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('trips').delete().eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Keep the local deletion; remote can be retried from another session.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  async function joinInvite(inviteId: string): Promise<TripInvite | null> {
    const invite = invites.find((item) => item.id === inviteId);
    if (!invite) return null;

    const joinedTrip: Trip = {
      id: invite.id,
      name: invite.tripName,
      destination: invite.destination,
      startDate: invite.startDate,
      endDate: invite.endDate,
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

    // Signed in with a backend: join the real shared trip. Surface real errors
    // instead of silently pretending the code wasn't found.
    if (supabase && user) {
      setSyncStatus('syncing');
      const { data: tripId, error } = await supabase.rpc('join_trip_by_code', { p_code: normalized });
      if (error) {
        setSyncStatus('error');
        // The most common cause is the DB migration (0001_init.sql) not being
        // applied yet, so the RPC doesn't exist.
        const missingRpc = /join_trip_by_code|function|schema cache|PGRST202/i.test(`${error.message} ${error.code ?? ''}`);
        throw new Error(missingRpc ? 'Sharing isn’t set up on the server yet (run the database migration).' : error.message || 'Could not join trip.');
      }
      if (!tripId || typeof tripId !== 'string') {
        setSyncStatus('synced');
        return null; // No trip with that code, or it was never synced to the cloud.
      }

      const remoteTrips = await loadRemoteTrips(user.id, trips);
      if (remoteTrips) {
        setTrips(remoteTrips);
        await saveTrips(remoteTrips);
      }
      const joined = remoteTrips?.find((trip) => trip.id === tripId);
      setSyncStatus('synced');
      if (!joined) return null;
      return {
        id: joined.id,
        tripName: joined.name,
        destination: joined.destination,
        invitedBy: joined.members.find((member) => member.role === 'Owner')?.name ?? 'RoamRoom',
        dates: [joined.startDate, joined.endDate].filter(Boolean).join(' - '),
        startDate: joined.startDate,
        endDate: joined.endDate,
        goingCount: joined.members.length,
        coverKey: joined.coverKey,
        inviteCode: joined.inviteCode,
      };
    }

    // Signed out / offline: match a locally known invite (demo behavior).
    const invite = invites.find((item) => item.inviteCode.toUpperCase() === normalized);
    if (!invite) return null;
    return joinInvite(invite.id);
  }

  return { trips, invites, activeTrip, activeTripId, setActiveTrip, isReady, syncStatus, addTrip, updateTrip, removeTrip, joinInvite, joinByCode, reload };
}

async function loadRemoteTrips(currentUserId: string, cachedTrips: Trip[]): Promise<Trip[] | null> {
  if (!supabase) return null;

  const { data: tripRows, error: tripsError } = await supabase.from('trips').select('*').order('updated_at', { ascending: false });
  if (tripsError) throw tripsError;
  if (!tripRows) return [];

  const tripIds = tripRows.map((trip) => trip.id);
  if (!tripIds.length) return cachedTrips.filter((trip) => !isUuid(trip.id));

  const { data: memberRows, error: membersError } = await supabase.from('trip_members').select('trip_id,user_id,role').in('trip_id', tripIds);
  if (membersError) throw membersError;

  const userIds = Array.from(new Set((memberRows ?? []).map((member) => member.user_id)));
  const { data: profileRows, error: profilesError } = userIds.length
    ? await supabase.from('profiles').select('id,email,display_name,avatar_url').in('id', userIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;

  const cachedById = new Map(cachedTrips.map((trip) => [trip.id, trip]));
  const profilesById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  const membersByTrip = new Map<string, typeof memberRows>();
  (memberRows ?? []).forEach((member) => {
    const group = membersByTrip.get(member.trip_id) ?? [];
    group.push(member);
    membersByTrip.set(member.trip_id, group);
  });

  const remote = tripRows.map((row) => {
    const members = (membersByTrip.get(row.id) ?? []).map((member) =>
      mapMemberRow(member, profilesById.get(member.user_id), currentUserId),
    );
    const trip = mapTripRow(row, members);
    const cached = cachedById.get(trip.id);
    return cached ? { ...trip, readinessDone: cached.readinessDone, readinessTotal: cached.readinessTotal } : trip;
  });

  const localOnly = cachedTrips.filter((trip) => !isUuid(trip.id));
  return [...remote, ...localOnly];
}
