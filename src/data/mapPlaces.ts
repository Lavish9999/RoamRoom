import type { ItineraryKind } from './itinerary';

export type MapPlaceStatus = 'idea' | 'planned' | 'booked' | 'visited';

export type LatLng = { lat: number; lng: number };

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
  lat: number;
  lng: number;
  source: 'itinerary' | 'saved';
  createdAt: string;
};

export type NewMapPlace = Omit<MapPlace, 'id' | 'tripId' | 'source' | 'createdAt' | 'lat' | 'lng'> & {
  source?: 'itinerary' | 'saved';
  lat?: number;
  lng?: number;
};

type PlaceTemplate = {
  title: string;
  area: string;
  day?: number;
  time?: string;
  kind: ItineraryKind;
  status?: MapPlaceStatus;
  note?: string;
  lat: number;
  lng: number;
  source?: 'itinerary' | 'saved';
};

// Approximate center of each supported city. Used to seed the initial map
// region and to place freshly-added spots somewhere sensible when we don't have
// exact coordinates for them yet.
const cityCenters: Record<string, LatLng> = {
  tokyo: { lat: 35.6812, lng: 139.7671 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
  newyork: { lat: 40.7549, lng: -73.984 },
};

export const DEFAULT_CENTER: LatLng = { lat: 48.8566, lng: 2.3522 };

const destinationSuggestions: Record<string, PlaceTemplate[]> = {
  tokyo: [
    { title: 'Hotel Metropolitan Tokyo Marunouchi', area: 'Marunouchi', day: 2, time: '3:00 PM', kind: 'stay', status: 'planned', note: 'Home base near Tokyo Station. Confirmation still needs to be filed.', lat: 35.6817, lng: 139.7686 },
    { title: 'teamLab Planets', area: 'Toyosu', day: 2, time: '12:30 PM', kind: 'activity', status: 'booked', note: 'Timed-entry tickets are booked. Leave buffer for transit.', lat: 35.6499, lng: 139.7906 },
    { title: 'Ichiran Ramen', area: 'Shibuya', day: 2, time: '7:30 PM', kind: 'food', status: 'planned', note: 'Arrival-night ramen. Fuunji Tsukemen is the backup.', lat: 35.6614, lng: 139.7006 },
    { title: 'Golden Gai', area: 'Shinjuku', day: 3, time: '9:00 PM', kind: 'free', status: 'idea', note: 'Good late-night option if the group still has energy.', lat: 35.6941, lng: 139.7043 },
    { title: 'Senso-ji Temple', area: 'Asakusa', day: 3, time: '10:00 AM', kind: 'activity', status: 'idea', note: 'Pair with coffee and a river walk.', lat: 35.7148, lng: 139.7967 },
    { title: 'Tsukiji Outer Market', area: 'Chuo City', day: 3, time: '9:30 AM', kind: 'food', status: 'idea', note: 'Breakfast crawl candidate with sushi, tamagoyaki, and coffee.', lat: 35.6654, lng: 139.7707 },
  ],
  kyoto: [
    { title: 'Fushimi Inari Taisha', area: 'Fushimi', day: 1, time: '8:30 AM', kind: 'activity', status: 'idea', note: 'Go early for the torii gates before crowds build.', lat: 34.9671, lng: 135.7727 },
    { title: 'Kiyomizu-dera', area: 'Higashiyama', day: 1, time: '11:00 AM', kind: 'activity', status: 'idea', note: 'Pair with Ninenzaka and Sannenzaka lanes.', lat: 34.9949, lng: 135.785 },
    { title: 'Nishiki Market', area: 'Nakagyo', day: 1, time: '1:30 PM', kind: 'food', status: 'idea', note: 'Easy lunch stop with lots of small bites.', lat: 35.005, lng: 135.7649 },
    { title: 'Arashiyama Bamboo Grove', area: 'Arashiyama', day: 2, time: '9:00 AM', kind: 'activity', status: 'idea', note: 'Best as an early-morning cluster with Tenryu-ji.', lat: 35.017, lng: 135.6716 },
  ],
  lisbon: [
    { title: 'Pastéis de Belém', area: 'Belém', day: 1, time: '10:00 AM', kind: 'food', status: 'idea', note: 'Classic pastry stop near the river.', lat: 38.6975, lng: -9.2033 },
    { title: 'Jerónimos Monastery', area: 'Belém', day: 1, time: '11:00 AM', kind: 'activity', status: 'idea', note: 'Pair with Belém Tower and a riverside walk.', lat: 38.6979, lng: -9.2065 },
    { title: 'Miradouro da Senhora do Monte', area: 'Graça', day: 2, time: '6:30 PM', kind: 'free', status: 'idea', note: 'Golden-hour viewpoint candidate.', lat: 38.7197, lng: -9.131 },
    { title: 'Time Out Market', area: 'Cais do Sodré', day: 2, time: '8:00 PM', kind: 'food', status: 'idea', note: 'Good group dinner option with flexible choices.', lat: 38.7071, lng: -9.1459 },
  ],
  paris: [
    { title: 'Louvre Museum', area: '1st arrondissement', day: 1, time: '10:00 AM', kind: 'activity', status: 'idea', note: 'Book timed tickets if this becomes a must-do.', lat: 48.8606, lng: 2.3376 },
    { title: 'Le Marais', area: '3rd arrondissement', day: 1, time: '2:00 PM', kind: 'free', status: 'idea', note: 'Good walking and shopping cluster.', lat: 48.859, lng: 2.361 },
    { title: 'Eiffel Tower', area: '7th arrondissement', day: 2, time: '6:00 PM', kind: 'activity', status: 'idea', note: 'Sunset slot candidate.', lat: 48.8584, lng: 2.2945 },
    { title: 'Rue Cler', area: '7th arrondissement', day: 2, time: '12:30 PM', kind: 'food', status: 'idea', note: 'Lunch or picnic supply stop.', lat: 48.8556, lng: 2.305 },
  ],
  london: [
    { title: 'Borough Market', area: 'Southwark', day: 1, time: '12:00 PM', kind: 'food', status: 'idea', note: 'Flexible first-day food stop.', lat: 51.5055, lng: -0.091 },
    { title: 'Tower Bridge', area: 'Tower Hamlets', day: 1, time: '2:00 PM', kind: 'activity', status: 'idea', note: 'Pairs well with the Tower of London.', lat: 51.5055, lng: -0.0754 },
    { title: 'British Museum', area: 'Bloomsbury', day: 2, time: '10:00 AM', kind: 'activity', status: 'idea', note: 'Good rainy-day anchor.', lat: 51.5194, lng: -0.127 },
    { title: 'Soho dinner walk', area: 'Soho', day: 2, time: '7:00 PM', kind: 'food', status: 'idea', note: 'Keep this flexible for group votes.', lat: 51.5137, lng: -0.1338 },
  ],
  newyork: [
    { title: 'The High Line', area: 'Chelsea', day: 1, time: '10:00 AM', kind: 'free', status: 'idea', note: 'Easy walking route with food nearby.', lat: 40.748, lng: -74.0048 },
    { title: 'Chelsea Market', area: 'Chelsea', day: 1, time: '12:00 PM', kind: 'food', status: 'idea', note: 'Good group lunch option.', lat: 40.7424, lng: -74.006 },
    { title: 'Central Park', area: 'Upper Manhattan', day: 2, time: '10:00 AM', kind: 'free', status: 'idea', note: 'Anchor for a slower morning.', lat: 40.7829, lng: -73.9654 },
    { title: 'Top of the Rock', area: 'Midtown', day: 2, time: '6:00 PM', kind: 'activity', status: 'idea', note: 'Better if booked around sunset.', lat: 40.7593, lng: -73.9794 },
  ],
};

export function normalizeDestination(destination?: string) {
  return (destination ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

function destinationKey(destination?: string) {
  const normalized = normalizeDestination(destination);
  if (normalized.includes('tokyo')) return 'tokyo';
  if (normalized.includes('kyoto')) return 'kyoto';
  if (normalized.includes('lisbon')) return 'lisbon';
  if (normalized.includes('paris')) return 'paris';
  if (normalized.includes('london')) return 'london';
  if (normalized.includes('newyork') || normalized.includes('nyc')) return 'newyork';
  return 'generic';
}

function cityName(destination?: string) {
  return destination?.split(',')[0]?.trim() || 'the city';
}

/** Center coordinate for a destination, falling back to a sensible default. */
export function getCityCenter(destination?: string): LatLng {
  return cityCenters[destinationKey(destination)] ?? DEFAULT_CENTER;
}

/**
 * Produce a coordinate a short, randomized distance from `center` so that
 * newly-added places (which we can't geocode yet) land near the trip city
 * without stacking on top of each other. Roughly within a couple of km.
 */
export function generateCoordinateNear(center: LatLng): LatLng {
  const dLat = (Math.random() - 0.5) * 0.05;
  const dLng = (Math.random() - 0.5) * 0.06;
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

function genericSuggestions(destination?: string): PlaceTemplate[] {
  const city = cityName(destination);
  const center = getCityCenter(destination);
  const spread: LatLng[] = [
    { lat: center.lat + 0.006, lng: center.lng + 0.004 },
    { lat: center.lat - 0.004, lng: center.lng + 0.009 },
    { lat: center.lat + 0.003, lng: center.lng - 0.008 },
    { lat: center.lat - 0.008, lng: center.lng - 0.003 },
  ];
  return [
    { title: `${city} arrival hotel`, area: 'City center', day: 1, time: '3:00 PM', kind: 'stay', status: 'planned', note: 'Replace with the actual hotel once booked.', ...spread[0] },
    { title: `${city} old town walk`, area: 'Historic center', day: 1, time: '5:00 PM', kind: 'free', status: 'idea', note: 'A flexible first-day orientation walk.', ...spread[1] },
    { title: `${city} market lunch`, area: 'Market district', day: 2, time: '12:30 PM', kind: 'food', status: 'idea', note: 'Good candidate for a group food stop.', ...spread[2] },
    { title: `${city} viewpoint`, area: 'Scenic area', day: 2, time: '6:30 PM', kind: 'activity', status: 'idea', note: 'Sunset or photo stop candidate.', ...spread[3] },
  ];
}

export function getDestinationPlaceSuggestions(destination?: string): NewMapPlace[] {
  const key = destinationKey(destination);
  const templates = destinationSuggestions[key] ?? genericSuggestions(destination);
  return templates.map((template) => ({
    ...template,
    status: template.status ?? 'idea',
    source: template.source ?? 'saved',
  }));
}

export function getStarterMapPlaces(tripId: string, destination?: string): MapPlace[] {
  const templates = getDestinationPlaceSuggestions(destination ?? tripId);
  return templates.map((template, index) => ({
    ...template,
    id: `map-${tripId}-${index}`,
    tripId,
    lat: template.lat as number,
    lng: template.lng as number,
    source: template.source ?? 'saved',
    createdAt: new Date(2026, 3, index + 2).toISOString(),
  }));
}
