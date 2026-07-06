import type { ItineraryKind } from './itinerary';

export type MapPlaceStatus = 'idea' | 'planned' | 'booked' | 'visited';

export type MapPlace = {
  id: string;
  tripId: string;
  title: string;
  area: string;
  day?: number;
  time?: string;
  kind: ItineraryKind;
  status: MapPlaceStatus;
  note?: string;
  x: number;
  y: number;
  source: 'itinerary' | 'saved';
  createdAt: string;
};

export type NewMapPlace = Omit<MapPlace, 'id' | 'tripId' | 'x' | 'y' | 'source' | 'createdAt'> & {
  source?: 'itinerary' | 'saved';
};

export const mapPinSlots = [
  { x: 64, y: 28 },
  { x: 48, y: 42 },
  { x: 72, y: 48 },
  { x: 36, y: 56 },
  { x: 58, y: 64 },
  { x: 78, y: 68 },
  { x: 42, y: 26 },
  { x: 28, y: 45 },
];

export const starterMapPlaces: Record<string, MapPlace[]> = {
  'tokyo-spring-trip': [
    {
      id: 'map-hotel-metropolitan',
      tripId: 'tokyo-spring-trip',
      title: 'Hotel Metropolitan Tokyo Marunouchi',
      area: 'Marunouchi',
      day: 2,
      time: '3:00 PM',
      kind: 'stay',
      status: 'planned',
      note: 'Home base near Tokyo Station. Confirmation still needs to be filed.',
      x: 56,
      y: 44,
      source: 'itinerary',
      createdAt: '2026-04-02T12:00:00.000Z',
    },
    {
      id: 'map-teamlab-planets',
      tripId: 'tokyo-spring-trip',
      title: 'teamLab Planets',
      area: 'Toyosu',
      day: 2,
      time: '12:30 PM',
      kind: 'activity',
      status: 'booked',
      note: 'Timed-entry tickets are booked. Leave buffer for transit.',
      x: 72,
      y: 58,
      source: 'itinerary',
      createdAt: '2026-04-03T12:00:00.000Z',
    },
    {
      id: 'map-ichiran-shibuya',
      tripId: 'tokyo-spring-trip',
      title: 'Ichiran Ramen',
      area: 'Shibuya',
      day: 2,
      time: '7:30 PM',
      kind: 'food',
      status: 'planned',
      note: 'Arrival-night ramen. Fuunji Tsukemen is the backup.',
      x: 38,
      y: 52,
      source: 'itinerary',
      createdAt: '2026-04-04T12:00:00.000Z',
    },
    {
      id: 'map-golden-gai',
      tripId: 'tokyo-spring-trip',
      title: 'Golden Gai',
      area: 'Shinjuku',
      day: 3,
      time: '9:00 PM',
      kind: 'free',
      status: 'idea',
      note: 'Good late-night option if the group still has energy.',
      x: 44,
      y: 34,
      source: 'saved',
      createdAt: '2026-04-05T12:00:00.000Z',
    },
    {
      id: 'map-sensoji',
      tripId: 'tokyo-spring-trip',
      title: 'Senso-ji Temple',
      area: 'Asakusa',
      day: 3,
      time: '10:00 AM',
      kind: 'activity',
      status: 'idea',
      note: 'Pair with coffee and a river walk.',
      x: 68,
      y: 30,
      source: 'saved',
      createdAt: '2026-04-06T12:00:00.000Z',
    },
  ],
};

export function getStarterMapPlaces(tripId: string): MapPlace[] {
  return starterMapPlaces[tripId] ? [...starterMapPlaces[tripId]] : [];
}
