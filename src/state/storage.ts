import AsyncStorage from '@react-native-async-storage/async-storage';

import { starterInvites, starterTrips } from '@/data/seed';
import type { Trip, TripInvite } from '@/data/types';

const TRIPS_KEY = 'roamroom.trips.v2';
const INVITES_KEY = 'roamroom.invites.v2';
const ACTIVE_TRIP_KEY = 'roamroom.activeTrip.v1';

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

export async function loadActiveTripId(): Promise<string | null> {
  return AsyncStorage.getItem(ACTIVE_TRIP_KEY);
}

export async function saveActiveTripId(tripId: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TRIP_KEY, tripId);
}
