import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
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

import { AnimatedRouteMap } from '@/components/onboarding/AnimatedRouteMap';
import { ExpenseSplitPreview } from '@/components/onboarding/ExpenseSplitPreview';
import { ItineraryPreview } from '@/components/onboarding/ItineraryPreview';
import { VotingPreview } from '@/components/onboarding/VotingPreview';
import { useAuth, type AuthProvider } from '@/state/AuthContext';
import { markOnboardingSeen } from '@/state/onboarding';
import { useToast } from '@/state/ToastContext';
import { colors, radii, shadows } from '@/theme';

type SlideKey = 'plan' | 'vote' | 'money' | 'ready';
type Slide = { key: SlideKey; title: string; copy: string };
type BackdropAccent = { icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string; style: object; size?: number };

const SLIDES: Slide[] = [
  { key: 'plan', title: 'Plan the trip together.', copy: 'One shared room for dates, places, ideas, and decisions.' },
  { key: 'vote', title: 'Vote without the chaos.', copy: 'Turn messy group chats into clear picks everyone can see.' },
  { key: 'money', title: 'Keep money simple.', copy: 'Track shared costs, budgets, and who paid for what.' },
  { key: 'ready', title: 'Arrive ready.', copy: 'Your itinerary, bookings, plans, and group decisions stay in one place.' },
];

const BACKDROP_ACCENTS: Record<SlideKey, BackdropAccent[]> = {
  plan: [
    { icon: 'location', tint: colors.coral, bg: 'rgba(255,107,74,0.14)', style: { top: 118, right: 34, transform: [{ rotate: '12deg' }] } },
    { icon: 'restaurant', tint: colors.blue, bg: 'rgba(37,99,255,0.12)', style: { top: 292, left: 30, transform: [{ rotate: '-10deg' }] } },
    { icon: 'bed', tint: '#0FA47F', bg: 'rgba(25,211,162,0.14)', style: { bottom: 246, right: 22, transform: [{ rotate: '-8deg' }] } },
  ],
  vote: [
    { icon: 'heart', tint: colors.coral, bg: 'rgba(255,107,74,0.14)', style: { top: 134, left: 24, transform: [{ rotate: '-12deg' }] } },
    { icon: 'checkmark-circle', tint: '#0FA47F', bg: 'rgba(25,211,162,0.15)', style: { top: 282, right: 26, transform: [{ rotate: '9deg' }] } },
    { icon: 'chatbubbles', tint: colors.blue, bg: 'rgba(37,99,255,0.11)', style: { bottom: 260, left: 42, transform: [{ rotate: '11deg' }] } },
  ],
  money: [
    { icon: 'receipt', tint: '#B7791F', bg: 'rgba(255,209,102,0.22)', style: { top: 126, right: 26, transform: [{ rotate: '10deg' }] } },
    { icon: 'card', tint: colors.blue, bg: 'rgba(37,99,255,0.11)', style: { top: 306, left: 28, transform: [{ rotate: '-9deg' }] } },
    { icon: 'swap-horizontal', tint: '#0FA47F', bg: 'rgba(25,211,162,0.14)', style: { bottom: 252, right: 36, transform: [{ rotate: '-10deg' }] } },
  ],
  ready: [
    { icon: 'airplane', tint: colors.blue, bg: 'rgba(37,99,255,0.12)', style: { top: 132, left: 26, transform: [{ rotate: '-16deg' }] } },
    { icon: 'sunny', tint: '#B7791F', bg: 'rgba(255,209,102,0.22)', style: { top: 292, right: 26, transform: [{ rotate: '12deg' }] } },
    { icon: 'checkmark-done', tint: '#0FA47F', bg: 'rgba(25,211,162,0.15)', style: { bottom: 250, left: 36, transform: [{ rotate: '8deg' }] } },
  ],
};

