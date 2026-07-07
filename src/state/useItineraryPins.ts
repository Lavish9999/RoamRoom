import { useEffect, useState } from 'react';

import type { ItineraryItem, ItineraryStatus } from '@/data/itinerary';
import type { LatLng, MapPlace, MapPlaceStatus } from '@/data/mapPlaces';
import { resolveCoordinate } from '@/utils/geocode';

function mapStatus(status: ItineraryStatus): MapPlaceStatus {
  return status === 'done' ? 'visited' : status;
}

function toPlace(item: ItineraryItem, coord: LatLng): MapPlace {
  return {
    id: `itin-${item.id}`,
    tripId: item.tripId,
    title: item.title,
    area: item.location,
    day: item.day,
    time: item.time,
    kind: item.kind,
    status: mapStatus(item.status),
    note: item.notes,
    lat: coord.lat,
    lng: coord.lng,
    source: 'itinerary',
    createdAt: '',
  };
}

/**
 * Derives read-only map pins from the trip itinerary by geocoding each stop's
 * location (cached). Returns [] when disabled or there are no stops. The pins
 * are recomputed only when the set of stops (id + location) actually changes.
 */
export function useItineraryPins(items: ItineraryItem[], center: LatLng, enabled: boolean): MapPlace[] {
  const [pins, setPins] = useState<MapPlace[]>([]);
  const itemsKey = items.map((item) => `${item.id}:${item.location}:${item.status}`).join('|');

  useEffect(() => {
    if (!enabled || items.length === 0) {
      setPins([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const resolved: MapPlace[] = [];
      for (const item of items) {
        const coord = await resolveCoordinate(item.location, center);
        if (cancelled) return;
        resolved.push(toPlace(item, coord));
      }
      if (!cancelled) setPins(resolved);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, itemsKey, center.lat, center.lng]);

  return pins;
}
