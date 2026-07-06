import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import { getStarterItinerary, type ItineraryItem, type NewItineraryItem } from '@/data/itinerary';

const ITINERARY_KEY_PREFIX = 'roamroom.itinerary.v1.';

function storageKey(tripId: string) {
  return `${ITINERARY_KEY_PREFIX}${tripId}`;
}

function sortItems(items: ItineraryItem[]) {
  return [...items].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.time.localeCompare(b.time);
  });
}

function createId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function loadItinerary(tripId: string): Promise<ItineraryItem[]> {
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  return raw ? sortItems(JSON.parse(raw) as ItineraryItem[]) : getStarterItinerary(tripId);
}

async function saveItinerary(tripId: string, items: ItineraryItem[]) {
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortItems(items)));
}

export function useItinerary(tripId?: string) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) {
      setItems([]);
      setIsReady(true);
      return;
    }

    const next = await loadItinerary(tripId);
    setItems(next);
    setIsReady(true);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const days = useMemo(() => {
    const uniqueDays = Array.from(new Set(items.map((item) => item.day))).sort((a, b) => a - b);
    return uniqueDays.length ? uniqueDays : [1];
  }, [items]);

  async function addItem(input: NewItineraryItem) {
    if (!tripId) return;

    const nextItem: ItineraryItem = {
      ...input,
      id: createId(),
      tripId,
      status: input.status ?? 'planned',
    };
    const next = sortItems([...items, nextItem]);
    setItems(next);
    await saveItinerary(tripId, next);
  }

  async function updateItem(id: string, patch: Partial<ItineraryItem>) {
    if (!tripId) return;

    const next = sortItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setItems(next);
    await saveItinerary(tripId, next);
  }

  async function removeItem(id: string) {
    if (!tripId) return;

    const next = items.filter((item) => item.id !== id);
    setItems(next);
    await saveItinerary(tripId, next);
  }

  return { items, days, isReady, addItem, updateItem, removeItem, reload };
}