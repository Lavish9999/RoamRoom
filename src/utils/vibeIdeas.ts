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

// Generic, always-available suggestions per vibe. Used when the live place
// search returns nothing (offline, rate-limited, or an ungeocodable city) so
// the "Ideas for your vibe" section is never empty.
const VIBE_FALLBACK: Record<Vibe, string[]> = {
  Foodie: ['Local food market', 'Popular dinner spot'],
  Culture: ['City museum', 'Historic landmark'],
  Relaxing: ['Central park', 'Waterfront walk'],
  Nightlife: ['Rooftop bar', 'Live music venue'],
  Adventure: ['Scenic viewpoint', 'Hiking trailhead'],
  Shopping: ['Main shopping street', 'Local craft market'],
  Family: ['City zoo', 'Family park'],
  'Road trip': ['Iconic landmark', 'Roadside overlook'],
};

function fallbackResults(vibe: Vibe, center?: LatLng): PlaceResult[] {
  const base = center ?? { lat: 0, lng: 0 };
  return VIBE_FALLBACK[vibe].map((name, index) => ({
    id: `fallback-${vibe}-${index}`,
    name,
    label: '',
    // Nudge each pin slightly off the city center so they don't stack exactly.
    lat: base.lat + (index - 0.5) * 0.012,
    lng: base.lng + (index - 0.5) * 0.012,
  }));
}

/**
 * Fetches real places near `center` that match the trip's vibes (a couple per
 * vibe). Falls back to a sensible pair of vibes when none were chosen, and to
 * curated generic spots when the live search comes back empty.
 */
export async function fetchVibeIdeas(vibes: Vibe[], center?: LatLng): Promise<VibeIdea[]> {
  const active = (vibes.length ? vibes : (['Culture', 'Foodie'] as Vibe[])).slice(0, 3);
  const out: VibeIdea[] = [];
  const seen = new Set<string>();

  for (const vibe of active) {
    const { query, kind } = VIBE_QUERY[vibe];
    let results = await searchPlaces(query, center);
    if (results.length === 0) results = fallbackResults(vibe, center);
    for (const result of results.slice(0, 2)) {
      if (seen.has(result.name)) continue;
      seen.add(result.name);
      out.push({ ...result, kind, vibe });
    }
  }
  return out;
}
