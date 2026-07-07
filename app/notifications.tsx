import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';
import { countdownLabel } from '@/utils/date';

type Notice = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  bg: string;
  title: string;
  body: string;
  onPress?: () => void;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { trips, invites } = useTrips();

  const notices = useMemo<Notice[]>(() => {
    const items: Notice[] = [];

    invites.forEach((invite) => {
      items.push({
        id: `invite-${invite.id}`,
        icon: 'mail-outline',
        tint: colors.blue,
        bg: '#182B45',
        title: `${invite.invitedBy} invited you to ${invite.tripName}`,
        body: `${invite.dates} · tap to review in Trips`,
        onPress: () => router.replace('/'),
      });
    });

    trips.forEach((trip) => {
      if (trip.status === 'Live') {
        items.push({ id: `live-${trip.id}`, icon: 'flash-outline', tint: colors.green, bg: '#123024', title: `${trip.name} is live now`, body: 'Your trip is underway - open the plan for today.', onPress: () => router.push(`/trip/${trip.id}`) });
      } else if (trip.status === 'Planning') {
        items.push({ id: `count-${trip.id}`, icon: 'time-outline', tint: colors.blue, bg: '#182B45', title: `${trip.name} · ${countdownLabel(trip.startDate, trip.status)}`, body: `${trip.destination} · tap to open the trip.`, onPress: () => router.push(`/trip/${trip.id}`) });
      }

      if (trip.readinessDone < trip.readinessTotal) {
        items.push({ id: `ready-${trip.id}`, icon: 'checkmark-circle-outline', tint: '#E3A94E', bg: '#2E2413', title: `Finish setting up ${trip.name}`, body: `${trip.readinessDone} of ${trip.readinessTotal} setup tasks done.`, onPress: () => router.push(`/trip/${trip.id}`) });
      }
    });

    return items;
  }, [trips, invites]);

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={type.eyebrow}>Notifications</Text>
          <View style={styles.iconButton} />
        </View>

        <Text style={styles.h1}>Notifications</Text>

        {notices.length === 0 ? (
          <Card padded style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={26} color={colors.ink2} />
            </View>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={type.body}>Invites and trip reminders will show up here.</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {notices.map((notice) => (
              <Pressable key={notice.id} onPress={notice.onPress}>
                <Card padded style={styles.noticeCard}>
                  <View style={[styles.noticeIcon, { backgroundColor: notice.bg }]}>
                    <Ionicons name={notice.icon} size={19} color={notice.tint} />
                  </View>
                  <View style={styles.noticeText}>
                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                    <Text style={styles.noticeBody}>{notice.body}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  h1: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 18 },
  list: { gap: 12 },
  noticeCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noticeText: { flex: 1 },
  noticeTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  noticeBody: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  emptyCard: { alignItems: 'flex-start', gap: 12 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#232B36', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
});
