import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// Every AsyncStorage key is namespaced by the current "scope": the signed-in
// user's id, or the shared 'guest' bucket when nobody is signed in. This is
// what prevents one Google account from ever seeing another account's locally
// cached trips/itinerary/expenses/etc.
//
//   roamroom:{userId}:trips
//   roamroom:{userId}:itinerary.{tripId}
//   roamroom:guest:trips           (offline / signed-out)

export const GUEST_SCOPE = 'guest';

let currentScope = GUEST_SCOPE;
const listeners = new Set<() => void>();

export function getStorageScope() {
  return currentScope;
}

export function isGuestScope() {
  return currentScope === GUEST_SCOPE;
}

// Driven by AuthContext. Passing a user id switches into that user's namespace;
// passing null/undefined falls back to the guest namespace (sign-out / offline).
export function setStorageScope(userId: string | null | undefined) {
  const next = userId && userId.trim() ? userId : GUEST_SCOPE;
  if (next === currentScope) return;
  currentScope = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: re-renders (and re-runs reload effects) when the scope changes. */
export function useStorageScope() {
  return useSyncExternalStore(subscribe, getStorageScope, getStorageScope);
}

/** Build a scoped key for the current namespace: roamroom:{scope}:{suffix} */
export function scopedKey(suffix: string) {
  return `roamroom:${currentScope}:${suffix}`;
}

// ---------------------------------------------------------------------------
// One-time migration of pre-scoping (unscoped) keys.
//
// Old installs stored everything under global keys with no user id. Those
// belong to whoever was using the device before this change, so they are moved
// ONLY into the guest namespace — never into a signed-in user's namespace —
// then the legacy keys are deleted so they can't leak into another account.
// ---------------------------------------------------------------------------
const MIGRATION_FLAG = 'roamroom:migratedToScoped:v1';

const LEGACY_FIXED: Record<string, string> = {
  'roamroom.trips.v2': 'trips',
  'roamroom.invites.v2': 'invites',
  'roamroom.activeTrip.v1': 'activeTrip',
};

const LEGACY_PREFIXES: Array<[string, string]> = [
  ['roamroom.itinerary.v1.', 'itinerary.'],
  ['roamroom.expenses.v1.', 'expenses.'],
  ['roamroom.mapPlaces.v4.', 'mapPlaces.'],
  ['roamroom.memories.v1.', 'memories.'],
  ['roamroom.checklist.v1.', 'checklist.'],
];

async function migrateLegacyStorage() {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_FLAG);
    if (done) return;

    const keys = await AsyncStorage.getAllKeys();
    const moves: Array<[string, string]> = []; // [legacyKey, guestKey]

    for (const key of keys) {
      const fixed = LEGACY_FIXED[key];
      if (fixed) {
        moves.push([key, `roamroom:${GUEST_SCOPE}:${fixed}`]);
        continue;
      }
      for (const [prefix, suffixPrefix] of LEGACY_PREFIXES) {
        if (key.startsWith(prefix)) {
          moves.push([key, `roamroom:${GUEST_SCOPE}:${suffixPrefix}${key.slice(prefix.length)}`]);
          break;
        }
      }
    }

    for (const [legacyKey, guestKey] of moves) {
      // Never clobber data already in the guest namespace.
      const existing = await AsyncStorage.getItem(guestKey);
      if (existing == null) {
        const value = await AsyncStorage.getItem(legacyKey);
        if (value != null) await AsyncStorage.setItem(guestKey, value);
      }
      await AsyncStorage.removeItem(legacyKey);
    }

    await AsyncStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  } catch {
    // Best-effort: on failure we simply start fresh in the guest namespace.
  }
}

let readyPromise: Promise<void> | null = null;

/** Awaited by every storage read/write so migration finishes before any access. */
export function ensureStorageReady() {
  if (!readyPromise) readyPromise = migrateLegacyStorage();
  return readyPromise;
}
