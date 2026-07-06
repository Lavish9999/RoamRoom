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

type PlaceTemplate = Omit<NewMapPlace, 'status'> & {
  status?: MapPlaceStatus;
};

const destinationSuggestions: Record<string, PlaceTemplate[]> = {
  tokyo: [
    { title: 'Hotel Metropolitan Tokyo Marunouchi', area: 'Marunouchi', day: 2, time: '3:00 PM', kind: 'stay', status: 'planned', note: 'Home base near Tokyo Station. Confirmation still needs to be filed.' },
    { title: 'teamLab Planets', area: 'Toyosu', day: 2, time: '12:30 PM', kind: 'activity', status: 'booked', note: 'Timed-entry tickets are booked. Leave buffer for transit.' },
    { title: 'Ichiran Ramen', area: 'Shibuya', day: 2, time: '7:30 PM', kind: 'food', status: 'planned', note: 'Arrival-night ramen. Fuunji Tsukemen is the backup.' },
    { title: 'Golden Gai', area: 'Shinjuku', day: 3, time: '9:00 PM', kind: 'free', status: 'idea', note: 'Good late-night option if the group still has energy.' },
    { title: 'Senso-ji Temple', area: 'Asakusa', day: 3, time: '10:00 AM', kind: 'activity', status: 'idea', note: 'Pair with coffee and a river walk.' },
    { title: 'Tsukiji Outer Market', area: 'Chuo City', day: 3, time: '9:30 AM', kind: 'food', status: 'idea', note: 'Breakfast crawl candidate with sushi, tamagoyaki, and coffee.' },
  ],
  kyoto: [
    { title: 'Fushimi Inari Taisha', area: 'Fushimi', day: 1, time: '8:30 AM', kind: 'activity', status: 'idea', note: 'Go early for the torii gates before crowds build.' },
    { title: 'Kiyomizu-dera', area: 'Higashiyama', day: 1, time: '11:00 AM', kind: 'activity', status: 'idea', note: 'Pair with Ninenzaka and Sannenzaka lanes.' },
    { title: 'Nishiki Market', area: 'Nakagyo', day: 1, time: '1:30 PM', kind: 'food', status: 'idea', note: 'Easy lunch stop with lots of small bites.' },
    { title: 'Arashiyama Bamboo Grove', area: 'Arashiyama', day: 2, time: '9:00 AM', kind: 'activity', status: 'idea', note: 'Best as an early-morning cluster with Tenryu-ji.' },
  ],
  lisbon: [
    { title: 'Pastéis de Belém', area: 'Belém', day: 1, time: '10:00 AM', kind: 'food', status: 'idea', note: 'Classic pastry stop near the river.' },
    { title: 'Jerónimos Monastery', area: 'Belém', day: 1, time: '11:00 AM', kind: 'activity', status: 'idea', note: 'Pair with Belém Tower and a riverside walk.' },
    { title: 'Miradouro da Senhora do Monte', area: 'Graça', day: 2, time: '6:30 PM', kind: 'free', status: 'idea', note: 'Golden-hour viewpoint candidate.' },
    { title: 'Time Out Market', area: 'Cais do Sodré', day: 2, time: '8:00 PM', kind: 'food', status: 'idea', note: 'Good group dinner option with flexible choices.' },
  ],
  paris: [
    { title: 'Louvre Museum', area: '1st arrondissement', day: 1, time: '10:00 AM', kind: 'activity', status: 'idea', note: 'Book timed tickets if this becomes a must-do.' },
    { title: 'Le Marais', area: '3rd arrondissement', day: 1, time: '2:00 PM', kind: 'free', status: 'idea', note: 'Good walking and shopping cluster.' },
    { title: 'Eiffel Tower', area: '7th arrondissement', day: 2, time: '6:00 PM', kind: 'activity', status: 'idea', note: 'Sunset slot candidate.' },
    { title: 'Rue Cler', area: '7th arrondissement', day: 2, time: '12:30 PM', kind: 'food', status: 'idea', note: 'Lunch or picnic supply stop.' },
  ],
  london: [
    { title: 'Borough Market', area: 'Southwark', day: 1, time: '12:00 PM', kind: 'food', status: 'idea', note: 'Flexible first-day food stop.' },
    { title: 'Tower Bridge', area: 'Tower Hamlets', day: 1, time: '2:00 PM', kind: 'activity', status: 'idea', note: 'Pairs well with the Tower of London.' },
    { title: 'British Museum', area: 'Bloomsbury', day: 2, time: '10:00 AM', kind: 'activity', status: 'idea', note: 'Good rainy-day anchor.' },
    { title: 'Soho dinner walk', area: 'Soho', day: 2, time: '7:00 PM', kind: 'food', status: 'idea', note: 'Keep this flexible for group votes.' },
  ],
  newyork: [
    { title: 'The High Line', area: 'Chelsea', day: 1, time: '10:00 AM', kind: 'free', status: 'idea', note: 'Easy walking route with food nearby.' },
    { title: 'Chelsea Market', area: 'Chelsea', day: 1, time: '12:00 PM', kind: 'food', status: 'idea', note: 'Good group lunch option.' },
    { title: 'Central Park', area: 'Upper Manhattan', day: 2, time: '10:00 AM', kind: 'free', status: 'idea', note: 'Anchor for a slower morning.' },
    { title: 'Top of the Rock', area: 'Midtown', day: 2, time: '6:00 PM', kind: 'activity', status: 'idea', note: 'Better if booked around sunset.' },
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

function genericSuggestions(destination?: string): PlaceTemplate[] {
  const city = cityName(destination);
  return [
    { title: `${city} arrival hotel`, area: 'City center', day: 1, time: '3:00 PM', kind: 'stay', status: 'planned', note: 'Replace with the actual hotel once booked.' },
    { title: `${city} old town walk`, area: 'Historic center', day: 1, time: '5:00 PM', kind: 'free', status: 'idea', note: 'A flexible first-day orientation walk.' },
    { title: `${city} market lunch`, area: 'Market district', day: 2, time: '12:30 PM', kind: 'food', status: 'idea', note: 'Good candidate for a group food stop.' },
    { title: `${city} viewpoint`, area: 'Scenic area', day: 2, time: '6:30 PM', kind: 'activity', status: 'idea', note: 'Sunset or photo stop candidate.' },
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
  const templates = getDestinationPlaceSuggestions(destination);
  return templates.map((template, index) => {
    const slot = mapPinSlots[index % mapPinSlots.length];
    return {
      ...template,
      id: `map-${tripId}-${index}`,
      tripId,
      x: slot.x,
      y: slot.y,
      source: template.source ?? 'saved',
      createdAt: new Date(2026, 3, index + 2).toISOString(),
    };
  });
}
