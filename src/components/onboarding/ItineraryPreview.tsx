import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { glass, rise, useStagger } from './shared';

const STOPS: { part: string; time: string; title: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }[] = [
  { part: 'Morning', time: '9:00', title: 'Shibuya breakfast', icon: 'cafe', bg: '#301F19', fg: '#F08A6A' },
  { part: 'Afternoon', time: '13:30', title: 'teamLab Planets', icon: 'color-palette', bg: '#241E33', fg: '#B79BE6' },
  { part: 'Evening', time: '19:00', title: 'Ichiran Ramen', icon: 'restaurant', bg: '#182B45', fg: '#8FB4FF' },
];

/**
 * Itinerary preview: day pills with a softly pulsing active day, a weather
 * pill, a morning/afternoon/evening timeline that staggers in, and a
 * "Ready to go" badge to land the message.
 */
export function ItineraryPreview({ play, active }: { play: number; active: boolean }) {
  const rows = useStagger(STOPS.length, play, 260, 130);
  const headIn = useStagger(1, play, 80)[0];
  const readyIn = useStagger(1, play, 950)[0];
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const dayScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.head, rise(headIn, 12)]}>
        <Animated.View style={[styles.dayPill, styles.dayPillOn, { transform: [{ scale: dayScale }] }]}>
          <Text style={styles.dayPillOnText}>Day 1</Text>
        </Animated.View>
        <View style={styles.dayPill}>
          <Text style={styles.dayPillText}>Day 2</Text>
        </View>
        <View style={styles.dayPill}>
          <Text style={styles.dayPillText}>Day 3</Text>
        </View>
        <View style={styles.spacer} />
        <View style={styles.weatherPill}>
          <Ionicons name="sunny" size={13} color={colors.amber} />
          <Text style={styles.weatherText}>72°</Text>
        </View>
      </Animated.View>

      <View style={styles.timeline}>
        <View style={styles.rail} />
        {STOPS.map((stop, index) => (
          <Animated.View key={stop.part} style={[styles.stopRow, rise(rows[index], 18)]}>
            <View style={styles.railDot} />
            <View style={[styles.stopIcon, { backgroundColor: stop.bg }]}>
              <Ionicons name={stop.icon} size={15} color={stop.fg} />
            </View>
            <View style={styles.stopBody}>
              <Text style={styles.stopTitle}>{stop.title}</Text>
              <Text style={styles.stopMeta}>{stop.part} · {stop.time}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.readyRow, rise(readyIn, 14)]}>
        <View style={styles.readyBadge}>
          <Ionicons name="checkmark-circle" size={15} color={colors.green} />
          <Text style={styles.readyText}>Ready to go</Text>
        </View>
        <Text style={styles.readyMeta}>3 stops · all booked</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 314, borderRadius: 22, padding: 16, ...glass, ...shadows.float },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  spacer: { flex: 1 },
  dayPill: { height: 30, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  dayPillOn: { backgroundColor: colors.btn },
  dayPillText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  dayPillOnText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
  weatherPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#2E2413' },
  weatherText: { fontSize: 12.5, fontWeight: '800', color: '#E9B25C' },
  timeline: { position: 'relative' },
  rail: { position: 'absolute', left: 5, top: 10, bottom: 14, width: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 7 },
  railDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue, borderWidth: 2.5, borderColor: '#1A2231' },
  stopIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stopBody: { flex: 1 },
  stopTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  stopMeta: { marginTop: 1, fontSize: 11.5, fontWeight: '600', color: colors.ink2 },
  readyRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#123024', borderRadius: radii.pill, paddingHorizontal: 11, height: 30 },
  readyText: { fontSize: 12.5, fontWeight: '800', color: '#4FD39E' },
  readyMeta: { fontSize: 12, fontWeight: '700', color: colors.ink2 },
});
