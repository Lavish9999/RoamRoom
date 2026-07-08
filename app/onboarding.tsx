import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markOnboardingSeen } from '@/state/onboarding';
import { useAuth, type AuthProvider } from '@/state/AuthContext';
import { useToast } from '@/state/ToastContext';
import { colors, radii, shadows } from '@/theme';

const highlights: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; bg: string; fg: string }[] = [
  { icon: 'map-outline', title: 'One shared plan', copy: 'Everyone sees the same map and day-by-day itinerary.', bg: '#182B45', fg: '#8FB4FF' },
  { icon: 'heart-outline', title: 'Vote together', copy: 'Add places and let the group pick the favorites.', bg: '#331C19', fg: '#F08A6A' },
  { icon: 'wallet-outline', title: 'Split the costs', copy: 'Track shared spending and see who owes who.', bg: '#142A1C', fg: '#5FCB86' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isConfigured, signIn } = useAuth();
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  async function finish() {
    await markOnboardingSeen();
    router.replace('/');
  }

  async function handleSignIn(provider: AuthProvider) {
    if (busy) return;
    setBusy(provider);
    try {
      await signIn(provider);
      await markOnboardingSeen();
      toast.show('Signed in');
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      if (message !== 'Sign in was cancelled.') toast.show(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#141C2B', colors.bg]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 0.6 }} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="airplane" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Group trips,{'\n'}actually organized.</Text>
          <Text style={styles.subtitle}>Plan the map, the days, and the money with your crew — all in one place.</Text>
        </View>

        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item.title} style={styles.highlightRow}>
              <View style={[styles.highlightIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.fg} />
              </View>
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightCopy}>{item.copy}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.authButton, styles.appleButton, busy === 'apple' && styles.buttonBusy]}
            onPress={() => handleSignIn('apple')}
            disabled={!isConfigured || busy != null}
          >
            {busy === 'apple' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.authIcon} />
                <Text style={styles.appleLabel}>Continue with Apple</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.authButton, styles.googleButton, busy === 'google' && styles.buttonBusy]}
            onPress={() => handleSignIn('google')}
            disabled={!isConfigured || busy != null}
          >
            {busy === 'google' ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.authIcon} />
                <Text style={styles.googleLabel}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.skipButton} onPress={finish} disabled={busy != null}>
            <Text style={styles.skipText}>Continue without an account</Text>
          </Pressable>

          {!isConfigured ? (
            <Text style={styles.notice}>Sign-in isn't set up on this build yet — continue without an account for now.</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { alignItems: 'flex-start' },
  logo: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', marginBottom: 22, ...shadows.float },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6, color: colors.ink },
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 23, color: colors.ink2 },
  highlights: { gap: 18, paddingVertical: 12 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  highlightIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  highlightText: { flex: 1 },
  highlightTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  highlightCopy: { marginTop: 2, fontSize: 13.5, lineHeight: 19, color: colors.ink2 },
  actions: { gap: 12 },
  authButton: { height: 54, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.card },
  buttonBusy: { opacity: 0.8 },
  authIcon: { marginRight: 10 },
  appleButton: { backgroundColor: '#000000' },
  appleLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  googleButton: { backgroundColor: '#FFFFFF' },
  googleLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  skipButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
  notice: { fontSize: 12.5, lineHeight: 18, color: colors.ink2, textAlign: 'center' },
});
