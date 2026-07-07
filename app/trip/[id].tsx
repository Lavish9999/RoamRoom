import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Chip, CoverImage, PrimaryButton, ProgressRing } from '@/components';
import { EditTripModal, type TripEditFields } from '@/components/EditTripModal';
import type { ChipVariant } from '@/theme';
import type { TripStatus } from '@/data/types';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';
import { countdownLabel, formatDateRange } from '@/utils/date';

const statusToChipVariant: Record<TripStatus, ChipVariant> = {
  Planning: 'planning',
  Live: 'live',
  Done: 'done',
};

const roleColor: Record<string, string> = { Owner: colors.blue, Planner: colors.green, Traveler: colors.ink2 };

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { trips, activeTripId, setActiveTrip, updateTrip, removeTrip, isReady } = useTrips();
  const [isEditing, setIsEditing] = useState(false);

  const trip = trips.find((item) => item.id === id);

  // Opening a trip makes it the active one that the other tabs follow.
  useEffect(() => {
    if (trip && activeTripId !== trip.id) void setActiveTrip(trip.id);
  }, [trip, activeTripId, setActiveTrip]);

  if (!trip) {
    return (
      <View style={[styles.wrap, styles.centered, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.h1}>{isReady ? 'Trip not found' : 'Loading...'}</Text>
        {isReady ? <PrimaryButton label="Back to trips" onPress={() => router.replace('/')} /> : null}
      </View>
    );
  }

  const readinessPct = trip.readinessTotal > 0 ? (trip.readinessDone / trip.readinessTotal) * 100 : 0;

  function handleDelete() {
    Alert.alert('Delete trip?', `This removes ${trip!.name} from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTrip(trip!.id);
          router.replace('/');
        },
      },
    ]);
  }

  async function handleSaveEdit(fields: TripEditFields) {
    await updateTrip(trip!.id, fields);
    setIsEditing(false);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={type.eyebrow}>Trip overview</Text>
          <Pressable style={styles.iconButton} onPress={() => setIsEditing(true)} accessibilityLabel="Edit trip">
            <Ionicons name="create-outline" size={19} color={colors.ink} />
          </Pressable>
        </View>

        <Card style={styles.coverCard}>
          <CoverImage coverKey={trip.coverKey} destination={trip.destination} style={styles.cover} radius={0}>
            <View style={styles.coverOverlay} />
            <View style={styles.coverTop}>
              <View style={styles.chipWrap}>
                <Chip variant={statusToChipVariant[trip.status]} label={trip.status} />
              </View>
              <View style={styles.countdown}>
                <Text style={styles.countdownText}>{countdownLabel(trip.startDate, trip.status)}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.tripName}>{trip.name}</Text>
              <Text style={styles.tripMeta}>{trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}</Text>
            </View>
          </CoverImage>

          <View style={styles.readinessRow}>
            <View>
              <Text style={styles.caption}>Trip setup</Text>
              <Text style={styles.readinessValue}>{trip.readinessDone} of {trip.readinessTotal} done</Text>
            </View>
            <ProgressRing progress={readinessPct} />
          </View>
        </Card>

        <View style={styles.quickRow}>
          <QuickLink icon="map-outline" label="Map" onPress={() => router.push('/map')} />
          <QuickLink icon="calendar-outline" label="Plan" onPress={() => router.push('/plan')} />
          <QuickLink icon="wallet-outline" label="Expenses" onPress={() => router.push('/expenses')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Travelers</Text>
          <Text style={type.cap}>{trip.members.length} people</Text>
        </View>
        <Card padded style={styles.membersCard}>
          {trip.members.map((member, index) => (
            <View key={member.id} style={[styles.memberRow, index > 0 && styles.memberDivider]}>
              <Avatar initial={member.initial} avatarKey={member.avatarKey} size="md" />
              <View style={styles.memberText}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={[styles.memberRole, { color: roleColor[member.role] ?? colors.ink2 }]}>{member.role}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Invite code</Text>
        </View>
        <Card padded style={styles.codeCard}>
          <Text style={styles.codeText}>{trip.inviteCode}</Text>
          <Text style={type.sub}>Share this code so friends can join from the Trips tab.</Text>
        </Card>

        <View style={styles.dangerRow}>
          <PrimaryButton label="Edit trip" variant="secondary" onPress={() => setIsEditing(true)} />
          <Pressable style={styles.deleteButton} onPress={handleDelete} accessibilityLabel="Delete trip">
            <Ionicons name="trash-outline" size={18} color={colors.coral} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>

      <EditTripModal trip={isEditing ? trip : null} visible={isEditing} onClose={() => setIsEditing(false)} onSave={handleSaveEdit} />
    </View>
  );
}

function QuickLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickLink} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={colors.blue} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  h1: { fontSize: 24, fontWeight: '800', color: colors.ink },
  coverCard: { overflow: 'hidden', marginBottom: 14 },
  cover: { height: 190, padding: 14, justifyContent: 'space-between' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,21,28,0.2)' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chipWrap: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radii.pill },
  countdown: { backgroundColor: 'rgba(16,21,28,0.55)', borderRadius: radii.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  countdownText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  tripName: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  tripMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, fontWeight: '600', marginTop: 2 },
  readinessRow: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caption: { fontSize: 12, fontWeight: '700', color: colors.ink2 },
  readinessValue: { marginTop: 2, fontSize: 15, fontWeight: '800', color: colors.ink },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  quickLink: { flex: 1, height: 84, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.card },
  quickIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '800', color: colors.ink },
  sectionHeader: { marginTop: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  membersCard: { gap: 0 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  memberDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  memberText: { flex: 1 },
  memberName: { fontSize: 15.5, fontWeight: '800', color: colors.ink },
  memberRole: { marginTop: 1, fontSize: 12.5, fontWeight: '700' },
  codeCard: { gap: 6 },
  codeText: { fontSize: 22, fontWeight: '800', letterSpacing: 2, color: colors.ink },
  dangerRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteButton: { height: 48, paddingHorizontal: 18, borderRadius: radii.pill, backgroundColor: '#FCECEA', flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteText: { fontSize: 14, fontWeight: '800', color: colors.coral },
});