export default function OnboardingScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(windowWidth);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isConfigured, signIn } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  // Per-slide replay counters: a preview (re)plays its build-in animation each
  // time its counter increments (slide 0 plays immediately on mount).
  const [plays, setPlays] = useState<number[]>(() => SLIDES.map((_, index) => (index === 0 ? 1 : 0)));
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  const isLastPage = page === SLIDES.length - 1;
  const pageWidth = Math.max(1, viewportWidth || windowWidth);

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== page) {
      setPlays((prev) => prev.map((count, index) => (index === next ? count + 1 : count)));
    }
    setPage(next);
  }

  function goNext() {
    const node = scrollRef.current as unknown as { scrollTo?: (options: { x: number; animated: boolean }) => void } | null;
    node?.scrollTo?.({ x: (page + 1) * pageWidth, animated: true });
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

  function renderPreview(key: SlideKey, index: number) {
    const play = plays[index];
    const active = page === index;
    if (key === 'plan') return <AnimatedRouteMap play={play} active={active} />;
    if (key === 'vote') return <VotingPreview play={play} active={active} />;
    if (key === 'money') return <ExpenseSplitPreview play={play} />;
    return <ItineraryPreview play={play} active={active} />;
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && Math.abs(nextWidth - viewportWidth) > 0.5) {
          setViewportWidth(nextWidth);
        }
      }}
    >
      <LinearGradient colors={['#FFF8EF', '#EAF6FF']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <OnboardingBackdrop pageWidth={pageWidth} scrollX={scrollX} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="airplane" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>RoamRoom</Text>
        </View>
        {!isLastPage ? (
          <Pressable hitSlop={12} onPress={finish}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => {
          const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
          const artTranslate = scrollX.interpolate({ inputRange, outputRange: [pageWidth * 0.3, 0, -pageWidth * 0.3], extrapolate: 'clamp' });
          const artOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
          const textTranslate = scrollX.interpolate({ inputRange, outputRange: [pageWidth * 0.14, 0, -pageWidth * 0.14], extrapolate: 'clamp' });
          const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

          return (
            <View key={slide.key} style={[styles.slide, { width: pageWidth }]}>
              <Animated.View style={[styles.artArea, { opacity: artOpacity, transform: [{ translateX: artTranslate }] }]}>
                {renderPreview(slide.key, index)}
              </Animated.View>

              <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateX: textTranslate }] }]}>
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
            const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
            const dotScale = scrollX.interpolate({ inputRange, outputRange: [1, 3.2, 1], extrapolate: 'clamp' });
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' });
            return <Animated.View key={slide.key} style={[styles.dot, { opacity: dotOpacity, transform: [{ scaleX: dotScale }] }]} />;
          })}
        </View>

        {isLastPage ? (
          <View style={styles.finalButtons}>
            {isConfigured ? (
              <View style={styles.authRow}>
                <PressableScale style={[styles.authHalf, styles.appleButton]} onPress={() => handleSignIn('apple')} disabled={busy != null}>
                  {busy === 'apple' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
                      <Text style={styles.appleLabel}>Apple</Text>
                    </>
                  )}
                </PressableScale>
                <PressableScale style={[styles.authHalf, styles.googleButton]} onPress={() => handleSignIn('google')} disabled={busy != null}>
                  {busy === 'google' ? (
                    <ActivityIndicator color={colors.ink} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={17} color="#EA4335" />
                      <Text style={styles.googleLabel}>Google</Text>
                    </>
                  )}
                </PressableScale>
              </View>
            ) : null}
            <PressableScale style={styles.ctaShell} onPress={finish} disabled={busy != null}>
              <LinearGradient colors={['#4A82FF', '#2563FF']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Start planning</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </PressableScale>
          </View>
        ) : (
          <PressableScale style={styles.ctaShell} onPress={goNext}>
            <LinearGradient colors={['#4A82FF', '#2563FF']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
              <Text style={styles.ctaText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

function OnboardingBackdrop({ pageWidth, scrollX }: { pageWidth: number; scrollX: Animated.Value }) {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.backdropWashTop} />
      <View style={styles.backdropWashBottom} />
      {SLIDES.map((slide, index) => {
        const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
        const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
        const drift = scrollX.interpolate({ inputRange, outputRange: [20, 0, -20], extrapolate: 'clamp' });

        return (
          <Animated.View key={slide.key} style={[styles.backdropSlide, { opacity, transform: [{ translateX: drift }] }]}>
            <View style={styles.routeLine}>
              {[0, 1, 2, 3, 4, 5].map((dot) => (
                <View key={dot} style={[styles.routeDot, dot % 2 ? styles.routeDotSoft : null]} />
              ))}
            </View>
            <View style={styles.passShape} />
            <View style={styles.ticketShape} />
            {BACKDROP_ACCENTS[slide.key].map((accent, accentIndex) => (
              <View key={`${slide.key}-${accent.icon}-${accentIndex}`} style={[styles.accentChip, { backgroundColor: accent.bg }, accent.style]}>
                <Ionicons name={accent.icon} size={accent.size ?? 18} color={accent.tint} />
              </View>
            ))}
          </Animated.View>
        );
      })}
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
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  backdropWashTop: {
    position: 'absolute',
    top: 96,
    right: -72,
    width: 250,
    height: 96,
    borderRadius: 26,
    backgroundColor: 'rgba(255,209,102,0.13)',
    transform: [{ rotate: '-14deg' }],
  },
  backdropWashBottom: {
    position: 'absolute',
    bottom: 146,
    left: -80,
    width: 245,
    height: 104,
    borderRadius: 28,
    backgroundColor: 'rgba(37,99,255,0.07)',
    transform: [{ rotate: '16deg' }],
  },
  backdropSlide: { ...StyleSheet.absoluteFillObject },
  routeLine: {
    position: 'absolute',
    top: 226,
    left: -26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    opacity: 0.34,
    transform: [{ rotate: '-18deg' }],
  },
  routeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  routeDotSoft: { width: 6, height: 6, backgroundColor: 'rgba(37,99,255,0.34)' },
  passShape: {
    position: 'absolute',
    top: 172,
    left: -48,
    width: 124,
    height: 72,
    borderRadius: 18,
    borderWidth: 1.4,
    borderColor: 'rgba(37,99,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-11deg' }],
  },
  ticketShape: {
    position: 'absolute',
    bottom: 184,
    right: -42,
    width: 148,
    height: 82,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: 'rgba(255,107,74,0.12)',
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '12deg' }],
  },
  accentChip: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.76)',
  },
  topBar: { height: 58, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 26, height: 26, borderRadius: 9, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  brand: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, color: colors.ink },
  skip: { fontSize: 15, fontWeight: '800', color: colors.ink2 },

  carousel: { flex: 1 },
  carouselContent: { alignItems: 'stretch' },
  slide: { flexGrow: 0, flexShrink: 0, paddingHorizontal: 24 },
  artArea: { flex: 1.3, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  textBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -0.6, color: colors.ink, textAlign: 'center' },
  copy: { marginTop: 11, fontSize: 16, lineHeight: 23, color: colors.ink2, textAlign: 'center' },

  footer: { paddingHorizontal: 24, paddingTop: 10, gap: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue },

  ctaShell: { borderRadius: radii.md, ...shadows.float },
  cta: { height: 56, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontSize: 16.5, fontWeight: '800', color: '#FFFFFF' },

  finalButtons: { gap: 12 },
  authRow: { flexDirection: 'row', gap: 10 },
  authHalf: { flex: 1, height: 50, borderRadius: radii.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.card },
  buttonDisabled: { opacity: 0.85 },
  appleButton: { backgroundColor: '#101828' },
  appleLabel: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(16,24,40,0.14)' },
  googleLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
});
