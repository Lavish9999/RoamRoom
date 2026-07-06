import { Stack } from 'expo-router';

import { CreateTripProvider } from '@/state/CreateTripContext';
import { colors } from '@/theme';

export default function CreateLayout() {
  return (
    <CreateTripProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="step-1" />
        <Stack.Screen name="step-2" />
        <Stack.Screen name="step-3" />
        <Stack.Screen name="step-4" />
        <Stack.Screen name="step-5" />
      </Stack>
    </CreateTripProvider>
  );
}
