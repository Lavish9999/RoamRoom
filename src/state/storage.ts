import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { starterInvites, starterTrips } from '@/data/seed';
import type { Trip, TripInvite } from '@/data/types';

const TRIPS_KEY = 'roamroom.trips.v2';
const INVITES_KEY = 'roamroom.invites.v2';
const ACTIVE_TRIP_KEY = 'roamroom.activeTrip.v1';

// Per-trip data owned by other hooks, cleared when a trip is deleted.
const PER_TRIP_PREFIXES = [
  'roamroom.mapPlaces.v4.',
  'roamroom.itinerary.v1.',
  'roamroom.expenses.v1.',
  'roamroom.memories.v1.',
  'roamroom.checklist.v1.',
];

export async function loadTrips(): Promise<Trip[]> {
  const raw = await AsyncStorage.getItem(TRIPS_KEY);
  return raw ? (JSON.parse(raw) as Trip[]) : starterTrips;
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export async function loadInvites(): Promise<TripInvite[]> {
  const raw = await AsyncStorage.getItem(INVITES_KEY);
  return raw ? (JSON.parse(raw) as TripInvite[]) : starterInvites;
}

export async function saveInvites(invites: TripInvite[]): Promise<void> {
  await AsyncStorage.setItem(INVITES_KEY, JSON.stringify(invites));
}

export async function clearTripData(tripId: string): Promise<void> {
  // Remove this trip's photo files before dropping the memory metadata.
  try {
    const raw = await AsyncStorage.getItem(`roamroom.memories.v1.${tripId}`);
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
  await AsyncStorage.multiRemove(PER_TRIP_PREFIXES.map((prefix) => `${prefix}${tripId}`));
}

export async function loadActiveTripId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_TRIP_KEY);
}

export async function saveActiveTripId(tripId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, tripId);
}
