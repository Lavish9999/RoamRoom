import type { Trip, TripInvite } from './types';

// Canonical fixture data ported verbatim from the roamroom.html design spec.
// Used to seed a fresh install so the Trips home screen matches the spec on
// first run, exactly like the original App.tsx prototype used `starterTrips`.

export const tokyoSpringTrip: Trip = {
  id: 'tokyo-spring-trip',
  name: 'Tokyo Spring Trip',
  destination: 'Tokyo, Japan',
  startDate: 'May 12, 2026',
  endDate: 'May 18, 2026',
  status: 'Planning',
  coverKey: 'tokyo',
  members: [
    { id: 'robert', name: 'Robert', initial: 'R', role: 'Owner', avatarKey: 'robert' },
    { id: 'maya', name: 'Maya', initial: 'M', role: 'Planner', avatarKey: 'maya' },
    { id: 'chris', name: 'Chris', initial: 'C', role: 'Traveler', avatarKey: 'chris' },
    { id: 'lena', name: 'Lena', initial: 'L', role: 'Traveler', avatarKey: 'lena' },
  ],
  readinessDone: 4,
  readinessTotal: 6,
  inviteCode: 'TOKYO-4XR2',
  vibes: ['Foodie', 'Culture', 'Shopping'],
  budgetComfort: 'Mid-range',
  origin: 'blank',
};

export const lisbonInvite: TripInvite = {
  id: 'lisbon-long-weekend',
  tripName: 'Lisbon Long Weekend',
  invitedBy: 'Nadia',
  dates: 'Sep 4-7',
  goingCount: 5,
  coverKey: 'lisbon',
  inviteCode: 'LISBON-N4Q7',
};

// Only this built-in demo trip pre-seeds map places / itinerary so it matches
// the design spec on a fresh install. Trips the user creates start empty.
export const SEED_TRIP_ID = tokyoSpringTrip.id;

export const starterTrips: Trip[] = [tokyoSpringTrip];
export const starterInvites: TripInvite[] = [lisbonInvite];
