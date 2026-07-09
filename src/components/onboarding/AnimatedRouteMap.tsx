import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { colors, radii, shadows } from '@/theme';

import { MiniAvatar, panel, pop, rise, useFloat, useStagger } from './shared';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const W = 276;
const H = 170;
const ROUTE = 'M30,134 Q92,34 148,88 Q200,138 250,46';
const DASH = 400;

const PINS: { x: number; y: number; icon: keyof typeof Ionicons.glyphMap; label: string; color: string; labelLeft?: boolean }[] = [
  { x: 30, y: 134, icon: 'bed', label: 'Hotel', color: colors.blue },
  { x: 148, y: 88, icon: 'restaurant', label: 'Dinner', color: colors.coral },
  { x: 250, y: 46, icon: 'camera', label: 'Viewpoint', color: '#0FA47F', labelLeft: true },
];

const JOINERS: { letter: string; color: string; style: object }[] = [
  { letter: 'M', color: '#FF8A65', style: { top: 26, right: -12 } },
  { letter: 'C', color: '#34B37E', style: { top: 96, left: -14 } },
  { letter: 'L', color: '#9B7EDE', style: { bottom: 58, right: -10 } },
];

const VIBES: { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; style: object }[] = [
  { label: 'Food', icon: 'restaurant', bg: colors.softCoral, fg: '#E5533C', style: { top: -14, left: 18 } },
  { label: 'Beach', icon: 'sunny', bg: colors.softYellow, fg: '#B7791F', style: { top: -20, right: 30 } },
  { label: 'Nightlife', icon: 'moon', bg: colors.softBlue, fg: colors.blue, style: { bottom: -14, right: -6 } },
];

/**
 * Slide 1 hero: a sunny city-map card where the route draws itself between
 * bouncing colored pins, friends' avatar bubbles join one by one around the
 * card, a "Tokyo Weekend" trip chip sits on the map, and vibe chips
 * (Food / Beach / Nightlife) float off the card edges.
 */
export function AnimatedRouteMap({ play, active }: { play: number; active: boolean }) {
  // SVG stroke props can't use the native driver; view transforms stay native.
  const draw = useRef(new Animated.Value(0)).current;
  const flow = useRef(new Animated.Value(0)).current;
  const pins = useStagger(PINS.length, play, 480, 220);
  const joiners = useStagger(JOINERS.length, play, 900, 260);
  const vibes = useStagger(VIBES.length, play, 340, 150);
  const tripChip = useStagger(1, play, 200)[0];
  const float = useFloat(active);

  useEffect(() => {
    if (!play) return;
    draw.setValue(0);
    Animated.timing(draw, { toValue: 1, duration: 1250, useNativeDriver: false }).start();
  }, [play, draw]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 1500, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [active, flow]);

  const dashOffset = draw.interpolate({ inputRange: [0, 1], outputRange: [DASH, 0] });
  const dotsOffset = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const dotsOpacity = draw.interpolate({ inputRange: [0.75, 1], outputRange: [0, 0.95], extrapolate: 'clamp' });
  const drift = float.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  const driftBack = float.interpolate({ inputRange: [0, 1], outputRange: [3, -3] });

  return (
    <View style={styles.stage}>
      <View style={styles.card}>
        <LinearGradient colors={['#EAF6FF', '#DCEEFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* Stylized city blocks: a park and a lake */}
        <View style={styles.park} />
        <View style={styles.lake} />

        <Svg width={W} height={H} style={styles.svg}>
          {Array.from({ length: 9 }, (_, i) => (i + 1) * 30).map((x) => (
            <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(16,24,40,0.05)" strokeWidth={1} />
          ))}
          {Array.from({ length: 5 }, (_, i) => (i + 1) * 30).map((y) => (
            <Line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(16,24,40,0.05)" strokeWidth={1} />
          ))}
          <AnimatedPath d={ROUTE} fill="none" stroke="rgba(37,99,255,0.22)" strokeWidth={10} strokeLinecap="round" strokeDasharray={[DASH, DASH]} strokeDashoffset={dashOffset} />
          <AnimatedPath d={ROUTE} fill="none" stroke={colors.blue} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={[DASH, DASH]} strokeDashoffset={dashOffset} />
          <AnimatedPath d={ROUTE} fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeDasharray={[2, 13.4]} strokeDashoffset={dotsOffset} strokeOpacity={dotsOpacity} />
        </Svg>

        {/* Trip chip on the map */}
        <Animated.View style={[styles.tripChip, rise(tripChip, 12)]}>
          <View style={styles.tripChipIcon}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
          </View>
          <Text style={styles.tripChipText}>Tokyo Weekend</Text>
        </Animated.View>

        {PINS.map((pin, index) => (
          <Animated.View key={pin.label} style={[styles.pinWrap, { left: pin.x - 14, top: pin.y - 14 }, pop(pins[index])]}>
            <View style={[styles.pin, { backgroundColor: pin.color }]}>
              <Ionicons name={pin.icon} size={13} color="#FFFFFF" />
            </View>
            <View style={[styles.pinLabel, pin.labelLeft ? styles.pinLabelLeft : styles.pinLabelRight]}>
              <Text style={styles.pinLabelText}>{pin.label}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Friends joining the trip, one by one */}
      {JOINERS.map((joiner, index) => (
        <Animated.View
          key={joiner.letter}
          style={[styles.joiner, joiner.style, pop(joiners[index]), { transform: [...pop(joiners[index]).transform, { translateY: index % 2 ? drift : driftBack }] }]}
        >
          <MiniAvatar letter={joiner.letter} color={joiner.color} size={34} />
        </Animated.View>
      ))}

      {/* Vibe chips floating off the card edges */}
      {VIBES.map((vibe, index) => (
        <Animated.View
          key={vibe.label}
          style={[styles.vibeChip, vibe.style, { backgroundColor: vibe.bg }, pop(vibes[index]), { transform: [...pop(vibes[index]).transform, { translateY: index % 2 ? driftBack : drift }] }]}
        >
          <Ionicons name={vibe.icon} size={13} color={vibe.fg} />
          <Text style={[styles.vibeText, { color: vibe.fg }]}>{vibe.label}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 316, height: 240, alignItems: 'center', justifyContent: 'center' },
  card: { width: W + 20, height: H + 20, borderRadius: 26, overflow: 'hidden', padding: 10, ...panel, ...shadows.float },
  svg: { position: 'absolute', top: 10, left: 10 },
  park: { position: 'absolute', right: 26, bottom: 18, width: 84, height: 58, borderRadius: 18, backgroundColor: colors.park },
  lake: { position: 'absolute', left: -16, top: -14, width: 92, height: 70, borderRadius: 32, backgroundColor: colors.water },
  tripChip: { position: 'absolute', top: 18, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: radii.pill, paddingLeft: 5, paddingRight: 11, height: 30, ...shadows.card },
  tripChipIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  tripChipText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  pinWrap: { position: 'absolute', width: 28, height: 28 },
  pin: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', ...shadows.pin },
  pinLabel: { position: 'absolute', top: 3, height: 22, paddingHorizontal: 8, borderRadius: radii.pill, backgroundColor: '#FFFFFF', justifyContent: 'center', ...shadows.card },
  pinLabelRight: { left: 33 },
  pinLabelLeft: { right: 33 },
  pinLabelText: { fontSize: 11, fontWeight: '800', color: colors.ink },
  joiner: { position: 'absolute', ...shadows.card },
  vibeChip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: radii.pill, ...shadows.card },
  vibeText: { fontSize: 12, fontWeight: '800' },
});
