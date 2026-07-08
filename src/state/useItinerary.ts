import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getStarterItinerary, type ItineraryItem, type NewItineraryItem } from '@/data/itinerary';
import { subscribeTripTable } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { isUuid, itineraryToInsert, itineraryToUpdate, mapItineraryRow } from '@/lib/supabaseData';

import { useAuth } from './AuthContext';
import { ensureStorageReady, scopedKey, useStorageScope } from './storageScope';
import type { SyncStatus } from './syncStatus';

function storageKey(tripId: string) {
  return scopedKey(`itinerary.${tripId}`);
}

function sortItems(items: ItineraryItem[]) {
  return [...items].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.time.localeCompare(b.time);
  });
}

function mergeRemoteWithLocalPending(remote: ItineraryItem[], local: ItineraryItem[]) {
  const remoteIds = new Set(remote.map((item) => item.id));
  const pending = local.filter((item) => !remoteIds.has(item.id) && !isUuid(item.id));
  return sortItems([...remote, ...pending]);
}

function createId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function loadItinerary(tripId: string): Promise<ItineraryItem[]> {
  await ensureStorageReady();
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  return raw ? sortItems(JSON.parse(raw) as ItineraryItem[]) : getStarterItinerary(tripId);
}

async function saveItinerary(tripId: string, items: ItineraryItem[]) {
  await ensureStorageReady();
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortItems(items)));
}

export function useItinerary(tripId?: string) {
  const { user } = useAuth();
  const scope = useStorageScope();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');

  // Drop the previous account's cached items the instant the scope changes.
  useEffect(() => {
    setItems([]);
    setIsReady(false);
    setSyncStatus('local-only');
  }, [scope]);

  const reload = useCallback(async () => {
    if (!tripId) {
      setItems([]);
      setIsReady(true);
      setSyncStatus('local-only');
      return;
    }

    let next = await loadItinerary(tripId);
    setItems(next);
    setIsReady(true);

    if (!supabase || !user || !isUuid(tripId)) {
      setSyncStatus('local-only');
      return;
    }

    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('day').order('time');
      if (error) throw error;
      next = mergeRemoteWithLocalPending((data ?? []).map(mapItineraryRow), next);
      setItems(next);
      await saveItinerary(tripId, next);
      setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
      // Stay on the offline cache.
    }
  }, [tripId, user, scope]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Live updates: reload when anyone changes this trip's itinerary.
  useEffect(() => {
    if (!supabase || !user || !tripId || !isUuid(tripId)) return;
    return subscribeTripTable('itinerary_items', tripId, reload);
  }, [tripId, user, reload]);

  const days = useMemo(() => {
    const uniqueDays = Array.from(new Set(items.map((item) => item.day))).sort((a, b) => a - b);
    return uniqueDays.length ? uniqueDays : [1];
  }, [items]);

  async function addItem(input: NewItineraryItem) {
    if (!tripId) return;

    let nextItem: ItineraryItem = {
      ...input,
      id: createId(),
      tripId,
      status: input.status ?? 'planned',
    };

    if (supabase && user && isUuid(tripId)) {
      try {
        setSyncStatus('syncing');
        const { id: _localId, ...itemForInsert } = nextItem;
        const { data, error } = await supabase
          .from('itinerary_items')
          .insert(itineraryToInsert(itemForInsert, user.id))
          .select('*')
          .single();
        if (error) throw error;
        nextItem = mapItineraryRow(data);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Keep the locally generated item.
      }
    } else {
      setSyncStatus('local-only');
    }

    const next = sortItems([...items, nextItem]);
    setItems(next);
    await saveItinerary(tripId, next);
  }

  async function updateItem(id: string, patch: Partial<ItineraryItem>) {
    if (!tripId) return;

    const next = sortItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setItems(next);
    await saveItinerary(tripId, next);

    if (supabase && user && isUuid(tripId) && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('itinerary_items').update(itineraryToUpdate(patch)).eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local cache remains available offline.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  async function removeItem(id: string) {
    if (!tripId) return;

    const next = items.filter((item) => item.id !== id);
    setItems(next);
    await saveItinerary(tripId, next);

    if (supabase && user && isUuid(tripId) && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('itinerary_items').delete().eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local deletion remains until a later sync opportunity.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  return { items, days, isReady, syncStatus, addItem, updateItem, removeItem, reload };
}
