import type { ItineraryKind, ItineraryStatus } from './itinerary';
import type { Vibe } from './types';

// A lightweight itinerary stop used to pre-seed a new trip's Plan tab. Turned
// into real ItineraryItems (with ids + the trip's destination as location) by
// seedTripItinerary.
export type StarterStop = {
  day: number;
  time: string;
  title: string;
  kind: ItineraryKind;
  status?: ItineraryStatus;
};

const ARRIVAL: StarterStop = { day: 1, time: '3:00 PM', title: 'Arrive & check in', kind: 'stay', status: 'planned' };

// One suggested stop per vibe, so the vibes chosen at creation turn into real
// (idea-status) starters on the Plan tab.
const VIBE_STOPS: Record<Vibe, StarterStop> = {
  Foodie: { day: 2, time: '7:30 PM', title: 'Dinner at a local favorite', kind: 'food' },
  Culture: { day: 2, time: '10:00 AM', title: 'Museum or landmark visit', kind: 'activity' },
  Relaxing: { day: 3, time: '11:00 AM', title: 'Slow morning / park time', kind: 'free' },
  Nightlife: { day: 2, time: '9:30 PM', title: 'Night out', kind: 'free' },
  Adventure: { day: 3, time: '9:00 AM', title: 'Outdoor adventure', kind: 'activity' },
  Shopping: { day: 3, time: '2:00 PM', title: 'Shopping stop', kind: 'activity' },
  Family: { day: 2, time: '10:00 AM', title: 'Family-friendly outing', kind: 'activity' },
  'Road trip': { day: 1, time: '9:00 AM', title: 'Drive to the first stop', kind: 'transport' },
};

/**
 * Starter stops derived from a trip's vibes: an arrival stop plus one idea per
 * vibe. Returns [] when no vibes are chosen, so a blank trip stays blank.
 */
export function vibeStarterStops(vibes: Vibe[]): StarterStop[] {
  if (vibes.length === 0) return [];
  const vibeStops = vibes.map((vibe) => VIBE_STOPS[vibe]).filter(Boolean).map((stop) => ({ ...stop, status: stop.status ?? ('idea' as ItineraryStatus) }));
  return [ARRIVAL, ...vibeStops];
}
