import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components';
import { useAuth } from '@/state/AuthContext';
import { useToast } from '@/state/ToastContext';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { activeTrip, trips } = useTrips();
  const { user, isConfigured, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert('Sign out?', 'Your cloud trips will be waiting when you sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          toast.show('Signed out');
        },
      },
    ]);
  }

  function handleReset() {
    const message = user
      ? 'This clears the local copy on this device and signs you out. Your cloud trips stay safe and return when you sign back in.'
      : 'This clears all trips, plans, expenses, and saved places on this device and restores the sample data.';
    Alert.alert('Reset app data?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          try {
            await FileSystem.deleteAsync(`${FileSystem.documentDirectory}memories/`, { idempotent: true });
          } catch {
            // Ignore if the photo folder doesn't exist.
          }
          toast.show('App data reset');
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive">
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={type.eyebrow}>Settings</Text>
          <View style={styles.iconButton} />
        </View>

        <Text style={styles.h1}>Settings</Text>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Account</Text></View>
        {user ? (
          <Card padded style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>{(user.name ?? user.email ?? 'You').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName} numberOfLines={1}>{user.name ?? 'Signed in'}</Text>
                <Text style={styles.accountEmail} numberOfLines={1}>{user.email ?? 'Cloud sync on'}</Text>
              </View>
            </View>
            <Pressable style={styles.signOutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.coral} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </Card>
        ) : (
          <Pressable style={styles.signInButton} onPress={() => router.push('/sign-in')}>
            <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.signInText}>{isConfigured ? 'Sign in to sync & share' : 'Set up an account'}</Text>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Current trip</Text></View>
        <Card padded style={styles.infoCard}>
          <Row icon="airplane-outline" label="Active trip" value={activeTrip?.name ?? 'None yet'} />
          <Row icon="briefcase-outline" label="Saved trips" value={`${trips.length}`} divider />
        </Card>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>About</Text></View>
        <Card padded style={styles.infoCard}>
          <Row icon="information-circle-outline" label="App" value="RoamRoom" />
          <Row icon="pricetag-outline" label="Version" value={Constants.expoConfig?.version ?? '0.1.0'} divider />
          <Row icon="phone-portrait-outline" label="Mode" value={user ? 'Cloud sync' : 'On-device'} divider />
        </Card>
        <Pressable style={styles.linkRow} onPress={() => router.push('/onboarding')}>
          <View style={styles.rowIcon}>
            <Ionicons name="sparkles-outline" size={18} color={colors.blue} />
          </View>
          <Text style={styles.linkRowLabel}>Replay intro</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.ink2} />
        </Pressable>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Data</Text></View>
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Ionicons name="trash-outline" size={18} color={colors.coral} />
          <Text style={styles.resetText}>Reset app data</Text>
        </Pressable>
        <Text style={styles.resetHint}>
          {user
            ? 'Your trips sync to the cloud and are cached on this device. Reset clears the local copy on this device only.'
            : 'Everything in RoamRoom is stored on this device.'}
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value, divider }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.ink2} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  h1: { fontSize: 28, fontWeight: '800', color: colors.ink },
  sectionHeader: { marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  accountCard: { gap: 14 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountAvatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  accountEmail: { marginTop: 2, fontSize: 13, fontWeight: '600', color: colors.ink2 },
  signOutButton: { height: 46, borderRadius: radii.sm, backgroundColor: '#331C19', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { fontSize: 14, fontWeight: '800', color: colors.coral },
  signInButton: { height: 58, borderRadius: radii.md, backgroundColor: colors.btn, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, ...shadows.card },
  signInText: { flex: 1, fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  infoCard: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#232B36', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  rowValue: { fontSize: 14, fontWeight: '700', color: colors.ink2 },
  linkRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  linkRowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  resetButton: { height: 52, borderRadius: radii.md, backgroundColor: '#331C19', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.card },
  resetText: { fontSize: 15, fontWeight: '800', color: colors.coral },
  resetHint: { marginTop: 10, fontSize: 13, color: colors.ink2, textAlign: 'center' },
});
