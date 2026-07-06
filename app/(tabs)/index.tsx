import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, PillButton, PrimaryButton } from '@/components';
import { EditTripModal, type TripEditFields } from '@/components/EditTripModal';
import { InviteCard } from '@/components/InviteCard';
import { JoinTripModal } from '@/components/JoinTripModal';
import { TripCard } from '@/components/TripCard';
import type { Trip, TripStatus } from '@/data/types';
import { useToast } from '@/state/ToastContext';
import { useTrips } from '@/state/useTrips';
import { colors, type } from '@/theme';
import { formatTodayEyebrow } from '@/utils/date';

type Filter = 'Upcoming' | 'Traveling' | 'Past' | 'Invites';

const filterToStatus: Record<Exclude<Filter, 'Invites'>, TripStatus> = {
  Upcoming: 'Planning',
  Traveling: 'Live',
  Past: 'Done',
};

export default function TripsHomeScreen() {
  const { trips, invites, updateTrip, removeTrip, joinInvite, joinByCode } = useTrips();
  const toast = useToast();

  const [filter, setFilter] = useState<Filter>('Upcoming');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const visibleTrips = useMemo(() => {
    if (filter === 'Invites') return [];
    return trips.filter((trip) => trip.status === filterToStatus[filter]);
  }, [trips, filter]);

  function handleDelete(trip: Trip) {
    Alert.alert('Delete trip?', `This removes ${trip.name} from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTrip(trip.id) },
    ]);
  }

  async function handleSaveEdit(fields: TripEditFields) {
    if (editingTrip) await updateTrip(editingTrip.id, fields);
    setEditingTrip(null);
  }

  async function handleJoinInvite(inviteId: string, tripName: string) {
    await joinInvite(inviteId);
    toast.show(`Joined ${tripName}`);
  }

  async function handleJoinByCode(code: string) {
    const invite = await joinByCode(code);
    setIsJoinOpen(false);
    toast.show(invite ? `Joined ${invite.tripName}` : 'No trip found with that code');
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={type.eyebrow}>{formatTodayEyebrow()}</Text>
            <Text style={styles.h1}>Your trips</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => toast.show('Search coming soon')} accessibilityLabel="Search">
              <Ionicons name="search-outline" size={19} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => toast.show('Notifications coming soon')} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={19} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => toast.show('Settings coming soon')} accessibilityLabel="Settings">
              <Avatar initial="R" avatarKey="you" size="lg" />
            </Pressable>
          </View>
        </View>

        <View style={styles.pillRow}>
          <PillButton label="Upcoming" selected={filter === 'Upcoming'} onPress={() => setFilter('Upcoming')} />
          <PillButton label="Traveling" selected={filter === 'Traveling'} onPress={() => setFilter('Traveling')} />
          <PillButton label="Past" selected={filter === 'Past'} onPress={() => setFilter('Past')} />
          <PillButton label="Invites" selected={filter === 'Invites'} badgeCount={invites.length} onPress={() => setFilter('Invites')} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active trips</Text>
          <Text style={styles.sectionLink}>{visibleTrips.length} saved</Text>
        </View>

        {filter === 'Invites' ? (
          <Text style={type.sub}>Switch to Upcoming, Traveling, or Past to see your trips.</Text>
        ) : visibleTrips.length === 0 ? (
          <Card padded style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="airplane-outline" size={28} color={colors.blue} />
            </View>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={type.body}>Start with the dates and destination. We will add people, voting, and itinerary details next.</Text>
            <PrimaryButton label="Create first trip" variant="primary" size="small" onPress={() => router.push('/create/step-1')} />
          </Card>
        ) : (
          visibleTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onEdit={() => setEditingTrip(trip)} onDelete={() => handleDelete(trip)} />
          ))
        )}

        <View style={styles.quickGrid}>
          <QuickAction icon="add" label="Add trip" onPress={() => router.push('/create/step-1')} />
          <QuickAction icon="key-outline" label="Join trip" onPress={() => setIsJoinOpen(true)} />
          <QuickAction icon="download-outline" label="Import booking" onPress={() => toast.show('Import booking coming soon')} />
          <QuickAction icon="albums-outline" label="Templates" onPress={() => router.push('/create/step-5')} />
        </View>

        {invites.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Invites</Text>
            </View>
            {invites.map((invite) => (
              <View key={invite.id} style={styles.inviteWrap}>
                <InviteCard invite={invite} onJoin={() => handleJoinInvite(invite.id, invite.tripName)} />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <EditTripModal trip={editingTrip} visible={!!editingTrip} onClose={() => setEditingTrip(null)} onSave={handleSaveEdit} />
      <JoinTripModal visible={isJoinOpen} onClose={() => setIsJoinOpen(false)} onSubmit={handleJoinByCode} />
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 112,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  h1: {
    marginTop: 4,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.blue,
  },
  emptyCard: {
    alignItems: 'flex-start',
    gap: 12,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink,
  },
  quickGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    width: '47%',
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  inviteWrap: {
    marginBottom: 12,
  },
});
