import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getStarterExpenses, type NewTripExpense, type TripExpense } from '@/data/expenses';

const EXPENSES_KEY_PREFIX = 'roamroom.expenses.v1.';

function storageKey(tripId: string) {
  return `${EXPENSES_KEY_PREFIX}${tripId}`;
}

function createId() {
  return `expense-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortExpenses(expenses: TripExpense[]) {
  return [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function loadExpenses(tripId: string): Promise<TripExpense[]> {
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  return raw ? sortExpenses(JSON.parse(raw) as TripExpense[]) : getStarterExpenses(tripId);
}

async function saveExpenses(tripId: string, expenses: TripExpense[]) {
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(sortExpenses(expenses)));
}

export function useExpenses(tripId?: string) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) {
      setExpenses([]);
      setIsReady(true);
      return;
    }

    const next = await loadExpenses(tripId);
    setExpenses(next);
    setIsReady(true);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function addExpense(input: NewTripExpense) {
    if (!tripId) return;

    const nextExpense: TripExpense = {
      ...input,
      id: createId(),
      tripId,
      createdAt: new Date().toISOString(),
    };
    const next = sortExpenses([nextExpense, ...expenses]);
    setExpenses(next);
    await saveExpenses(tripId, next);
  }

  async function removeExpense(id: string) {
    if (!tripId) return;

    const next = expenses.filter((expense) => expense.id !== id);
    setExpenses(next);
    await saveExpenses(tripId, next);
  }

  return { expenses, isReady, addExpense, removeExpense, reload };
}
