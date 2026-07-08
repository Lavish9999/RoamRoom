import AsyncStorage from '@react-native-async-storage/async-storage';

// Several real photos of a destination (for the create-flow template covers),
// via Openverse's free, key-less CC image search. One request per destination,
// cached in memory + storage. Callers fall back to a gradient when this is empty
// (network down, no results, etc.).
const CACHE_KEY = 'roamroom.destphotos.v1';

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

export async function fetchDestinationPhotos(destination: string, count = 8): Promise<string[]> {
  const key = normalize(destination);
  if (!key) return [];
  if (memory.has(key)) return memory.get(key)!;

  await ensureLoaded();
  if (memory.has(key)) return memory.get(key)!;

  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(key)}&page_size=${count}&mature=false`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: Array<{ thumbnail?: string; url?: string }> };
    const urls = (json.results ?? [])
      .map((item) => item.thumbnail || item.url)
      .filter((value): value is string => Boolean(value));
    if (urls.length) {
      memory.set(key, urls);
      void persist();
    }
    return urls;
  } catch {
    return [];
  }
}
