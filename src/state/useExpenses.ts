import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

import { getStarterExpenses, type NewTripExpense, type TripExpense } from '@/data/expenses';
import { subscribeTripTable } from '@/lib/realtime';
import { supabase } from '@/lib/supabase';
import { expenseToInsert, expenseToUpdate, isUuid, mapExpenseRow } from '@/lib/supabaseData';

import { useAuth } from './AuthContext';
import { ensureStorageReady, scopedKey, useStorageScope } from './storageScope';
import type { SyncStatus } from './syncStatus';

function storageKey(tripId: string) {
  return scopedKey(`expenses.${tripId}`);
}

function createId() {
  return `expense-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortExpenses(expenses: TripExpense[]) {
  return [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function mergeRemoteWithLocalPending(remote: TripExpense[], local: TripExpense[]) {
  const remoteIds = new Set(remote.map((expense) => expense.id));
  const pending = local.filter((expense) => !remoteIds.has(expense.id) && !isUuid(expense.id));
  return sortExpenses([...remote, ...pending]);
}

async function loadExpenses(tripId: string): Promise<TripExpense[]> {
  await ensureStorageReady();
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  return raw ? sortExpenses(JSON.parse(raw) as TripExpense[]) : getStarterExpenses(tripId);
}

async function saveExpenses(tripId: string, expenses: TripExpense[]) {
  await ensureStorageReady();
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortExpenses(expenses)));
}

export function useExpenses(tripId?: string) {
  const { user } = useAuth();
  const scope = useStorageScope();
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local-only');

  // Drop the previous account's cached expenses the instant the scope changes.
  useEffect(() => {
    setExpenses([]);
    setIsReady(false);
    setSyncStatus('local-only');
  }, [scope]);

  const reload = useCallback(async () => {
    if (!tripId) {
      setExpenses([]);
      setIsReady(true);
      setSyncStatus('local-only');
      return;
    }

    let next = await loadExpenses(tripId);
    setExpenses(next);
    setIsReady(true);

    if (!supabase || !user || !isUuid(tripId)) {
      setSyncStatus('local-only');
      return;
    }

    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
      if (error) throw error;
      next = mergeRemoteWithLocalPending((data ?? []).map(mapExpenseRow), next);
      setExpenses(next);
      await saveExpenses(tripId, next);
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

  // Live updates: reload when anyone changes this trip's expenses.
  useEffect(() => {
    if (!supabase || !user || !tripId || !isUuid(tripId)) return;
    return subscribeTripTable('expenses', tripId, reload);
  }, [tripId, user, reload]);

  async function addExpense(input: NewTripExpense) {
    if (!tripId) return;

    let nextExpense: TripExpense = {
      ...input,
      id: createId(),
      tripId,
      createdAt: new Date().toISOString(),
    };

    if (supabase && user && isUuid(tripId)) {
      try {
        setSyncStatus('syncing');
        const { data, error } = await supabase
          .from('expenses')
          .insert(expenseToInsert(nextExpense, user.id))
          .select('*')
          .single();
        if (error) throw error;
        nextExpense = mapExpenseRow(data);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Keep the locally generated expense.
      }
    } else {
      setSyncStatus('local-only');
    }

    const next = sortExpenses([nextExpense, ...expenses]);
    setExpenses(next);
    await saveExpenses(tripId, next);
  }

  async function removeExpense(id: string) {
    if (!tripId) return;

    const next = expenses.filter((expense) => expense.id !== id);
    setExpenses(next);
    await saveExpenses(tripId, next);

    if (supabase && user && isUuid(tripId) && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('expenses').delete().eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local deletion remains available offline.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  async function updateExpense(id: string, patch: Partial<TripExpense>) {
    if (!tripId) return;

    const next = sortExpenses(expenses.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)));
    setExpenses(next);
    await saveExpenses(tripId, next);

    if (supabase && user && isUuid(tripId) && isUuid(id)) {
      try {
        setSyncStatus('syncing');
        await supabase.from('expenses').update(expenseToUpdate(patch, user.id)).eq('id', id);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
        // Local cache remains available offline.
      }
    } else {
      setSyncStatus('local-only');
    }
  }

  return { expenses, isReady, syncStatus, addExpense, updateExpense, removeExpense, reload };
}
