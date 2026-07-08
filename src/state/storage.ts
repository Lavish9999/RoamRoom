import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { starterInvites, starterTrips } from '@/data/seed';
import type { Trip, TripInvite } from '@/data/types';

import { ensureStorageReady, isGuestScope, scopedKey } from './storageScope';

// All keys are namespaced per authenticated user via scopedKey (see
// storageScope.ts). Suffixes below are the scope-relative names.
const TRIPS_SUFFIX = 'trips';
const INVITES_SUFFIX = 'invites';
const ACTIVE_TRIP_SUFFIX = 'activeTrip';

// Per-trip data owned by other hooks, cleared when a trip is deleted.
const PER_TRIP_SUFFIX_PREFIXES = ['mapPlaces.', 'itinerary.', 'expenses.', 'memories.', 'checklist.'];

export async function loadTrips(): Promise<Trip[]> {
  await ensureStorageReady();
  const raw = await AsyncStorage.getItem(scopedKey(TRIPS_SUFFIX));
  if (raw) return JSON.parse(raw) as Trip[];
  // Only the guest/offline namespace gets the demo seed. Signed-in accounts
  // start empty and are populated from their own cloud trips (RLS-scoped).
  return isGuestScope() ? starterTrips : [];
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  await ensureStorageReady();
  await AsyncStorage.setItem(scopedKey(TRIPS_SUFFIX), JSON.stringify(trips));
}

export async function loadInvites(): Promise<TripInvite[]> {
  await ensureStorageReady();
  const raw = await AsyncStorage.getItem(scopedKey(INVITES_SUFFIX));
  if (raw) return JSON.parse(raw) as TripInvite[];
  return isGuestScope() ? starterInvites : [];
}

export async function saveInvites(invites: TripInvite[]): Promise<void> {
  await ensureStorageReady();
  await AsyncStorage.setItem(scopedKey(INVITES_SUFFIX), JSON.stringify(invites));
}

export async function clearTripData(tripId: string): Promise<void> {
  await ensureStorageReady();
  // Remove this trip's photo files before dropping the memory metadata.
  try {
    const raw = await AsyncStorage.getItem(scopedKey(`memories.${tripId}`));
    if (raw) {
      const data = JSON.parse(raw) as { photos?: { uri: string }[] };
      for (const photo of data.photos ?? []) {
        try {
          await FileSystem.deleteAsync(photo.uri, { idempotent: true });
        } catch {
          // Ignore a missing file.
        }
      }
    }
  } catch {
    // Ignore parse/read errors; still drop the keys below.
  }
  await AsyncStorage.multiRemove(PER_TRIP_SUFFIX_PREFIXES.map((prefix) => scopedKey(`${prefix}${tripId}`)));
}

export async function loadActiveTripId(): Promise<string | null> {
  await ensureStorageReady();
  return AsyncStorage.getItem(scopedKey(ACTIVE_TRIP_SUFFIX));
}

export async function saveActiveTripId(tripId: string): Promise<void> {
  await ensureStorageReady();
  await AsyncStorage.setItem(scopedKey(ACTIVE_TRIP_SUFFIX), tripId);
}
