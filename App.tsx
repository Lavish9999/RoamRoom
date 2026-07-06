import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

const demoTrips: Trip[] = [
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
  const activeTrip = demoTrips[0];

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

        {activeTab === 'trips' ? <TripsScreen trips={demoTrips} /> : <PlaceholderScreen tab={activeTab} trip={activeTrip} />}

        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={22} color={isActive ? colors.ink : '#A6A296'} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TripsScreen({ trips }: { trips: Trip[] }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Plan the trip together.</Text>
          <Text style={styles.bodyText}>Create a room, invite the crew, vote on ideas, and turn the messy group chat into a real itinerary.</Text>
        </View>
        <Pressable style={styles.primaryButton}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>New trip</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active trips</Text>
        <Text style={styles.sectionLink}>View all</Text>
      </View>

      {trips.map((trip) => (
        <View key={trip.id} style={styles.tripCard}>
          <View style={styles.tripTopRow}>
            <View style={styles.tripIcon}>
              <Ionicons name="airplane-outline" size={22} color={colors.blue} />
            </View>
            <View style={styles.tripMain}>
              <Text style={styles.tripName}>{trip.name}</Text>
              <Text style={styles.tripMeta}>{trip.location} · {trip.dates}</Text>
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
        </View>
      ))}
    </ScrollView>
  );
}

function PlaceholderScreen({ tab, trip }: { tab: TabKey; trip: Trip }) {
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
        <Text style={styles.placeholderTitle}>{trip.name}</Text>
        <Text style={styles.bodyText}>{copy[tab]}</Text>
        <Pressable style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Build this next</Text>
        </Pressable>
      </View>
    </View>
  );
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
    height: 50,
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
});
