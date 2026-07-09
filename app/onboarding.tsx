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

type SlideKey = 'plan' | 'vote' | 'split' | 'ready';
type Slide = { key: SlideKey; eyebrow: string; title: string; copy: string };

const SLIDES: Slide[] = [
  {
    key: 'plan',
    eyebrow: 'Plan together',
    title: 'One trip plan everyone can see',
    copy: 'Build the map, days, stops, and plans in one shared room.',
  },
  {
    key: 'vote',
    eyebrow: 'Group decisions',
    title: 'Vote on what actually makes the trip',
    copy: 'Add ideas, vote on favorites, and stop losing plans in the group chat.',
  },
  {
    key: 'split',
    eyebrow: 'Shared costs',
    title: 'Track who paid and who owes',
    copy: 'Split expenses, settle up, and keep the money side simple.',
  },
  {
    key: 'ready',
    eyebrow: 'Trip ready',
    title: 'Turn scattered ideas into a real itinerary',
    copy: 'RoamRoom turns group planning into one clear plan before you land.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
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

  const isAuthPage = page === SLIDES.length - 1;

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      setPlays((prev) => prev.map((count, index) => (index === next ? count + 1 : count)));
    }
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

  function renderPreview(key: SlideKey, index: number) {
    const play = plays[index];
    const active = page === index;
    if (key === 'plan') return <AnimatedRouteMap play={play} active={active} />;
    if (key === 'vote') return <VotingPreview play={play} active={active} />;
    if (key === 'split') return <ExpenseSplitPreview play={play} />;
    return <ItineraryPreview play={play} active={active} />;
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#16202F', colors.bg]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 0.6 }} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.brand}>RoamRoom</Text>
        {!isAuthPage ? (
          <Pressable hitSlop={12} onPress={finish}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : null}
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
          const artTranslate = scrollX.interpolate({ inputRange, outputRange: [width * 0.3, 0, -width * 0.3], extrapolate: 'clamp' });
          const artOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
          const textTranslate = scrollX.interpolate({ inputRange, outputRange: [width * 0.14, 0, -width * 0.14], extrapolate: 'clamp' });
          const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

          return (
            <View key={slide.key} style={[styles.slide, { width }]}>
              <Animated.View style={[styles.artArea, { opacity: artOpacity, transform: [{ translateX: artTranslate }] }]}>
                {renderPreview(slide.key, index)}
              </Animated.View>

              <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateX: textTranslate }] }]}>
                <Text style={styles.eyebrow}>{slide.eyebrow.toUpperCase()}</Text>
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
            const dotScale = scrollX.interpolate({ inputRange, outputRange: [1, 3.2, 1], extrapolate: 'clamp' });
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.28, 1, 0.28], extrapolate: 'clamp' });
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
  topBar: { height: 58, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3, color: colors.ink },
  skip: { fontSize: 15, fontWeight: '800', color: colors.ink2 },

  slide: { flex: 1, paddingHorizontal: 24 },
  artArea: { flex: 1.25, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  textBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, color: colors.blue, textAlign: 'center' },
  title: { marginTop: 10, fontSize: 27, lineHeight: 33, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, textAlign: 'center' },
  copy: { marginTop: 11, fontSize: 15.5, lineHeight: 22, color: colors.ink2, textAlign: 'center' },

  footer: { paddingHorizontal: 24, paddingTop: 10, gap: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue },

  nextButton: { height: 54, borderRadius: radii.md, backgroundColor: colors.btn, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.float },
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
