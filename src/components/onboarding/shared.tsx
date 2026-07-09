import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

// Shared primitives for the onboarding product previews.

/** Glass-card surface used by every preview panel. */
export const glass = {
  backgroundColor: 'rgba(24,31,42,0.86)',
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(255,255,255,0.08)',
} as const;

/**
 * `count` values that spring 0 -> 1 in a stagger each time `play` increments.
 * Drive stagger-in entrances with `rise(val)`.
 */
export function useStagger(count: number, play: number, baseDelay = 140, step = 110): Animated.Value[] {
  const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (!play) return;
    vals.forEach((val) => val.setValue(0));
    Animated.sequence([
      Animated.delay(baseDelay),
      Animated.stagger(step, vals.map((val) => Animated.spring(val, { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 7 }))),
    ]).start();
  }, [play, vals, baseDelay, step]);
  return vals;
}

/** Fade + rise entrance style from a 0..1 animated value. */
export function rise(val: Animated.Value, distance = 18) {
  return {
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

/** Continuous, gentle sine-ish float loop while `active`. Returns -1..1 value. */
export function useFloat(active: boolean, duration = 2800): Animated.Value {
  const val = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(val, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, val, duration]);
  return val;
}

export function MiniAvatar({ letter, color, size = 20, overlap }: { letter: string; color: string; size?: number; overlap?: boolean }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        overlap && { marginLeft: -Math.round(size * 0.32) },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.46) }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#10151C' },
  avatarText: { fontWeight: '800', color: '#FFFFFF' },
});
