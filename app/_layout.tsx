import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/state/AuthContext';
import { hasSeenOnboarding } from '@/state/onboarding';
import { ToastProvider } from '@/state/ToastContext';
import { colors } from '@/theme';
import { installTextDefaults } from '@/utils/textDefaults';

installTextDefaults();

// On first launch (welcome not seen and nobody signed in) send the user to the
// onboarding screen before the tabs. Runs once auth has resolved.
function OnboardingGate() {
  const { isReady, user } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (!isReady || handled.current) return;
    handled.current = true;
    (async () => {
      if (!user && !(await hasSeenOnboarding())) {
        router.replace('/onboarding');
      }
    })();
  }, [isReady, user]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <OnboardingGate />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="trip/[id]" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
          </Stack>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
