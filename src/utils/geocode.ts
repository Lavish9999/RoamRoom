import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { generateCoordinateNear, type LatLng } from '@/data/mapPlaces';

// Forward geocoding (address/place name -> coordinate) does not require the
// user to grant location permission, so this works in Expo Go without any
// prompt or API key. Results are cached in AsyncStorage (and in memory) so we
// never re-hit the platform geocoder for a query we've already resolved.
const CACHE_KEY = 'roamroom.geocode.v1';

type Cache = Record<string, LatLng>;
let memoryCache: Cache | null = null;

function normalize(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadCache(): Promise<Cache> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memoryCache = raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

async function persistCache() {
  if (!memoryCache) return;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // A failed cache write is non-fatal; we just geocode again next time.
  }
}

/**
 * Resolve a free-text place/address query to a coordinate, or null if the
 * platform geocoder can't find it. Cached across calls.
 */
export async function geocodeQuery(query: string): Promise<LatLng | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const cache = await loadCache();
  const key = normalize(trimmed);
  if (cache[key]) return cache[key];

  try {
    const results = await Location.geocodeAsync(trimmed);
    if (results.length > 0) {
      const coord: LatLng = { lat: results[0].latitude, lng: results[0].longitude };
      cache[key] = coord;
      await persistCache();
      return coord;
    }
  } catch {
    // Geocoder unavailable or threw — fall through to null.
  }
  return null;
}

/**
 * Like {@link geocodeQuery} but always returns a coordinate: if the query
 * can't be geocoded it falls back to a stable point jittered near `center`
 * (cached so the same query keeps landing in the same spot).
 */
export async function resolveCoordinate(query: string, center: LatLng): Promise<LatLng> {
  const found = await geocodeQuery(query);
  if (found) return found;

  const cache = await loadCache();
  const fallbackKey = `fallback:${normalize(query)}`;
  if (cache[fallbackKey]) return cache[fallbackKey];

  const coord = generateCoordinateNear(center);
  cache[fallbackKey] = coord;
  await persistCache();
  return coord;
}
