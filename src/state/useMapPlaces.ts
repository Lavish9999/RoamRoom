import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getStarterMapPlaces, mapPinSlots, type MapPlace, type NewMapPlace } from '@/data/mapPlaces';

import { loadTrips } from './storage';

const MAP_PLACES_KEY_PREFIX = 'roamroom.mapPlaces.v2.';

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
  return raw ? sortPlaces(JSON.parse(raw) as MapPlace[]) : getStarterMapPlaces(tripId, destination);
}

async function saveMapPlaces(tripId: string, places: MapPlace[]) {
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortPlaces(places)));
}

export function useMapPlaces(tripId?: string, destination?: string) {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) {
      setPlaces([]);
      setIsReady(true);
      return;
    }

    const savedTrips = await loadTrips();
    const resolvedDestination = destination ?? savedTrips.find((trip) => trip.id === tripId)?.destination;
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

    const slot = mapPinSlots[places.length % mapPinSlots.length];
    const nextPlace: MapPlace = {
      ...input,
      id: createId(),
      tripId,
      x: slot.x,
      y: slot.y,
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

  return { places, isReady, addPlace, updatePlace, removePlace, reload };
}
