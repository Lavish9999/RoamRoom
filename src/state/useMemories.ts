import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

export type MemoryPhoto = {
  id: string;
  uri: string;
  caption: string;
  createdAt: string;
};

type MemoryData = {
  photos: MemoryPhoto[];
  journal: string;
};

const MEMORIES_KEY_PREFIX = 'roamroom.memories.v1.';
const PHOTO_DIR = `${FileSystem.documentDirectory}memories/`;

function storageKey(tripId: string) {
  return `${MEMORIES_KEY_PREFIX}${tripId}`;
}

function createId() {
  return `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function ensureDir() {
  try {
    const info = await FileSystem.getInfoAsync(PHOTO_DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  } catch {
    // Directory creation is best-effort; copy will surface a real failure.
  }
}

async function loadData(tripId: string): Promise<MemoryData> {
  const raw = await AsyncStorage.getItem(storageKey(tripId));
  if (!raw) return { photos: [], journal: '' };
  try {
    const parsed = JSON.parse(raw) as Partial<MemoryData>;
    return { photos: parsed.photos ?? [], journal: parsed.journal ?? '' };
  } catch {
    return { photos: [], journal: '' };
  }
}

async function saveData(tripId: string, data: MemoryData) {
  await AsyncStorage.setItem(storageKey(tripId), JSON.stringify(data));
}

export function useMemories(tripId?: string) {
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [journal, setJournalState] = useState('');
  const [isReady, setIsReady] = useState(false);

  const reload = useCallback(async () => {
    if (!tripId) {
      setPhotos([]);
      setJournalState('');
      setIsReady(true);
      return;
    }
    const data = await loadData(tripId);
    setPhotos(data.photos);
    setJournalState(data.journal);
    setIsReady(true);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Copies the picked image into the app's document directory so it survives
  // cache clears, then records it against the trip.
  async function addPhoto(sourceUri: string) {
    if (!tripId) return;
    await ensureDir();
    const id = createId();
    const dest = `${PHOTO_DIR}${id}.jpg`;
    try {
      await FileSystem.copyAsync({ from: sourceUri, to: dest });
    } catch {
      return;
    }
    const next: MemoryData = { photos: [{ id, uri: dest, caption: '', createdAt: new Date().toISOString() }, ...photos], journal };
    setPhotos(next.photos);
    await saveData(tripId, next);
  }

  async function removePhoto(id: string) {
    if (!tripId) return;
    const target = photos.find((photo) => photo.id === id);
    if (target) {
      try {
        await FileSystem.deleteAsync(target.uri, { idempotent: true });
      } catch {
        // Ignore a missing file; we still drop it from the list.
      }
    }
    const nextPhotos = photos.filter((photo) => photo.id !== id);
    setPhotos(nextPhotos);
    await saveData(tripId, { photos: nextPhotos, journal });
  }

  async function setCaption(id: string, caption: string) {
    if (!tripId) return;
    const nextPhotos = photos.map((photo) => (photo.id === id ? { ...photo, caption } : photo));
    setPhotos(nextPhotos);
    await saveData(tripId, { photos: nextPhotos, journal });
  }

  async function saveJournal(text: string) {
    if (!tripId) return;
    setJournalState(text);
    await saveData(tripId, { photos, journal: text });
  }

  return { photos, journal, isReady, addPhoto, removePhoto, setCaption, saveJournal };
}
