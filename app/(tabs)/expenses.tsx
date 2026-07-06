import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTrips } from '@/state/useTrips';

export default function ExpensesScreen() {
  const { trips } = useTrips();
  return <PlaceholderScreen tripName={trips[0]?.name} copy="This becomes who paid, who owes, categories, and clean group balances." />;
}
