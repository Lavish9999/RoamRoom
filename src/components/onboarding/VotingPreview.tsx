import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { MiniAvatar, panel, pop, rise, useFloat, useStagger } from './shared';

type Suggestion = {
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconFg: string;
  voters: { letter: string; color: string }[];
  count: number;
};

const ROWS: Suggestion[] = [
  {
    title: 'Sushi night',
    meta: 'Dinner · Ginza',
    icon: 'restaurant',
    iconBg: colors.softCoral,
    iconFg: '#E5533C',
    voters: [
      { letter: 'R', color: '#4A90D9' },
      { letter: 'M', color: '#FF8A65' },
      { letter: 'C', color: '#34B37E' },
    ],
    count: 5,
  },
  {
    title: 'Rooftop bar',
    meta: 'Night out · Shibuya',
    icon: 'wine',
    iconBg: colors.softYellow,
    iconFg: '#B7791F',
    voters: [
      { letter: 'M', color: '#FF8A65' },
      { letter: 'L', color: '#9B7EDE' },
    ],
    count: 3,
  },
  {
    title: 'Museum morning',
    meta: 'Culture · Ueno',
    icon: 'color-palette',
    iconBg: colors.softBlue,
    iconFg: colors.blue,
    voters: [{ letter: 'C', color: '#34B37E' }],
    count: 1,
  },
];

/**
 * Slide 2 hero: a stack of real suggestion cards with voter avatars and vote
 * counts. The heart on the leading card pops, then a "Winner" ribbon springs
 * onto it — the poll resolving in front of you.
 */
export function VotingPreview({ play, active }: { play: number; active: boolean }) {
  const cards = useStagger(ROWS.length, play, 160, 120);
  const heartPop = useRef(new Animated.Value(0)).current;
  const winner = useRef(new Animated.Value(0)).current;
  const float = useFloat(active);

  useEffect(() => {
    if (!play) return;
    heartPop.setValue(0);
    winner.setValue(0);
    Animated.sequence([
      Animated.delay(700),
      Animated.spring(heartPop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }),
      Animated.delay(250),
      Animated.spring(winner, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }),
    ]).start();
  }, [play, heartPop, winner]);

  const lift = float.interpolate({ inputRange: [0, 1], outputRange: [0, -3.5] });
  const heartScale = heartPop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.35, 1] });
  const winnerRotate = winner.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '-4deg'] });

  return (
    <View style={styles.stack}>
      {ROWS.map((row, index) => (
        <Animated.View
          key={row.title}
          style={[
            styles.card,
            rise(cards[index], 24),
            index === 0 && { transform: [...rise(cards[index], 24).transform, { translateY: lift }] },
            index === 0 && styles.cardWinner,
          ]}
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
          <View style={[styles.voteChip, index === 0 && styles.voteChipOn]}>
            {index === 0 ? (
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons name="heart" size={14} color="#E5533C" />
              </Animated.View>
            ) : (
              <Ionicons name="heart-outline" size={14} color={colors.ink2} />
            )}
            <Text style={[styles.voteCount, index === 0 && styles.voteCountOn]}>{row.count}</Text>
          </View>

          {index === 0 ? (
            <Animated.View style={[styles.winnerBadge, pop(winner), { transform: [...pop(winner).transform, { rotate: winnerRotate }] }]} pointerEvents="none">
              <Ionicons name="trophy" size={12} color="#B7791F" />
              <Text style={styles.winnerText}>Winner</Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: 312, gap: 11 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, padding: 12, ...panel, ...shadows.card },
  cardWinner: { borderColor: 'rgba(255,209,102,0.9)', borderWidth: 1.5, ...shadows.float },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  meta: { marginTop: 1, fontSize: 12, fontWeight: '600', color: colors.ink2 },
  voters: { flexDirection: 'row', marginRight: 2 },
  voteChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#F2F4F7' },
  voteChipOn: { backgroundColor: colors.softCoral },
  voteCount: { fontSize: 12.5, fontWeight: '800', color: colors.ink2, fontVariant: ['tabular-nums'] },
  voteCountOn: { color: '#E5533C' },
  winnerBadge: { position: 'absolute', top: -12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.amber, borderRadius: radii.pill, paddingHorizontal: 10, height: 26, ...shadows.card },
  winnerText: { fontSize: 11.5, fontWeight: '800', color: '#7A4E0E' },
});
