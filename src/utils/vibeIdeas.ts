import type { ItineraryKind } from '@/data/itinerary';
import type { LatLng } from '@/data/mapPlaces';
import type { Vibe } from '@/data/types';

import { searchPlaces, type PlaceResult } from './placeSearch';

// Each trip vibe maps to a real place-search query + a map/plan category, so the
// vibes picked during trip creation turn into actual suggested spots.
const VIBE_QUERY: Record<Vibe, { query: string; kind: ItineraryKind }> = {
  Foodie: { query: 'restaurant', kind: 'food' },
  Culture: { query: 'museum', kind: 'activity' },
  Relaxing: { query: 'park', kind: 'free' },
  Nightlife: { query: 'bar', kind: 'free' },
  Adventure: { query: 'viewpoint', kind: 'activity' },
  Shopping: { query: 'shopping', kind: 'activity' },
  Family: { query: 'zoo', kind: 'activity' },
  'Road trip': { query: 'landmark', kind: 'activity' },
};

export type VibeIdea = PlaceResult & { kind: ItineraryKind; vibe: Vibe };

/**
 * Fetches real places near `center` that match the trip's vibes (a couple per
 * vibe). Falls back to a sensible pair of vibes when none were chosen.
 */
export async function fetchVibeIdeas(vibes: Vibe[], center?: LatLng): Promise<VibeIdea[]> {
  const active = (vibes.length ? vibes : (['Culture', 'Foodie'] as Vibe[])).slice(0, 3);
  const out: VibeIdea[] = [];
  const seen = new Set<string>();

  for (const vibe of active) {
    const { query, kind } = VIBE_QUERY[vibe];
    const results = await searchPlaces(query, center);
    for (const result of results.slice(0, 2)) {
      if (seen.has(result.name)) continue;
      seen.add(result.name);
      out.push({ ...result, kind, vibe });
    }
  }
  return out;
}
