import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Several real photos of a destination (for the create-flow template covers).
// Prefers Unsplash (high-quality travel photography) when an access key is
// configured, and falls back to Openverse's free, key-less CC search. One
// request per destination, cached in memory + storage. Callers fall back to a
// gradient when this is empty (network down, no results, etc.).
const CACHE_KEY = 'roamroom.destphotos.v2';

const unsplashKey = ((Constants.expoConfig?.extra ?? {}) as { unsplashAccessKey?: string }).unsplashAccessKey?.trim();

const memory = new Map<string, string[]>();
let loaded = false;

function normalize(destination: string) {
  return (destination.split(',')[0] || destination).trim().toLowerCase().replace(/\s+/g, ' ');
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      Object.entries(parsed).forEach(([key, value]) => memory.set(key, value));
    }
  } catch {
    // Ignore a corrupt/absent cache — we'll just refetch.
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    // Non-fatal.
  }
}

/** Synchronously read already-resolved photos (in-memory cache only). */
export function getCachedDestinationPhotos(destination: string): string[] | undefined {
  return memory.get(normalize(destination));
}

async function fetchFromUnsplash(query: string, count: number): Promise<string[]> {
  if (!unsplashKey) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${unsplashKey}` } });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<{ urls?: { small?: string; regular?: string } }> };
    return (json.results ?? [])
      .map((item) => item.urls?.small || item.urls?.regular)
      .filter((value): value is string => Boolean(value));
  } catch {
    return [];
  }
}

async function fetchFromOpenverse(query: string, count: number): Promise<string[]> {
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${count}&mature=false`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<{ thumbnail?: string; url?: string }> };
    return (json.results ?? [])
      .map((item) => item.thumbnail || item.url)
      .filter((value): value is string => Boolean(value));
  } catch {
    return [];
  }
}

export async function fetchDestinationPhotos(destination: string, count = 8): Promise<string[]> {
  const key = normalize(destination);
  if (!key) return [];
  if (memory.has(key)) return memory.get(key)!;

  await ensureLoaded();
  if (memory.has(key)) return memory.get(key)!;

  // Unsplash first (better photography), Openverse as the key-less fallback.
  const fromUnsplash = await fetchFromUnsplash(key, count);
  const resolved = fromUnsplash.length ? fromUnsplash : await fetchFromOpenverse(key, count);
  if (resolved.length) {
    memory.set(key, resolved);
    void persist();
  }
  return resolved;
}
