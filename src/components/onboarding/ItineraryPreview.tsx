import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { panel, pop, rise, useStagger } from './shared';

const STOPS: { title: string; meta: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }[] = [
  { title: 'Flight UA 234', meta: 'Boarding 9:40 · Gate B12', icon: 'airplane', bg: colors.softBlue, fg: colors.blue },
  { title: 'Check in · Hotel Aoyama', meta: 'Afternoon · 15:00', icon: 'bed', bg: colors.softMint, fg: '#0FA47F' },
  { title: 'Ichiran Ramen', meta: 'Evening · 19:00', icon: 'restaurant', bg: colors.softCoral, fg: '#E5533C' },
];

const MEMORY_TILES = [colors.softCoral, colors.softBlue, colors.softYellow];

/**
 * Slide 4 hero: the trip fully assembled — Day 1 pill pulsing, weather chip,
 * a boarding-pass-style first stop, hotel + dinner rows, docs chip, and
 * memory tiles filling in at the bottom under a "Ready to go" badge.
 */
export function ItineraryPreview({ play, active }: { play: number; active: boolean }) {
  const headIn = useStagger(1, play, 80)[0];
  const rows = useStagger(STOPS.length, play, 300, 140);
  const docs = useStagger(1, play, 850)[0];
  const memories = useStagger(MEMORY_TILES.length, play, 1050, 120);
  const ready = useStagger(1, play, 1450)[0];
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
        <View style={styles.spacer} />
        <View style={styles.weatherPill}>
          <Ionicons name="sunny" size={13} color="#B7791F" />
          <Text style={styles.weatherText}>75° Sunny</Text>
        </View>
      </Animated.View>

      {STOPS.map((stop, index) => (
        <Animated.View key={stop.title} style={[styles.stopRow, index === 0 && styles.ticketRow, rise(rows[index], 18)]}>
          <View style={[styles.stopIcon, { backgroundColor: index === 0 ? colors.blue : stop.bg }]}>
            <Ionicons name={stop.icon} size={15} color={index === 0 ? '#FFFFFF' : stop.fg} />
          </View>
          <View style={styles.stopBody}>
            <Text style={styles.stopTitle}>{stop.title}</Text>
            <Text style={styles.stopMeta}>{stop.meta}</Text>
          </View>
          {index === 0 ? (
            <View style={styles.barcode}>
              {[3, 5, 2, 6, 3, 5].map((height, barIndex) => (
                <View key={barIndex} style={[styles.bar, { height: height * 3 }]} />
              ))}
            </View>
          ) : null}
        </Animated.View>
      ))}

      <Animated.View style={[styles.docsRow, rise(docs, 12)]}>
        <View style={styles.docChip}>
          <Ionicons name="document-text" size={13} color={colors.blue} />
          <Text style={styles.docChipText}>Tickets.pdf</Text>
        </View>
        <View style={styles.docChip}>
          <Ionicons name="key" size={13} color="#0FA47F" />
          <Text style={styles.docChipText}>Hotel booking</Text>
        </View>
      </Animated.View>

      <View style={styles.footerRow}>
        <View style={styles.memories}>
          {MEMORY_TILES.map((tile, index) => (
            <Animated.View key={index} style={[styles.memoryTile, { backgroundColor: tile }, pop(memories[index])]}>
              <Ionicons name="image" size={13} color="rgba(16,24,40,0.35)" />
            </Animated.View>
          ))}
        </View>
        <Animated.View style={[styles.readyBadge, pop(ready)]}>
          <Ionicons name="checkmark-circle" size={14} color="#0FA47F" />
          <Text style={styles.readyText}>Ready to go</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 314, borderRadius: 24, padding: 15, ...panel, ...shadows.float },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  spacer: { flex: 1 },
  dayPill: { height: 30, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  dayPillOn: { backgroundColor: colors.btn },
  dayPillText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  dayPillOnText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
  weatherPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: colors.softYellow },
  weatherText: { fontSize: 12, fontWeight: '800', color: '#B7791F' },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  ticketRow: { backgroundColor: colors.softBlue, borderRadius: 15, paddingHorizontal: 10, marginBottom: 3 },
  stopIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stopBody: { flex: 1 },
  stopTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  stopMeta: { marginTop: 1, fontSize: 11.5, fontWeight: '600', color: colors.ink2 },
  barcode: { flexDirection: 'row', alignItems: 'center', gap: 2.5, marginRight: 4 },
  bar: { width: 2.5, borderRadius: 1, backgroundColor: 'rgba(16,24,40,0.45)' },
  docsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#F2F4F7' },
  docChipText: { fontSize: 11.5, fontWeight: '800', color: colors.ink },
  footerRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memories: { flexDirection: 'row', gap: 6 },
  memoryTile: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.softMint, borderRadius: radii.pill, paddingHorizontal: 11, height: 30 },
  readyText: { fontSize: 12.5, fontWeight: '800', color: '#0FA47F' },
});
