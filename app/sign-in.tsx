import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, type AuthProvider } from '@/state/AuthContext';
import { useToast } from '@/state/ToastContext';
import { colors, radii, shadows } from '@/theme';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isConfigured, signIn } = useAuth();
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  async function handle(provider: AuthProvider) {
    if (busy) return;
    setBusy(provider);
    try {
      await signIn(provider);
      toast.show('Signed in');
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      if (message !== 'Sign in was cancelled.') toast.show(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="airplane" size={30} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Plan trips together</Text>
        <Text style={styles.subtitle}>
          Sign in to share trips with your crew — live itinerary, shared expenses, and group votes, synced across everyone's phones.
        </Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={[styles.authButton, styles.appleButton, busy === 'apple' && styles.buttonBusy]}
          onPress={() => handle('apple')}
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
          onPress={() => handle('google')}
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
      </View>

      {!isConfigured ? (
        <Text style={styles.notice}>Cloud sync isn't set up on this build yet. Your trips stay on this device for now.</Text>
      ) : (
        <Text style={styles.legal}>By continuing you agree to keep it chill and travel responsibly.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  logo: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', marginBottom: 22, ...shadows.float },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, textAlign: 'center', letterSpacing: -0.4 },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 22, color: colors.ink2, textAlign: 'center', paddingHorizontal: 4 },
  buttons: { gap: 12, marginBottom: 16 },
  authButton: { height: 54, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.card },
  buttonBusy: { opacity: 0.8 },
  authIcon: { marginRight: 10 },
  appleButton: { backgroundColor: '#000000' },
  appleLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  googleButton: { backgroundColor: '#FFFFFF' },
  googleLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  notice: { fontSize: 13, lineHeight: 19, color: colors.ink2, textAlign: 'center', marginBottom: 28 },
  legal: { fontSize: 12.5, lineHeight: 18, color: colors.ink2, textAlign: 'center', marginBottom: 28 },
});
