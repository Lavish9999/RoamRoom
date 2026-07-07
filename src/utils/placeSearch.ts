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

export async function searchPlaces(query: string, center?: LatLng): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
  if (center) url += `&lat=${center.lat}&lon=${center.lng}`;

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
