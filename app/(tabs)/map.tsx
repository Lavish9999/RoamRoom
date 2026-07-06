import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTrips } from '@/state/useTrips';

export default function MapScreen() {
  const { trips } = useTrips();
  return <PlaceholderScreen tripName={trips[0]?.name} copy="Next we will connect saved places, votes, and day plans to a real map view." />;
}
