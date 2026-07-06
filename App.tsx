import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const TRIPS_STORAGE_KEY = 'roamroom.trips.v1';

const colors = {
  bg: '#F7F5F0',
  card: '#FFFFFF',
  ink: '#10151C',
  muted: '#7A808A',
  border: '#E8E4DC',
  blue: '#4A7DFF',
  coral: '#FF6B5A',
  green: '#2ED18C',
  amber: '#F0A93B',
};

type TabKey = 'trips' | 'map' | 'plan' | 'expenses' | 'memories';

type Trip = {
  id: string;
  name: string;
  dates: string;
  location: string;
  status: 'Planning' | 'Live' | 'Done';
  progress: number;
  inviteCode: string;
  members: string[];
  nextItem: string;
};

type TripForm = {
  name: string;
  location: string;
  dates: string;
  nextItem: string;
};

const emptyTripForm: TripForm = {
  name: '',
  location: '',
  dates: '',
  nextItem: '',
};

const starterTrips: Trip[] = [
  {
    id: 'tokyo',
    name: 'Tokyo with the crew',
    dates: 'May 12-19, 2026',
    location: 'Tokyo, Japan',
    status: 'Planning',
    progress: 68,
    inviteCode: 'TOKYO-4XR2',
    members: ['R', 'M', 'C', 'L'],
    nextItem: 'Vote on Golden Gai for Day 4',
  },
  {
    id: 'nyc',
    name: 'JFK weekend reset',
    dates: 'Fri-Sun',
    location: 'Queens, New York',
    status: 'Planning',
    progress: 31,
    inviteCode: 'NYC-2DAY',
    members: ['R', 'M'],
    nextItem: 'Pick hotel and Friday dinner',
  },
];

