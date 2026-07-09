import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, radii, shadows } from '@/theme';

import { glass, rise, useFloat, useStagger } from './shared';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 286;
const H = 164;
// Route through the three pins (quadratic segments, smooth S-curve).
const ROUTE = 'M30,128 Q95,30 150,84 Q205,138 258,44';
const DASH = 400; // > path length, so offset DASH -> 0 fully draws it
const PINS: { x: number; y: number; icon: keyof typeof Ionicons.glyphMap; label: string; labelLeft?: boolean }[] = [
  { x: 30, y: 128, icon: 'bed', label: 'Hotel' },
  { x: 150, y: 84, icon: 'restaurant', label: 'Dinner' },
  { x: 258, y: 44, icon: 'camera', label: 'Viewpoint', labelLeft: true },
];

/**
 * Mini live-map preview: a glowing route draws itself across a dark map grid,
 * dotted "traffic" particles flow along it, labeled pins drop in one-by-one,
 * and a Day 1 itinerary row slides up underneath.
 */
export function AnimatedRouteMap({ play, active }: { play: number; active: boolean }) {
  // SVG stroke props can't use the native driver — these two run on the JS
  // driver; all view transforms below stay native.
  const draw = useRef(new Animated.Value(0)).current;
  const flow = useRef(new Animated.Value(0)).current;
  const pins = useStagger(PINS.length, play, 520, 240);
  const dayIn = useStagger(1, play, 1150)[0];
  const float = useFloat(active);

  useEffect(() => {
    if (!play) return;
    draw.setValue(0);
    Animated.timing(draw, { toValue: 1, duration: 1300, useNativeDriver: false }).start();
  }, [play, draw]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 1400, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [active, flow]);

  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [DASH, 0] });
  const dotsOffset = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const dotsOpacity = draw.interpolate({ inputRange: [0.75, 1], outputRange: [0, 0.9], extrapolate: 'clamp' });

  return (
    <View style={styles.card}>
      <LinearGradient colors={['#1C2739', '#131A26']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.mapArea}>
        <Svg width={W} height={H}>
          {/* Map grid */}
          {Array.from({ length: 10 }, (_, i) => (i + 1) * 28).map((x) => (
            <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (i + 1) * 28).map((y) => (
            <Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
          ))}
          {/* Glow underlay + route, drawing in together */}
          <AnimatedPath d={ROUTE} fill="none" stroke="rgba(91,140,255,0.32)" strokeWidth={9} strokeLinecap="round" strokeDasharray={[DASH, DASH]} strokeDashoffset={dashOffset} />
          <AnimatedPath d={ROUTE} fill="none" stroke={colors.blue} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={[DASH, DASH]} strokeDashoffset={dashOffset} />
          {/* Flowing dot particles along the route */}
          <AnimatedPath d={ROUTE} fill="none" stroke="#E7EEFF" strokeWidth={2} strokeLinecap="round" strokeDasharray={[2, 13.4]} strokeDashoffset={dotsOffset} strokeOpacity={dotsOpacity} />
        </Svg>

        {PINS.map((pin, index) => {
          const drift = float.interpolate({ inputRange: [0, 1], outputRange: index === 1 ? [2.5, -2.5] : [-2.5, 2.5] });
          return (
            <Animated.View
              key={pin.label}
              style={[styles.pinWrap, { left: pin.x - 14, top: pin.y - 14 }, rise(pins[index], 12), { transform: [...rise(pins[index], 12).transform, { translateY: drift }] }]}
            >
              <View style={styles.pin}>
                <Ionicons name={pin.icon} size={13} color="#FFFFFF" />
              </View>
              <View style={[styles.pinLabel, pin.labelLeft ? styles.pinLabelLeft : styles.pinLabelRight]}>
                <Text style={styles.pinLabelText}>{pin.label}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View style={[styles.dayRow, rise(dayIn, 26)]}>
        <View style={styles.dayIcon}>
          <Ionicons name="calendar" size={14} color={colors.blue} />
        </View>
        <View style={styles.dayText}>
          <Text style={styles.dayTitle}>Day 1 · Shibuya loop</Text>
          <Text style={styles.dayMeta}>Hotel → Dinner → Viewpoint</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.ink2} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 314, borderRadius: 24, overflow: 'hidden', padding: 14, ...glass, ...shadows.float },
  mapArea: { width: W, height: H },
  pinWrap: { position: 'absolute', width: 28, height: 28 },
  pin: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.btn, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...shadows.card },
  pinLabel: { position: 'absolute', top: 2, height: 24, paddingHorizontal: 9, borderRadius: radii.pill, backgroundColor: 'rgba(13,18,26,0.88)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' },
  pinLabelRight: { left: 33 },
  pinLabelLeft: { right: 33 },
  pinLabelText: { fontSize: 11.5, fontWeight: '800', color: colors.ink },
  dayRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 15, paddingHorizontal: 12, height: 52 },
  dayIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#182B45', alignItems: 'center', justifyContent: 'center' },
  dayText: { flex: 1 },
  dayTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink },
  dayMeta: { marginTop: 1, fontSize: 11.5, fontWeight: '600', color: colors.ink2 },
});
