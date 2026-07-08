import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_CENTER,
  generateCoordinateNear,
  getCityCenter,
  getStarterMapPlaces,
  type LatLng,
  type MapPlace,
  type NewMapPlace,
} from '@/data/mapPlaces';
import { supabase } from '@/lib/supabase';
import { isUuid, mapPlaceRow, placeToInsert, placeToUpdate } from '@/lib/supabaseData';

import { SEED_TRIP_ID } from '@/data/seed';

import { useAuth } from './AuthContext';
import { loadTrips } from './storage';
import { ensureStorageReady, scopedKey, useStorageScope } from './storageScope';
import type { SyncStatus } from './syncStatus';

// Places are anchored to real lat/lng coordinates. Legacy v4 keys are migrated
// into this scoped 'mapPlaces.' suffix by storageScope.ts.
function storageKey(tripId: string) {
  return scopedKey(`mapPlaces.${tripId}`);
}

function createId() {
  return `place-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortPlaces(places: MapPlace[]) {
  return [...places].sort((a, b) => {
    const dayA = a.day ?? 99;
    const dayB = b.day ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    return a.title.localeCompare(b.title);
  });
}

function mergeRemoteWithLocalPending(remote: MapPlace[], local: MapPlace[]) {
  const remoteIds = new Set(remote.map((place) => place.id));
  const pending = local.filter((place) => !remoteIds.has(place.id) && !isUuid(place.id));
  return sortPlaces([...remote, ...pending]);
}

async function loadMapPlaces(tripId: string, destination?: string): Promise<MapPlace[]> {
  await ensureStorageReady();
  const raw = await AsyncStorage.getItem(storageKey(tripId));

  // Respect whatever the user has saved (including an intentionally empty map).
  if (raw != null) return sortPlaces(JSON.parse(raw) as MapPlace[]);

  // A fresh trip starts empty; only the built-in demo trip is pre-seeded so it
  // matches the design spec. User-created trips shouldn't show places they
  // never added - they populate the map via search, long-press, or vibe ideas.
  return tripId === SEED_TRIP_ID ? getStarterMapPlaces(tripId, destination) : [];
}

async function saveMapPlaces(tripId: string, places: MapPlace[]) {
  await ensureStorageReady();
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortPlaces(places)));
}

export function useMapPlaces(tripId?: string, destination?: string) {
  const { user } = useAuth();
  const scope = useStorageScope();
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');
  const centerRef = useRef<LatLng>(DEFAULT_CENTER);

  // Drop the previous account's cached places the instant the scope changes.
  useEffect(() => {
    setPlaces([]);
    setIsReady(false);
    setSyncStatus('local-only');
  }, [scope]);

  const reload = useCallback(async () => {
    if (!tripId) {
      setPlaces([]);
      setIsReady(true);
      setSyncStatus('local-only');
      return;
    }

    const savedTrips = await loadTrips();
    const resolvedDestination = destination ?? savedTrips.find((trip) => trip.id === tripId)?.destination;
    centerRef.current = getCityCenter(resolvedDestination);
    let next = await loadMapPlaces(tripId, resolvedDestination);
    setPlaces(next);
    setIsReady(true);

    if (!supabase || !user || !isUuid(tripId)) {
      setSyncStatus('local-only');
      return;
    }

    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase.from('places').select('*').eq('trip_id', tripId).order('day').order('title');
      if (error) throw error;
      next = mergeRemoteWithLocalPending((data ?? []).map(mapPlaceRow), next);
      setPlaces(next);
      await saveMapPlaces(tripId, next);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
      // Stay on the offline cache.
    }
  }, [destination, tripId, user, scope]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function addPlace(input: NewMapPlace) {
    if (!tripId) return;

    const coord =
      input.lat != null && input.lng != null
        ? { lat: input.lat, lng: input.lng }
        : generateCoordinateNear(centerRef.current);
    let nextPlace: MapPlace = {
      ...input,
      id: createId(),
      tripId,
      lat: coord.lat,
      lng: coord.lng,
      source: input.source ?? 'saved',
      createdAt: new Date().toISOString(),
    };

    if (supabase && user && isUuid(tripId)) {
      try {
        setSyncStatus('syncing');
        const { data, error } = await supabase
          .from('places')
          .insert(placeToInsert(nextPlace, user.id))
          .select('*')
          .single();
        if (error) throw error;
        nextPlace = mapPlaceRow(data);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Keep the locally generated place.
      }
    } else {
      setSyncStatus('local-only');
    }

    const next = sortPlaces([...places, nextPlace]);
    setPlaces(next);
    await saveMapPlaces(tripId, next);
  }

  async function updatePlace(id: string, patch: Partial<MapPlace>) {
    if (!tripId) return;

    const next = sortPlaces(places.map((place) => (place.id === id ? { ...place, ...patch } : place)));
    setPlaces(next);
    await saveMapPlaces(tripId, next);

    if (supabase && user && isUuid(tripId) && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('places').update(placeToUpdate(patch)).eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local cache remains available offline.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  async function removePlace(id: string) {
    if (!tripId) return;

    const next = places.filter((place) => place.id !== id);
    setPlaces(next);
    await saveMapPlaces(tripId, next);

    if (supabase && user && isUuid(tripId) && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('places').delete().eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local deletion remains until a later sync opportunity.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  async function resetPlaces() {
    if (!tripId) return;

    const savedTrips = await loadTrips();
    const resolvedDestination = destination ?? savedTrips.find((trip) => trip.id === tripId)?.destination;
    centerRef.current = getCityCenter(resolvedDestination);
    const next = tripId === SEED_TRIP_ID ? sortPlaces(getStarterMapPlaces(tripId, resolvedDestination)) : [];
    setPlaces(next);
    await saveMapPlaces(tripId, next);

    if (supabase && user && isUuid(tripId)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('places').delete().eq('trip_id', tripId);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local reset still succeeds offline.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  return { places, isReady, syncStatus, addPlace, updatePlace, removePlace, resetPlaces, reload };
}