const tabs: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'trips', label: 'Trips', icon: 'home-outline' },
  { key: 'map', label: 'Map', icon: 'map-outline' },
  { key: 'plan', label: 'Plan', icon: 'calendar-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'card-outline' },
  { key: 'memories', label: 'Memories', icon: 'images-outline' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<TripForm>(emptyTripForm);

  useEffect(() => {
    let isMounted = true;

    async function loadTrips() {
      try {
        const savedTrips = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
        if (!isMounted) return;
        setTrips(savedTrips ? JSON.parse(savedTrips) : starterTrips);
      } catch {
        if (isMounted) setTrips(starterTrips);
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    loadTrips();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips)).catch(() => {
      Alert.alert('Could not save trips', 'Your latest trip changes may not be stored on this device yet.');
    });
  }, [isReady, trips]);

  const activeTrip = trips[0];

  const title = useMemo(() => {
    switch (activeTab) {
      case 'trips':
        return 'Your trips';
      case 'map':
        return 'Trip map';
      case 'plan':
        return 'Itinerary';
      case 'expenses':
        return 'Expenses';
      case 'memories':
        return 'Memories';
    }
  }, [activeTab]);

  function openCreateTrip() {
    setEditingTrip(null);
    setTripForm(emptyTripForm);
    setIsEditorOpen(true);
  }

  function openEditTrip(trip: Trip) {
    setEditingTrip(trip);
    setTripForm({
      name: trip.name,
      location: trip.location,
      dates: trip.dates,
      nextItem: trip.nextItem,
    });
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingTrip(null);
    setTripForm(emptyTripForm);
  }

  function saveTrip() {
    const normalizedForm = normalizeTripForm(tripForm);
    if (!normalizedForm.name || !normalizedForm.location || !normalizedForm.dates) {
      Alert.alert('Missing trip details', 'Add a trip name, location, and dates before saving.');
      return;
    }

    if (editingTrip) {
      setTrips((currentTrips) =>
        currentTrips.map((trip) =>
          trip.id === editingTrip.id
            ? {
                ...trip,
                ...normalizedForm,
                nextItem: normalizedForm.nextItem || 'Add the first plan item',
              }
            : trip,
        ),
      );
    } else {
      const newTrip: Trip = {
        id: `${Date.now()}`,
        name: normalizedForm.name,
        location: normalizedForm.location,
        dates: normalizedForm.dates,
        status: 'Planning',
        progress: 8,
        inviteCode: createInviteCode(normalizedForm.name),
        members: ['R'],
        nextItem: normalizedForm.nextItem || 'Invite your first traveler',
      };
      setTrips((currentTrips) => [newTrip, ...currentTrips]);
      setActiveTab('trips');
    }

    closeEditor();
  }

  function confirmDeleteTrip(trip: Trip) {
    Alert.alert('Delete trip?', `This removes ${trip.name} from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setTrips((currentTrips) => currentTrips.filter((item) => item.id !== trip.id)),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>RoamRoom</Text>
            <Text style={styles.h1}>{title}</Text>
          </View>
          <Pressable style={styles.iconButton} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={21} color={colors.ink} />
          </Pressable>
        </View>

        {!isReady ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        ) : activeTab === 'trips' ? (
          <TripsScreen trips={trips} onCreateTrip={openCreateTrip} onEditTrip={openEditTrip} onDeleteTrip={confirmDeleteTrip} />
        ) : (
          <PlaceholderScreen tab={activeTab} trip={activeTrip} onCreateTrip={openCreateTrip} />
        )}

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable key={tab.key} style={[styles.tabItem, isActive && styles.tabItemActive]} onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon} size={22} color={isActive ? colors.ink : '#A6A296'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TripEditorModal
        visible={isEditorOpen}
        editingTrip={editingTrip}
        form={tripForm}
        onChangeForm={setTripForm}
        onClose={closeEditor}
        onSave={saveTrip}
      />
    </SafeAreaView>
  );
}

function TripsScreen({
  trips,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
}: {
  trips: Trip[];
  onCreateTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Plan the trip together.</Text>
          <Text style={styles.bodyText}>Create a room, invite the crew, vote on ideas, and turn the messy group chat into a real itinerary.</Text>
        </View>
        <Pressable style={styles.primaryButton} onPress={onCreateTrip}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>New trip</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active trips</Text>
        <Text style={styles.sectionLink}>{trips.length} saved</Text>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="airplane-outline" size={28} color={colors.blue} />
          </View>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.bodyText}>Start with the dates and destination. We will add people, voting, and itinerary details next.</Text>
          <Pressable style={styles.secondaryButton} onPress={onCreateTrip}>
            <Text style={styles.secondaryButtonText}>Create first trip</Text>
          </Pressable>
        </View>
      ) : (
        trips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripTopRow}>
              <View style={styles.tripIcon}>
                <Ionicons name="airplane-outline" size={22} color={colors.blue} />
              </View>
              <View style={styles.tripMain}>
                <Text style={styles.tripName}>{trip.name}</Text>
                <Text style={styles.tripMeta}>
                  {trip.location} · {trip.dates}
                </Text>
              </View>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{trip.status}</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${trip.progress}%` }]} />
            </View>

            <View style={styles.tripBottomRow}>
              <View>
                <Text style={styles.caption}>Next up</Text>
                <Text style={styles.nextItem}>{trip.nextItem}</Text>
              </View>
              <View style={styles.avatarStack}>
                {trip.members.map((member, index) => (
                  <View key={`${trip.id}-${member}-${index}`} style={[styles.avatar, { marginLeft: index === 0 ? 0 : -8 }]}>
                    <Text style={styles.avatarText}>{member}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.tripActions}>
              <Pressable style={styles.tripActionButton} onPress={() => onEditTrip(trip)}>
                <Ionicons name="create-outline" size={17} color={colors.ink} />
                <Text style={styles.tripActionText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.tripActionButton} onPress={() => onDeleteTrip(trip)}>
                <Ionicons name="trash-outline" size={17} color={colors.coral} />
                <Text style={[styles.tripActionText, { color: colors.coral }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function TripEditorModal({
  visible,
  editingTrip,
  form,
  onChangeForm,
  onClose,
  onSave,
}: {
  visible: boolean;
  editingTrip: Trip | null;
  form: TripForm;
  onChangeForm: (form: TripForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  function setField(field: keyof TripForm, value: string) {
    onChangeForm({ ...form, [field]: value });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboardWrap}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.eyebrow}>{editingTrip ? 'Edit trip' : 'New trip'}</Text>
              <Text style={styles.modalTitle}>{editingTrip ? 'Update the room' : 'Create a room'}</Text>
            </View>
            <Pressable style={styles.iconButton} onPress={onClose} accessibilityLabel="Close trip editor">
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <FormField label="Trip name" value={form.name} placeholder="e.g. Tokyo with the crew" onChangeText={(value) => setField('name', value)} />
            <FormField label="Destination" value={form.location} placeholder="e.g. Tokyo, Japan" onChangeText={(value) => setField('location', value)} />
            <FormField label="Dates" value={form.dates} placeholder="e.g. May 12-19, 2026" onChangeText={(value) => setField('dates', value)} />
            <FormField
              label="Next thing to plan"
              value={form.nextItem}
              placeholder="e.g. Vote on hotels"
              onChangeText={(value) => setField('nextItem', value)}
              multiline
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={styles.primaryButton} onPress={onSave}>
              <Text style={styles.primaryButtonText}>{editingTrip ? 'Save changes' : 'Create trip'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#A6A296"
        onChangeText={onChangeText}
        multiline={multiline}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
      />
    </View>
  );
}

function PlaceholderScreen({ tab, trip, onCreateTrip }: { tab: TabKey; trip?: Trip; onCreateTrip: () => void }) {
  const copy: Record<TabKey, string> = {
    trips: '',
    map: 'Next we will connect saved places, votes, and day plans to a real map view.',
    plan: 'This becomes the live itinerary: days, activities, drag reorder, notes, and reservations.',
    expenses: 'This becomes who paid, who owes, categories, and clean group balances.',
    memories: 'This becomes recap cards, shared photos, stats, and exportable trip stories.',
  };

  return (
    <View style={styles.placeholderWrap}>
      <View style={styles.placeholderCard}>
        <Text style={styles.eyebrow}>MVP module</Text>
        <Text style={styles.placeholderTitle}>{trip?.name ?? 'Create a trip first'}</Text>
        <Text style={styles.bodyText}>{trip ? copy[tab] : 'Trips are now stored locally. Create one first, then we can wire this module to real trip data.'}</Text>
        <Pressable style={styles.secondaryButton} onPress={onCreateTrip}>
          <Text style={styles.secondaryButtonText}>{trip ? 'Build this next' : 'Create trip'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function normalizeTripForm(form: TripForm): TripForm {
  return {
    name: form.name.trim(),
    location: form.location.trim(),
    dates: form.dates.trim(),
    nextItem: form.nextItem.trim(),
  };
}

function createInviteCode(name: string) {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'TRIP';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  h1: {
    marginTop: 3,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.ink,
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 112,
  },
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: 26,
    padding: 20,
    minHeight: 194,
    justifyContent: 'space-between',
  },
  heroTextWrap: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  primaryButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 26,
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
  tripCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripMain: {
    flex: 1,
  },
  tripName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  tripMeta: {
    marginTop: 3,
    fontSize: 13,
    color: colors.muted,
  },
  statusPill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF3FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.blue,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3563D9',
  },
  progressTrack: {
    marginTop: 16,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EDEAE2',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.green,
  },
  tripBottomRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  nextItem: {
    marginTop: 3,
    maxWidth: 220,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tripActions: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 10,
  },
  tripActionButton: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#F3F1EA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
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
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 76,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: '#F1EFE9',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A6A296',
  },
  tabLabelActive: {
    color: colors.ink,
  },
  placeholderWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 112,
    justifyContent: 'center',
  },
  placeholderCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  placeholderTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.ink,
  },
  secondaryButton: {
    marginTop: 8,
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalKeyboardWrap: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    marginTop: 3,
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  fieldWrap: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
  },
  fieldInput: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.ink,
  },
  fieldInputMultiline: {
    minHeight: 92,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
