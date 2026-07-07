import AsyncStorage from '@react-native-async-storage/async-storage';

// Real destination cover photos via Wikipedia's public image API. No API key,
// free, and works for almost any city. Results are cached (memory + storage)
// so a given destination only hits the network once, then loads instantly and
// works offline.
const CACHE_KEY = 'roamroom.destphoto.v1';

const memory = new Map<string, string>();
let loaded = false;

function normalize(destination: string) {
  return destination.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
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
    // Non-fatal: a failed write just means we refetch next time.
  }
}

async function fetchThumb(title: string): Promise<string | null> {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=900&origin=*&titles=' +
    encodeURIComponent(title);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { query?: { pages?: Record<string, { thumbnail?: { source?: string } }> } };
    const pages = json.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const source = page.thumbnail?.source;
      // Skip SVG-derived lead images (locator maps, flags, coats of arms) which
      // aren't real photos - better to fall back to the gradient.
      if (source && !/\.svg/i.test(source)) return source;
    }
  } catch {
    // Network/parse failure -> caller falls back to the gradient.
  }
  return null;
}

/** Synchronously read an already-resolved photo URL (in-memory cache only). */
export function getCachedDestinationPhoto(destination: string): string | undefined {
  return memory.get(normalize(destination));
}

/**
 * Resolve a real cover photo URL for a destination, or null if none is found.
 * Tries the city (text before the first comma), then the full string.
 */
export async function fetchDestinationPhoto(destination: string): Promise<string | null> {
  const clean = destination.trim();
  if (!clean) return null;

  const key = normalize(clean);
  const cached = memory.get(key);
  if (cached) return cached;

  await ensureLoaded();
  const cachedAfterLoad = memory.get(key);
  if (cachedAfterLoad) return cachedAfterLoad;

  const city = clean.split(',')[0]?.trim() || clean;
  const found = (await fetchThumb(city)) ?? (city !== clean ? await fetchThumb(clean) : null);
  if (found) {
    memory.set(key, found);
    void persist();
  }
  return found;
}
