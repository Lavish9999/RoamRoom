import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTrips } from '@/state/useTrips';

export default function MemoriesScreen() {
  const { trips } = useTrips();
  return (
    <PlaceholderScreen
      tripName={trips[0]?.name}
      copy="This becomes recap cards, shared photos, stats, and exportable trip stories."
    />
  );
}
