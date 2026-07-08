import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { isUuid } from '@/lib/supabaseData';

import { useAuth } from './AuthContext';
import { ensureStorageReady, scopedKey, useStorageScope } from './storageScope';

export type VoteState = { count: number; voted: boolean };
export type VotesMap = Record<string, VoteState>;

function storageKey(tripId: string) {
  return scopedKey(`votes.${tripId}`);
}

async function loadVotes(tripId: string): Promise<VotesMap> {
  await ensureStorageReady();
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as VotesMap;
  } catch {
    return {};
  }
}

async function saveVotes(tripId: string, votes: VotesMap) {
  await ensureStorageReady();
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(votes));
}

type VoteRow = { place_id: string; user_id: string };

/**
 * Group voting on a trip's places (backed by the `place_votes` table). Each
 * member gets one vote per place; counts are shared across everyone on the
 * trip. Offline-first: the local cache shows the last-known counts, and the
 * current user's own vote toggles instantly.
 */
export function usePlaceVotes(tripId?: string) {
  const { user } = useAuth();
  const scope = useStorageScope();
  const [votes, setVotes] = useState<VotesMap>({});
  const [isReady, setIsReady] = useState(false);

  // Drop the previous account's cached votes the instant the scope changes.
  useEffect(() => {
    setVotes({});
    setIsReady(false);
  }, [scope]);

  const reload = useCallback(async () => {
    if (!tripId) {
      setVotes({});
      setIsReady(true);
      return;
    }
    setVotes(await loadVotes(tripId));
    setIsReady(true);

    if (!supabase || !user || !isUuid(tripId)) return;
    try {
      const { data, error } = await supabase.from('place_votes').select('place_id,user_id').eq('trip_id', tripId);
      if (error) throw error;
      const map: VotesMap = {};
      for (const row of (data ?? []) as VoteRow[]) {
        const entry = map[row.place_id] ?? { count: 0, voted: false };
        entry.count += 1;
        if (row.user_id === user.id) entry.voted = true;
        map[row.place_id] = entry;
      }
      setVotes(map);
      await saveVotes(tripId, map);
    } catch {
      // Stay on the offline cache.
    }
  }, [tripId, user, scope]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function toggleVote(placeId: string) {
    if (!tripId) return;
    const current = votes[placeId] ?? { count: 0, voted: false };
    const nextVoted = !current.voted;
    const optimistic: VotesMap = {
      ...votes,
      [placeId]: { count: Math.max(0, current.count + (nextVoted ? 1 : -1)), voted: nextVoted },
    };
    setVotes(optimistic);
    await saveVotes(tripId, optimistic);

    if (!supabase || !user || !isUuid(tripId) || !isUuid(placeId)) return;
    try {
      if (nextVoted) {
        await supabase.from('place_votes').insert({ place_id: placeId, trip_id: tripId, user_id: user.id });
      } else {
        await supabase.from('place_votes').delete().eq('place_id', placeId).eq('user_id', user.id);
      }
    } catch {
      // The next reload reconciles with the server's source of truth.
    }
  }

  return { votes, isReady, toggleVote, reload };
}
