import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { seedChecklist, type ChecklistItem } from '@/data/checklist';

const CHECKLIST_KEY_PREFIX = 'roamroom.checklist.v1.';

function storageKey(tripId: string) {
  return `${CHECKLIST_KEY_PREFIX}${tripId}`;
}

function createId() {
  return `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function loadItems(tripId: string): Promise<ChecklistItem[]> {
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  if (raw == null) return seedChecklist();
  try {
    return JSON.parse(raw) as ChecklistItem[];
  } catch {
    return seedChecklist();
  }
}

export function useChecklist(tripId?: string) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) {
      setItems([]);
      setIsReady(true);
      return;
    }
    setItems(await loadItems(tripId));
    setIsReady(true);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function persist(next: ChecklistItem[]) {
    setItems(next);
    if (tripId) await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(next));
  }

  function toggle(id: string) {
    void persist(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  }

  function addItem(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    void persist([...items, { id: createId(), label: trimmed, done: false }]);
  }

  function removeItem(id: string) {
    void persist(items.filter((item) => item.id !== id));
  }

  const doneCount = items.filter((item) => item.done).length;

  return { items, isReady, toggle, addItem, removeItem, doneCount, total: items.length };
}
