import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTrips } from '@/state/useTrips';

export default function PlanScreen() {
  const { trips } = useTrips();
  return (
    <PlaceholderScreen
      tripName={trips[0]?.name}
      copy="This becomes the live itinerary: days, activities, drag reorder, notes, and reservations."
    />
  );
}
