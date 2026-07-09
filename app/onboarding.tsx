import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import { useAuth, type AuthProvider } from '@/state/AuthContext';
import { markOnboardingSeen } from '@/state/onboarding';
import { useToast } from '@/state/ToastContext';
import { colors, radii, shadows } from '@/theme';

type SlideKey = 'brand' | 'plan' | 'decide' | 'auth';
type Slide = { key: SlideKey; eyebrow: string; title: string; copy: string };

const SLIDES: Slide[] = [
  { key: 'brand', eyebrow: 'Welcome to RoamRoom', title: 'Group trips,\nactually organized.', copy: 'The whole trip — map, days, and money — in one place your crew shares.' },
  { key: 'plan', eyebrow: 'Plan together', title: 'One shared plan', copy: 'Everyone sees the same map and a day-by-day itinerary. No more scattered group chats.' },
  { key: 'decide', eyebrow: 'Decide as a group', title: 'Vote & split, fairly', copy: 'Vote on the places you love, track shared costs, and see exactly who owes who.' },
  { key: 'auth', eyebrow: "You're all set", title: 'Plan your first trip', copy: 'Sign in to sync and share with your crew — or jump in and keep it on this device.' },
];

// Staggered "assemble" entrance: element `order` fades + rises as `entrance`
// animates 0 -> 1, each a beat after the last.
function assemble(entrance: Animated.Value, order: number) {
  const start = Math.min(0.09 * order, 0.6);
  return {
    opacity: entrance.interpolate({ inputRange: [start, start + 0.35], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateY: entrance.interpolate({ inputRange: [start, start + 0.42], outputRange: [24, 0], extrapolate: 'clamp' }) }],
  };
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isConfigured, signIn } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const entrances = useRef(SLIDES.map(() => new Animated.Value(0))).current;
  const beat = useRef(new Animated.Value(0)).current; // heart beat + live pulse
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  const isAuthPage = page === SLIDES.length - 1;

  function playEntrance(index: number) {
    entrances[index].setValue(0);
    Animated.timing(entrances[index], { toValue: 1, duration: 780, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }

  useEffect(() => {
    playEntrance(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) playEntrance(next);
    setPage(next);
  }

  function goNext() {
    const node = scrollRef.current as unknown as { scrollTo?: (options: { x: number; animated: boolean }) => void } | null;
    node?.scrollTo?.({ x: (page + 1) * width, animated: true });
  }

  async function finish() {
    await markOnboardingSeen();
    router.replace('/');
  }

  async function handleSignIn(provider: AuthProvider) {
    if (busy) return;
    setBusy(provider);
    try {
      await signIn(provider);
      await markOnboardingSeen();
      toast.show('Signed in');
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      if (message !== 'Sign in was cancelled.') toast.show(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#151E2E', colors.bg]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 0.55 }} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {!isAuthPage ? (
          <Pressable hitSlop={12} onPress={finish}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipSpacer} />
        )}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const artTranslate = scrollX.interpolate({ inputRange, outputRange: [width * 0.32, 0, -width * 0.32], extrapolate: 'clamp' });
          const artOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
          const textTranslate = scrollX.interpolate({ inputRange, outputRange: [width * 0.16, 0, -width * 0.16], extrapolate: 'clamp' });
          const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

          return (
            <View key={slide.key} style={[styles.slide, { width }]}>
              <Animated.View style={[styles.artArea, { opacity: artOpacity, transform: [{ translateX: artTranslate }] }]}>
                <SlideArt slideKey={slide.key} entrance={entrances[index]} beat={beat} />
              </Animated.View>

              <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateX: textTranslate }] }]}>
                <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.copy}>{slide.copy}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotScale = scrollX.interpolate({ inputRange, outputRange: [1, 3, 1], extrapolate: 'clamp' });
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
            return <Animated.View key={slide.key} style={[styles.dot, { opacity: dotOpacity, transform: [{ scaleX: dotScale }] }]} />;
          })}
        </View>

        {isAuthPage ? (
          <View style={styles.authButtons}>
            <PressableScale style={[styles.authButton, styles.appleButton]} onPress={() => handleSignIn('apple')} disabled={!isConfigured || busy != null}>
              {busy === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.authIcon} />
                  <Text style={styles.appleLabel}>Continue with Apple</Text>
                </>
              )}
            </PressableScale>
            <PressableScale style={[styles.authButton, styles.googleButton]} onPress={() => handleSignIn('google')} disabled={!isConfigured || busy != null}>
              {busy === 'google' ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" style={styles.authIcon} />
                  <Text style={styles.googleLabel}>Continue with Google</Text>
                </>
              )}
            </PressableScale>
            <Pressable style={styles.skipButton} onPress={finish} disabled={busy != null}>
              <Text style={styles.skipText}>Continue without an account</Text>
            </Pressable>
          </View>
        ) : (
          <PressableScale style={styles.nextButton} onPress={goNext}>
            <Text style={styles.nextText}>{page === SLIDES.length - 2 ? 'Get started' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </PressableScale>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Per-slide product previews — each a distinct mini-mockup of the real app.
// ---------------------------------------------------------------------------
function SlideArt({ slideKey, entrance, beat }: { slideKey: SlideKey; entrance: Animated.Value; beat: Animated.Value }) {
  if (slideKey === 'plan') return <PlanArt entrance={entrance} beat={beat} />;
  if (slideKey === 'decide') return <VoteArt entrance={entrance} beat={beat} />;
  if (slideKey === 'auth') return <SplitArt entrance={entrance} />;
  return <BrandArt entrance={entrance} />;
}

function Ava({ letter, color }: { letter: string; color: string }) {
  return (
    <View style={[styles.ava, { backgroundColor: color }]}>
      <Text style={styles.avaText}>{letter}</Text>
    </View>
  );
}

function BrandArt({ entrance }: { entrance: Animated.Value }) {
  return (
    <View style={styles.stageTall}>
      <Animated.View style={[styles.brandBack, assemble(entrance, 0)]} />
      <Animated.View style={[styles.brandCard, assemble(entrance, 1)]}>
        <LinearGradient colors={['#5B8CFF', '#3A63D6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandCover}>
          <View style={styles.coverChip}>
            <Ionicons name="location" size={12} color="#FFFFFF" />
            <Text style={styles.coverChipText}>Tokyo, Japan</Text>
          </View>
          <Text style={styles.coverTitle}>Spring Trip</Text>
          <Text style={styles.coverMeta}>May 12 – 18 · 6 nights</Text>
        </LinearGradient>
        <Animated.View style={[styles.brandBody, assemble(entrance, 2)]}>
          <View style={styles.avaRow}>
            <Ava letter="R" color="#3A63D6" />
            <Ava letter="M" color="#D65C46" />
            <Ava letter="C" color="#2FA968" />
          </View>
          <Text style={styles.brandBodyText}>5 going</Text>
          <View style={styles.brandReady}>
            <View style={styles.brandReadyFill} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const MAP_W = 300;
const MAP_H = 168;
const PINS = [
  { x: 46, y: 118 },
  { x: 150, y: 54 },
  { x: 254, y: 104 },
];

function PlanArt({ entrance, beat }: { entrance: Animated.Value; beat: Animated.Value }) {
  const livePulse = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const liveOpacity = beat.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.mapCard, assemble(entrance, 0)]}>
        <LinearGradient colors={['#20304A', '#151E2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Svg width={MAP_W} height={MAP_H} style={StyleSheet.absoluteFill}>
          <Polyline points={PINS.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#FFFFFF" strokeOpacity={0.9} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={PINS.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.btn} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        {PINS.map((p, i) => (
          <Animated.View key={i} style={[styles.mapPin, { left: p.x - 15, top: p.y - 15 }, assemble(entrance, 1 + i)]}>
            <Text style={styles.mapPinText}>{i + 1}</Text>
          </Animated.View>
        ))}
        <Animated.View style={[styles.livePin, { left: PINS[1].x - 6, top: PINS[1].y - 6 }]}>
          <Animated.View style={[styles.liveRing, { opacity: liveOpacity, transform: [{ scale: livePulse }] }]} />
        </Animated.View>

        <Animated.View style={[styles.mapDayChip, assemble(entrance, 1)]}>
          <Text style={styles.mapDayChipText}>Day 1</Text>
        </Animated.View>
        <Animated.View style={[styles.mapRow, assemble(entrance, 4)]}>
          <View style={styles.mapRowIcon}>
            <Ionicons name="restaurant" size={13} color="#F08A6A" />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.mapRowTitle}>Ichiran Ramen</Text>
            <Text style={styles.mapRowMeta}>12:30 · Shibuya</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.ink2} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function VoteRow({ entrance, order, title, area, icon, iconBg, iconFg, count, voted, beat }: {
  entrance: Animated.Value; order: number; title: string; area: string; icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconFg: string; count: number; voted: boolean; beat: Animated.Value;
}) {
  const heartScale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, voted ? 1.22 : 1] });
  return (
    <Animated.View style={[styles.voteCard, assemble(entrance, order)]}>
      <View style={[styles.voteIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconFg} />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.voteTitle}>{title}</Text>
        <Text style={styles.voteMeta}>{area}</Text>
      </View>
      <View style={[styles.voteChip, voted && styles.voteChipOn]}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons name={voted ? 'heart' : 'heart-outline'} size={14} color={voted ? colors.coral : colors.ink2} />
        </Animated.View>
        <Text style={[styles.voteCount, voted && styles.voteCountOn]}>{count}</Text>
      </View>
    </Animated.View>
  );
}

