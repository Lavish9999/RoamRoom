import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Card, Chip, CoverImage, PrimaryButton, ProgressRing } from '@/components';
import { EditTripModal, type TripEditFields } from '@/components/EditTripModal';
import type { ItineraryKind } from '@/data/itinerary';
import { getCityCenter, type LatLng } from '@/data/mapPlaces';
import type { TripStatus } from '@/data/types';
import { useToast } from '@/state/ToastContext';
import { useMapPlaces } from '@/state/useMapPlaces';
import { useTrips } from '@/state/useTrips';
import type { ChipVariant } from '@/theme';
import { colors, radii, shadows, type } from '@/theme';
import { dailyBudget } from '@/utils/budget';
import { countdownLabel, formatDateRange } from '@/utils/date';
import { geocodeQuery } from '@/utils/geocode';
import { fetchVibeIdeas, type VibeIdea } from '@/utils/vibeIdeas';

const statusToChipVariant: Record<TripStatus, ChipVariant> = {
  Planning: 'planning',
  Live: 'live',
  Done: 'done',
};

const kindMeta: Record<ItineraryKind, { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  activity: { icon: 'sparkles-outline', bg: '#EEF3FF', fg: '#3563D9' },
  food: { icon: 'restaurant-outline', bg: '#FFF0EA', fg: '#CE5A3C' },
  transport: { icon: 'train-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  flight: { icon: 'airplane-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  stay: { icon: 'bed-outline', bg: '#F0EBFA', fg: '#7455B0' },
  free: { icon: 'sunny-outline', bg: '#EDF7EE', fg: '#3C8A50' },
};

const roleColor: Record<string, string> = { Owner: colors.blue, Planner: colors.green, Traveler: colors.ink2 };

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { trips, activeTripId, setActiveTrip, updateTrip, removeTrip, isReady } = useTrips();
  const { addPlace } = useMapPlaces(id);
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [ideas, setIdeas] = useState<VibeIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [addedIdeas, setAddedIdeas] = useState<Set<string>>(new Set());

  const trip = trips.find((item) => item.id === id);
  const destination = trip?.destination;
  const vibesKey = (trip?.vibes ?? []).join('|');

  // Opening a trip makes it the active one that the other tabs follow.
  useEffect(() => {
    if (trip && activeTripId !== trip.id) void setActiveTrip(trip.id);
  }, [trip, activeTripId, setActiveTrip]);

  // Turn the trip's vibes into real, nearby suggested places.
  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    setLoadingIdeas(true);
    setIdeas([]);
    (async () => {
      const center: LatLng = (await geocodeQuery(destination)) ?? getCityCenter(destination);
      if (cancelled) return;
      const found = await fetchVibeIdeas(vibesKey ? vibesKey.split('|') as VibeIdea['vibe'][] : [], center);
      if (!cancelled) {
        setIdeas(found);
        setLoadingIdeas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destination, vibesKey]);

  async function handleAddIdea(idea: VibeIdea) {
    await addPlace({ title: idea.name, area: idea.label || destination || 'Saved place', kind: idea.kind, status: 'idea', lat: idea.lat, lng: idea.lng });
    setAddedIdeas((prev) => new Set(prev).add(idea.id));
    toast.show('Added to map');
  }

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

        <Card padded style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons name="sparkles-outline" size={16} color={colors.blue} />
            <Text style={styles.metaLabel}>Vibe</Text>
            <View style={styles.vibeWrap}>
              {trip.vibes.length ? (
                trip.vibes.map((vibe) => (
                  <View key={vibe} style={styles.vibePill}>
                    <Text style={styles.vibePillText}>{vibe}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.metaValue}>Not set</Text>
              )}
            </View>
          </View>
          <View style={[styles.metaRow, styles.metaDivider]}>
            <Ionicons name="wallet-outline" size={16} color={colors.blue} />
            <Text style={styles.metaLabel}>Budget</Text>
            <Text style={styles.metaValue}>{trip.budgetComfort} · ~${dailyBudget(trip.budgetComfort)}/day pp</Text>
          </View>
        </Card>

        <View style={styles.quickRow}>
          <QuickLink icon="map-outline" label="Map" onPress={() => router.push('/map')} />
          <QuickLink icon="calendar-outline" label="Plan" onPress={() => router.push('/plan')} />
          <QuickLink icon="wallet-outline" label="Expenses" onPress={() => router.push('/expenses')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ideas for your vibe</Text>
          {loadingIdeas ? <ActivityIndicator size="small" color={colors.blue} /> : <Text style={type.cap}>{trip.vibes.join(' · ') || 'Popular spots'}</Text>}
        </View>
        {ideas.length === 0 ? (
          <Card padded style={styles.ideasEmpty}>
            <Text style={type.sub}>{loadingIdeas ? 'Finding places that match your vibe...' : 'No suggestions right now - check your connection, or add places from the Map tab.'}</Text>
          </Card>
        ) : (
          <View style={styles.ideasList}>
            {ideas.map((idea) => {
              const meta = kindMeta[idea.kind];
              const added = addedIdeas.has(idea.id);
              return (
                <Card key={idea.id} padded style={styles.ideaCard}>
                  <View style={[styles.ideaIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.fg} />
                  </View>
                  <View style={styles.ideaText}>
                    <Text style={styles.ideaName} numberOfLines={1}>{idea.name}</Text>
                    <Text style={styles.ideaLabel} numberOfLines={1}>{idea.vibe}{idea.label ? ` · ${idea.label}` : ''}</Text>
                  </View>
                  <Pressable style={[styles.ideaAdd, added && styles.ideaAdded]} onPress={() => handleAddIdea(idea)} disabled={added} accessibilityLabel={`Add ${idea.name}`}>
                    <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={added ? '#178A5B' : '#FFFFFF'} />
                  </Pressable>
                </Card>
              );
            })}
          </View>
        )}

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
  metaCard: { gap: 0, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  metaDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  metaLabel: { fontSize: 13.5, fontWeight: '800', color: colors.ink2, width: 54 },
  metaValue: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.ink },
  vibeWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vibePill: { height: 26, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#EEF3FF', justifyContent: 'center' },
  vibePillText: { fontSize: 12, fontWeight: '800', color: colors.blue },
  ideasEmpty: { marginBottom: 6 },
  ideasList: { gap: 10, marginBottom: 6 },
  ideaCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ideaIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ideaText: { flex: 1 },
  ideaName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  ideaLabel: { marginTop: 2, fontSize: 12.5, color: colors.ink2 },
  ideaAdd: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  ideaAdded: { backgroundColor: '#E7F9F0' },
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
