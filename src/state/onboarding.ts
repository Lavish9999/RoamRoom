import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-level flag (not user-scoped): the welcome flow is shown once per
// install, before anyone signs in.
const ONBOARDING_KEY = 'roamroom.onboardingSeen.v1';

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) != null;
  } catch {
    return true; // On error, don't trap the user on the welcome screen.
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, new Date().toISOString());
  } catch {
    // Non-fatal.
  }
}