function VoteArt({ entrance, beat }: { entrance: Animated.Value; beat: Animated.Value }) {
  return (
    <View style={styles.stage}>
      <View style={styles.voteStack}>
        <VoteRow entrance={entrance} order={0} title="teamLab Planets" area="Foodie · Toyosu" icon="color-palette" iconBg="#241E33" iconFg="#B79BE6" count={4} voted beat={beat} />
        <VoteRow entrance={entrance} order={1} title="Senso-ji Temple" area="Culture · Asakusa" icon="business" iconBg="#182B45" iconFg="#8FB4FF" count={2} voted={false} beat={beat} />
        <VoteRow entrance={entrance} order={2} title="Golden Gai" area="Nightlife · Shinjuku" icon="wine" iconBg="#301F19" iconFg="#F08A6A" count={1} voted={false} beat={beat} />
      </View>
    </View>
  );
}

function BalanceRow({ entrance, order, letter, color, name, amount, positive }: {
  entrance: Animated.Value; order: number; letter: string; color: string; name: string; amount: string; positive?: boolean;
}) {
  return (
    <Animated.View style={[styles.balRow, assemble(entrance, order)]}>
      <Ava letter={letter} color={color} />
      <Text style={styles.balName}>{name}</Text>
      <Text style={[styles.balAmt, positive ? styles.balPos : styles.balNeg]}>{amount}</Text>
    </Animated.View>
  );
}

