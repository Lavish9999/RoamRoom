import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { glass, MiniAvatar, rise, useFloat, useStagger } from './shared';

type PlaceRow = {
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconFg: string;
  voters: { letter: string; color: string }[];
  count: number;
  voted?: boolean;
};

const ROWS: PlaceRow[] = [
  {
    title: 'Ichiran Ramen',
    meta: 'Ramen spot · Shibuya',
    icon: 'restaurant',
    iconBg: '#301F19',
    iconFg: '#F08A6A',
    voters: [
      { letter: 'R', color: '#3A63D6' },
      { letter: 'M', color: '#D65C46' },
      { letter: 'C', color: '#2FA968' },
    ],
    count: 4,
    voted: true,
  },
  {
    title: 'Shibuya Sky',
    meta: 'Rooftop view · Sunset slot',
    icon: 'camera',
    iconBg: '#182B45',
    iconFg: '#8FB4FF',
    voters: [
      { letter: 'M', color: '#D65C46' },
      { letter: 'L', color: '#8A63D6' },
    ],
    count: 2,
  },
  {
    title: 'teamLab Planets',
    meta: 'Museum pass · Toyosu',
    icon: 'ticket',
    iconBg: '#241E33',
    iconFg: '#B79BE6',
    voters: [{ letter: 'C', color: '#2FA968' }],
    count: 1,
  },
];

/**
 * Group-voting preview: three real place cards with voter avatars and vote
 * chips. The top card's heart pops in with a floating "+1" and the card lifts
 * gently, so it reads as the group actively choosing.
 */
export function VotingPreview({ play, active }: { play: number; active: boolean }) {
  const cards = useStagger(ROWS.length, play, 160, 120);
  const heartPop = useRef(new Animated.Value(0)).current;
  const plusOne = useRef(new Animated.Value(0)).current;
  const float = useFloat(active);

  useEffect(() => {
    if (!play) return;
    heartPop.setValue(0);
    plusOne.setValue(0);
    Animated.sequence([
      Animated.delay(720),
      Animated.spring(heartPop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }),
      Animated.timing(plusOne, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [play, heartPop, plusOne]);

  const topLift = float.interpolate({ inputRange: [0, 1], outputRange: [0, -3.5] });
  const heartScale = heartPop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.35, 1] });
  const plusRise = plusOne.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const plusFade = plusOne.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] });

  return (
    <View style={styles.stack}>
      {ROWS.map((row, index) => (
        <Animated.View
          key={row.title}
          style={[styles.cardBase, rise(cards[index], 24), index === 0 && { transform: [...rise(cards[index], 24).transform, { translateY: topLift }] }, index === 0 && styles.cardTop]}
        >
          <View style={[styles.icon, { backgroundColor: row.iconBg }]}>
            <Ionicons name={row.icon} size={17} color={row.iconFg} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.meta}>{row.meta}</Text>
          </View>
          <View style={styles.voters}>
            {row.voters.map((voter, voterIndex) => (
              <MiniAvatar key={voter.letter + voterIndex} letter={voter.letter} color={voter.color} overlap={voterIndex > 0} />
            ))}
          </View>
          <View style={[styles.voteChip, row.voted && styles.voteChipOn]}>
            {row.voted ? (
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name="heart" size={14} color={colors.coral} />
              </Animated.View>
            ) : (
              <Ionicons name="heart-outline" size={14} color={colors.ink2} />
            )}
            <Text style={[styles.voteCount, row.voted && styles.voteCountOn]}>{row.count}</Text>
          </View>
          {index === 0 ? (
            <Animated.View style={[styles.plusOne, { opacity: plusFade, transform: [{ translateY: plusRise }] }]} pointerEvents="none">
              <Text style={styles.plusOneText}>+1</Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: 312, gap: 10 },
  cardBase: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, padding: 12, ...glass, ...shadows.card },
  cardTop: { borderColor: 'rgba(91,140,255,0.35)', ...shadows.float },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.ink },
  meta: { marginTop: 1, fontSize: 11.5, fontWeight: '600', color: colors.ink2 },
  voters: { flexDirection: 'row', marginRight: 2 },
  voteChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.06)' },
  voteChipOn: { backgroundColor: '#331C19' },
  voteCount: { fontSize: 12.5, fontWeight: '800', color: colors.ink2, fontVariant: ['tabular-nums'] },
  voteCountOn: { color: colors.coral },
  plusOne: { position: 'absolute', right: 14, top: -2, backgroundColor: colors.coral, borderRadius: radii.pill, paddingHorizontal: 7, height: 20, justifyContent: 'center' },
  plusOneText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
});
