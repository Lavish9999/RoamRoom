import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/state/ToastContext';
import { colors } from '@/theme';
import { installTextDefaults } from '@/utils/textDefaults';

installTextDefaults();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