function SplitArt({ entrance }: { entrance: Animated.Value }) {
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.splitCard, assemble(entrance, 0)]}>
        <View style={styles.splitHead}>
          <Text style={styles.splitTitle}>Balances</Text>
          <View style={styles.settlePill}>
            <Text style={styles.settlePillText}>2 to settle</Text>
          </View>
        </View>
        <BalanceRow entrance={entrance} order={1} letter="R" color="#3A63D6" name="You" amount="is owed $84" positive />
        <BalanceRow entrance={entrance} order={2} letter="M" color="#D65C46" name="Maya" amount="owes $52" />
        <BalanceRow entrance={entrance} order={3} letter="C" color="#2FA968" name="Chris" amount="owes $32" />
      </Animated.View>
    </View>
  );
}

/** Button wrapper with a springy press-scale microinteraction. */
function PressableScale({ children, style, onPress, disabled }: { children: React.ReactNode; style?: object | object[]; onPress: () => void; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={() => to(0.96)} onPressOut={() => to(1)}>
      <Animated.View style={[style, disabled && styles.buttonDisabled, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 56, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  skip: { fontSize: 15, fontWeight: '800', color: colors.ink2 },
  skipSpacer: { height: 20 },

  slide: { flex: 1, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center' },
  artArea: { height: 300, alignItems: 'center', justifyContent: 'center' },
  stage: { width: 320, height: 260, alignItems: 'center', justifyContent: 'center' },
  stageTall: { width: 320, height: 280, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },

  // Brand — trip card
  brandBack: { position: 'absolute', top: 30, width: 214, height: 210, borderRadius: 24, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, transform: [{ rotate: '-6deg' }], opacity: 0.7 },
  brandCard: { width: 248, borderRadius: 24, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden', ...shadows.float },
  brandCover: { height: 132, padding: 14, justifyContent: 'flex-end' },
  coverChip: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,21,28,0.42)', borderRadius: radii.pill, paddingHorizontal: 9, height: 26 },
  coverChipText: { fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' },
  coverTitle: { fontSize: 21, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  coverMeta: { marginTop: 2, fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  brandBody: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  avaRow: { flexDirection: 'row' },
  brandBodyText: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.ink2, marginLeft: 2 },
  brandReady: { width: 46, height: 6, borderRadius: 3, backgroundColor: '#26303C', overflow: 'hidden' },
  brandReadyFill: { width: '66%', height: '100%', borderRadius: 3, backgroundColor: colors.green },

  ava: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card, marginLeft: -8 },
  avaText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // Plan — map
  mapCard: { width: MAP_W, height: MAP_H + 58, borderRadius: 22, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden', ...shadows.float },
  mapPin: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', ...shadows.card },
  mapPinText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  livePin: { position: 'absolute', width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  liveRing: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue },
  mapDayChip: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(16,21,28,0.5)', borderRadius: radii.pill, paddingHorizontal: 11, height: 28, alignItems: 'center', justifyContent: 'center' },
  mapDayChipText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  mapRow: { position: 'absolute', left: 12, right: 12, bottom: 12, height: 46, borderRadius: 14, backgroundColor: colors.cream, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  mapRowIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#301F19', alignItems: 'center', justifyContent: 'center' },
  mapRowTitle: { fontSize: 13.5, fontWeight: '800', color: colors.ink },
  mapRowMeta: { fontSize: 11.5, fontWeight: '600', color: colors.ink2 },

  // Vote — place rows
  voteStack: { width: 300, gap: 10 },
  voteCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 11, ...shadows.card },
  voteIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  voteTitle: { fontSize: 14.5, fontWeight: '800', color: colors.ink },
  voteMeta: { marginTop: 1, fontSize: 12, fontWeight: '600', color: colors.ink2 },
  voteChip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#232B36' },
  voteChipOn: { backgroundColor: '#331C19' },
  voteCount: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  voteCountOn: { color: colors.coral },

  // Split — balances
  splitCard: { width: 296, borderRadius: 20, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 16, ...shadows.float },
  splitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  splitTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  settlePill: { backgroundColor: '#331C19', borderRadius: radii.pill, paddingHorizontal: 10, height: 26, alignItems: 'center', justifyContent: 'center' },
  settlePillText: { fontSize: 11.5, fontWeight: '800', color: colors.coral },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  balName: { flex: 1, fontSize: 14.5, fontWeight: '800', color: colors.ink, marginLeft: 2 },
  balAmt: { fontSize: 13.5, fontWeight: '800' },
  balPos: { color: colors.green },
  balNeg: { color: colors.coral },

  // Text
  textBlock: { alignItems: 'center', paddingHorizontal: 6 },
  eyebrow: { marginTop: 6, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: colors.blue, textAlign: 'center' },
  title: { marginTop: 10, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, textAlign: 'center' },
  copy: { marginTop: 12, fontSize: 15.5, lineHeight: 22, color: colors.ink2, textAlign: 'center' },

  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue },

  nextButton: { height: 54, borderRadius: radii.md, backgroundColor: colors.btn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.card },
  nextText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },

  authButtons: { gap: 12 },
  buttonDisabled: { opacity: 0.85 },
  authButton: { height: 54, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...shadows.card },
  authIcon: { marginRight: 10 },
  appleButton: { backgroundColor: '#000000' },
  appleLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  googleButton: { backgroundColor: '#FFFFFF' },
  googleLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  skipButton: { height: 40, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 15, fontWeight: '700', color: colors.ink2 },
});
