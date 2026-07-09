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

import { useAuth, type AuthProvider } from '@/state/AuthContext';
import { markOnboardingSeen } from '@/state/onboarding';
import { useToast } from '@/state/ToastContext';
import { colors, radii, shadows } from '@/theme';

type Chip = { label: string; icon?: keyof typeof Ionicons.glyphMap; place: 'topLeft' | 'bottomRight' };
type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  copy: string;
  icon: keyof typeof Ionicons.glyphMap;
  grad: [string, string];
  chips: Chip[];
};

const SLIDES: Slide[] = [
  {
    key: 'brand',
    eyebrow: 'Welcome to RoamRoom',
    title: 'Group trips,\nactually organized.',
    copy: 'The map, the days, and the money — all in one place, shared with your whole crew.',
    icon: 'airplane',
    grad: ['#5B8CFF', '#3A63D6'],
    chips: [
      { label: 'Tokyo, Japan', icon: 'location', place: 'topLeft' },
      { label: '5 going', icon: 'people', place: 'bottomRight' },
    ],
  },
  {
    key: 'plan',
    eyebrow: 'Plan together',
    title: 'One shared plan',
    copy: 'Everyone sees the same map and a day-by-day itinerary — no more scattered group chats.',
    icon: 'map',
    grad: ['#4F86C6', '#2E5AA8'],
    chips: [
      { label: 'Day 1', icon: 'calendar', place: 'topLeft' },
      { label: '6 stops', icon: 'navigate', place: 'bottomRight' },
    ],
  },
  {
    key: 'decide',
    eyebrow: 'Decide as a group',
    title: 'Vote & split, fairly',
    copy: 'Add places and let the group vote on favorites, then track shared costs and settle up.',
    icon: 'heart',
    grad: ['#F0876A', '#D65C46'],
    chips: [
      { label: '4 votes', icon: 'heart', place: 'topLeft' },
      { label: 'Split evenly', icon: 'wallet', place: 'bottomRight' },
    ],
  },
  {
    key: 'auth',
    eyebrow: "You're all set",
    title: 'Plan your first trip',
    copy: 'Sign in to sync and share with your crew, or jump in and keep everything on this device.',
    icon: 'rocket',
    grad: ['#5FCB86', '#2FA968'],
    chips: [{ label: 'Free to start', icon: 'sparkles', place: 'topLeft' }],
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isConfigured, signIn } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current; // continuous floating loop
  const pulse = useRef(new Animated.Value(0)).current; // continuous glow loop
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  const isAuthPage = page === SLIDES.length - 1;

  // Kick off the two ambient loops once.
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    floatLoop.start();
    pulseLoop.start();
    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [float, pulse]);

  const heroFloat = float.interpolate({ inputRange: [0, 1], outputRange: [-9, 9] });
  const chipFloatA = float.interpolate({ inputRange: [0, 1], outputRange: [7, -7] });
  const chipFloatB = float.interpolate({ inputRange: [0, 1], outputRange: [-6, 8] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.22] });

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
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
      <LinearGradient colors={['#141C2B', colors.bg]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 0.6 }} style={StyleSheet.absoluteFill} />

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
          const artTranslate = scrollX.interpolate({ inputRange, outputRange: [width * 0.24, 0, -width * 0.24], extrapolate: 'clamp' });
          const artScale = scrollX.interpolate({ inputRange, outputRange: [0.78, 1, 0.78], extrapolate: 'clamp' });
          const artOpacity = scrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' });
          const textTranslate = scrollX.interpolate({ inputRange, outputRange: [34, 0, 34], extrapolate: 'clamp' });
          const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

          return (
            <View key={slide.key} style={[styles.slide, { width }]}>
              <View style={styles.artArea}>
                <Animated.View style={[styles.artInner, { opacity: artOpacity, transform: [{ translateX: artTranslate }, { scale: artScale }] }]}>
                  <Animated.View style={[styles.glow, { backgroundColor: slide.grad[0], opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                  <Animated.View style={{ transform: [{ translateY: heroFloat }] }}>
                    <LinearGradient colors={slide.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.artPanel}>
                      <Ionicons name={slide.icon} size={62} color="rgba(255,255,255,0.96)" />
                    </LinearGradient>
                  </Animated.View>
                  {slide.chips.map((chip, chipIndex) => (
                    <Animated.View
                      key={chip.label}
                      style={[
                        styles.chip,
                        chip.place === 'topLeft' ? styles.chipTopLeft : styles.chipBottomRight,
                        { transform: [{ translateY: chipIndex % 2 === 0 ? chipFloatA : chipFloatB }] },
                      ]}
                    >
                      {chip.icon ? <Ionicons name={chip.icon} size={13} color={colors.blue} /> : null}
                      <Text style={styles.chipText}>{chip.label}</Text>
                    </Animated.View>
                  ))}
                </Animated.View>
              </View>

              <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslate }] }}>
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
            const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.32, 1, 0.32], extrapolate: 'clamp' });
            return <Animated.View key={slide.key} style={[styles.dot, { opacity: dotOpacity, transform: [{ scaleX: dotScale }] }]} />;
          })}
        </View>

        {isAuthPage ? (
          <View style={styles.authButtons}>
            <PressableScale
              style={[styles.authButton, styles.appleButton]}
              onPress={() => handleSignIn('apple')}
              disabled={!isConfigured || busy != null}
            >
              {busy === 'apple' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.authIcon} />
                  <Text style={styles.appleLabel}>Continue with Apple</Text>
                </>
              )}
            </PressableScale>
            <PressableScale
              style={[styles.authButton, styles.googleButton]}
              onPress={() => handleSignIn('google')}
              disabled={!isConfigured || busy != null}
            >
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
function PressableScale({
  children,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  style?: object | object[];
  onPress: () => void;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[style, disabled && styles.buttonDisabled, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  topBar: { height: 60, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  skip: { fontSize: 15, fontWeight: '800', color: colors.ink2 },
  skipSpacer: { height: 20 },

  slide: { flex: 1, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  artArea: { height: 260, alignItems: 'center', justifyContent: 'center' },
  artInner: { width: 220, height: 210, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 190, height: 190, borderRadius: 95 },
  artPanel: { width: 150, height: 150, borderRadius: 44, alignItems: 'center', justifyContent: 'center', ...shadows.float },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 11,
    height: 34,
    borderRadius: radii.pill,
    ...shadows.card,
  },
  chipTopLeft: { top: 4, left: -4 },
  chipBottomRight: { bottom: 6, right: -6 },
  chipText: { fontSize: 13, fontWeight: '800', color: colors.ink },

  eyebrow: { marginTop: 30, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.blue, textAlign: 'center' },
  title: { marginTop: 10, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5, color: colors.ink, textAlign: 'center' },
  copy: { marginTop: 12, fontSize: 16, lineHeight: 23, color: colors.ink2, textAlign: 'center', paddingHorizontal: 6 },

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
