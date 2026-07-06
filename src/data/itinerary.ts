export type ItineraryKind = 'flight' | 'stay' | 'food' | 'activity' | 'transport' | 'free';

export type ItineraryStatus = 'idea' | 'planned' | 'booked' | 'done';

export type ItineraryItem = {
  id: string;
  tripId: string;
  day: number;
  time: string;
  title: string;
  location: string;
  kind: ItineraryKind;
  status: ItineraryStatus;
  notes?: string;
};

export type NewItineraryItem = Omit<ItineraryItem, 'id' | 'tripId' | 'status'> & {
  status?: ItineraryStatus;
};

export const starterItinerary: Record<string, ItineraryItem[]> = {
  'tokyo-spring-trip': [
    {
      id: 'tokyo-day1-flight',
      tripId: 'tokyo-spring-trip',
      day: 1,
      time: '11:15 AM',
      title: 'NH 7 departs JFK',
      location: 'John F. Kennedy International Airport',
      kind: 'flight',
      status: 'booked',
      notes: 'Robert has the confirmation. Seats 34A-34D held together.',
    },
    {
      id: 'tokyo-day2-checkin',
      tripId: 'tokyo-spring-trip',
      day: 2,
      time: '3:00 PM',
      title: 'Hotel Metropolitan check-in',
      location: 'Tokyo Marunouchi',
      kind: 'stay',
      status: 'planned',
      notes: 'Confirmation still missing from vault.',
    },
    {
      id: 'tokyo-day2-teamlab',
      tripId: 'tokyo-spring-trip',
      day: 2,
      time: '12:30 PM',
      title: 'teamLab Planets',
      location: 'Toyosu',
      kind: 'activity',
      status: 'booked',
      notes: 'Leave 36 minutes for transit from lunch.',
    },
    {
      id: 'tokyo-day2-ichiran',
      tripId: 'tokyo-spring-trip',
      day: 2,
      time: '7:30 PM',
      title: 'Ichiran Ramen',
      location: 'Shibuya',
      kind: 'food',
      status: 'planned',
      notes: 'Backup: Fuunji Tsukemen if the line is too long.',
    },
    {
      id: 'tokyo-day4-kyoto',
      tripId: 'tokyo-spring-trip',
      day: 4,
      time: '8:00 AM',
      title: 'Kyoto day trip',
      location: 'Tokyo Station to Kyoto',
      kind: 'transport',
      status: 'idea',
      notes: 'Needs final group vote and rail-pass decision.',
    },
  ],
};

export function getStarterItinerary(tripId: string): ItineraryItem[] {
  return starterItinerary[tripId] ? [...starterItinerary[tripId]] : [];
}