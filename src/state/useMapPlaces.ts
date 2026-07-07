import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

import {
  DEFAULT_CENTER,
  generateCoordinateNear,
  getCityCenter,
  getStarterMapPlaces,
  type LatLng,
  type MapPlace,
  type NewMapPlace,
} from '@/data/mapPlaces';

import { SEED_TRIP_ID } from '@/data/seed';

import { loadTrips } from './storage';

// v4: places are now anchored to real lat/lng coordinates instead of the old
// SVG-canvas x/y percentages, so previously-stored v3 data is discarded.
const MAP_PLACES_KEY_PREFIX = 'roamroom.mapPlaces.v4.';

function storageKey(tripId: string) {
  return `${MAP_PLACES_KEY_PREFIX}${tripId}`;
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

async function loadMapPlaces(tripId: string, destination?: string): Promise<MapPlace[]> {
  const raw = await AsyncStorage.getItem(storageKey(tripId));

  // Respect whatever the user has saved (including an intentionally empty map).
  if (raw != null) return sortPlaces(JSON.parse(raw) as MapPlace[]);

  // A fresh trip starts empty; only the built-in demo trip is pre-seeded so it
  // matches the design spec. User-created trips shouldn't show places they
  // never added - they populate the map via search, long-press, or vibe ideas.
  return tripId === SEED_TRIP_ID ? getStarterMapPlaces(tripId, destination) : [];
}

async function saveMapPlaces(tripId: string, places: MapPlace[]) {
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortPlaces(places)));
}

export function useMapPlaces(tripId?: string, destination?: string) {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [isReady, setIsReady] = useState(false);
  const centerRef = useRef<LatLng>(DEFAULT_CENTER);

  const reload = useCallback(async () => {
    if (!tripId) {
      setPlaces([]);
      setIsReady(true);
      return;
    }

    const savedTrips = await loadTrips();
    const resolvedDestination = destination ?? savedTrips.find((trip) => trip.id === tripId)?.destination;
    centerRef.current = getCityCenter(resolvedDestination);
    const next = await loadMapPlaces(tripId, resolvedDestination);
    setPlaces(next);
    setIsReady(true);
  }, [destination, tripId]);

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
    const nextPlace: MapPlace = {
      ...input,
      id: createId(),
      tripId,
      lat: coord.lat,
      lng: coord.lng,
      source: input.source ?? 'saved',
      createdAt: new Date().toISOString(),
    };
    const next = sortPlaces([...places, nextPlace]);
    setPlaces(next);
    await saveMapPlaces(tripId, next);
  }

  async function updatePlace(id: string, patch: Partial<MapPlace>) {
    if (!tripId) return;

    const next = sortPlaces(places.map((place) => (place.id === id ? { ...place, ...patch } : place)));
    setPlaces(next);
    await saveMapPlaces(tripId, next);
  }

  async function removePlace(id: string) {
    if (!tripId) return;

    const next = places.filter((place) => place.id !== id);
    setPlaces(next);
    await saveMapPlaces(tripId, next);
  }

  async function resetPlaces() {
    if (!tripId) return;

    const savedTrips = await loadTrips();
    const resolvedDestination = destination ?? savedTrips.find((trip) => trip.id === tripId)?.destination;
    centerRef.current = getCityCenter(resolvedDestination);
    const next = tripId === SEED_TRIP_ID ? sortPlaces(getStarterMapPlaces(tripId, resolvedDestination)) : [];
    setPlaces(next);
    await saveMapPlaces(tripId, next);
  }

  return { places, isReady, addPlace, updatePlace, removePlace, resetPlaces, reload };
}
