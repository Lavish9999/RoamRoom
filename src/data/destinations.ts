import type { CoverKey } from './types';

// A curated set of popular destinations powering the create-trip typeahead.
// Kept on-device (no API key / network dependency) so suggestions are instant
// and reliable; free-typed destinations still work.
export const popularDestinations: string[] = [
  'Tokyo, Japan',
  'Kyoto, Japan',
  'Osaka, Japan',
  'Seoul, South Korea',
  'Bangkok, Thailand',
  'Singapore',
  'Bali, Indonesia',
  'Hanoi, Vietnam',
  'Hong Kong',
  'Taipei, Taiwan',
  'Lisbon, Portugal',
  'Porto, Portugal',
  'Barcelona, Spain',
  'Madrid, Spain',
  'Paris, France',
  'Nice, France',
  'London, United Kingdom',
  'Edinburgh, United Kingdom',
  'Amsterdam, Netherlands',
  'Berlin, Germany',
  'Munich, Germany',
  'Rome, Italy',
  'Florence, Italy',
  'Venice, Italy',
  'Milan, Italy',
  'Athens, Greece',
  'Santorini, Greece',
  'Vienna, Austria',
  'Prague, Czechia',
  'Budapest, Hungary',
  'Copenhagen, Denmark',
  'Stockholm, Sweden',
  'Reykjavik, Iceland',
  'Dublin, Ireland',
  'Zurich, Switzerland',
  'Istanbul, Turkey',
  'Dubai, United Arab Emirates',
  'Marrakech, Morocco',
  'Cairo, Egypt',
  'Cape Town, South Africa',
  'New York City, USA',
  'Los Angeles, USA',
  'San Francisco, USA',
  'Chicago, USA',
  'Miami, USA',
  'Las Vegas, USA',
  'New Orleans, USA',
  'Honolulu, Hawaii',
  'Toronto, Canada',
  'Vancouver, Canada',
  'Montreal, Canada',
  'Mexico City, Mexico',
  'Cancun, Mexico',
  'Rio de Janeiro, Brazil',
  'Buenos Aires, Argentina',
  'Lima, Peru',
  'Cartagena, Colombia',
  'Sydney, Australia',
  'Melbourne, Australia',
  'Auckland, New Zealand',
  'Queenstown, New Zealand',
];

const KNOWN_COVERS: { match: string; key: CoverKey }[] = [
  { match: 'tokyo', key: 'tokyo' },
  { match: 'kyoto', key: 'kyoto' },
  { match: 'lisbon', key: 'lisbon' },
];

// Scenic gradient covers used for everything we don't have dedicated art for.
const COVER_PALETTE: CoverKey[] = ['sky', 'teamlab', 'goldengai', 'ichiran', 'lisbon', 'kyoto', 'tokyo'];

/**
 * Picks a cover for a destination: exact art for the cities we have it for,
 * otherwise a stable gradient chosen from the destination text so different
 * destinations get visibly different covers.
 */
export function coverKeyForDestination(destination: string): CoverKey {
  const normalized = destination.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return 'default';

  for (const { match, key } of KNOWN_COVERS) {
    if (normalized.includes(match)) return key;
  }

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash + normalized.charCodeAt(i) * (i + 1)) % 100000;
  }
  return COVER_PALETTE[hash % COVER_PALETTE.length];
}

/** Case-insensitive prefix/substring match, capped for a tidy dropdown. */
export function searchDestinations(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const dest of popularDestinations) {
    const lower = dest.toLowerCase();
    if (lower.startsWith(q)) starts.push(dest);
    else if (lower.includes(q)) contains.push(dest);
  }
  return [...starts, ...contains].slice(0, limit);
}
