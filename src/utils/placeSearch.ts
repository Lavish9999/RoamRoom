import type { LatLng } from '@/data/mapPlaces';

// Location autocomplete via Photon (photon.komoot.io) — a free, no-key
// geocoder built for typeahead. Results are biased toward the trip city when a
// center is supplied. Failures return [] so the field still accepts free text.
export type PlaceResult = {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  properties?: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

// Destination autocomplete (cities, states, regions, countries) for the
// create-trip flow. Uses Photon's `place` results so any real location works —
// not just a curated city list. Returns display strings like
// "Sacramento, California, United States". Failures return [] (free text still
// works).
export async function searchDestinationPlaces(query: string, limit = 6): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lang=en&osm_tag=place`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const out: string[] = [];
    for (const feature of json.features ?? []) {
      const p = feature.properties ?? {};
      const name = p.name;
      if (!name) continue;
      const parts = [name];
      if (p.state && p.state !== name) parts.push(p.state);
      if (p.country && p.country !== name) parts.push(p.country);
      const label = parts.join(', ');
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchPlaces(query: string, center?: LatLng): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
  if (center) {
    // Bias by proximity AND hard-limit to a metro-sized box so generic queries
    // (e.g. "mcdonalds") return spots in the trip city, not the other side of
    // the world.
    const dLat = 0.7;
    const dLng = 0.9;
    const bbox = [center.lng - dLng, center.lat - dLat, center.lng + dLng, center.lat + dLat].join(',');
    url += `&lat=${center.lat}&lon=${center.lng}&bbox=${bbox}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const results: PlaceResult[] = [];
    for (const feature of json.features ?? []) {
      const p = feature.properties ?? {};
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;
      const [lng, lat] = coords;
      const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || q;
      const label = [p.district || p.city, p.state, p.country].filter(Boolean).slice(0, 2).join(', ');
      const dedupeKey = `${name}|${label}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push({ id: `${p.osm_id ?? name}-${results.length}`, name, label, lat, lng });
    }
    return results;
  } catch {
    return [];
  }
}
