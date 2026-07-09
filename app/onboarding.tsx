import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
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
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, type AuthProvider } from '@/state/AuthContext';
import { markOnboardingSeen } from '@/state/onboarding';
import { useToast } from '@/state/ToastContext';
import { colors, radii, shadows } from '@/theme';

type SlideKey = 'plan' | 'vote' | 'money' | 'ready';
type Slide = {
  key: SlideKey;
  title: string;
  copy: string;
  photo: {
    url: string;
    credit: string;
    accessibilityLabel: string;
  };
};

// Curated fixed Unsplash CDN URLs. Onboarding never searches Unsplash at render time.
const SLIDES: Slide[] = [
  {
    key: 'plan',
    title: 'Plan the trip together',
    copy: 'Build the map, days, stops, and ideas in one shared room.',
    photo: {
      url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=88',
      credit: 'Photo: Unsplash',
      accessibilityLabel: 'Friends looking across a sunny waterfront while traveling.',
    },
  },
  {
    key: 'vote',
    title: 'Vote without the chaos',
    copy: 'Add ideas, vote on favorites, and turn group chat noise into clear picks.',
    photo: {
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=88',
      credit: 'Photo: Unsplash',
      accessibilityLabel: 'A cinematic restaurant dining room ready for a group night out.',
    },
  },
  {
    key: 'money',
    title: 'Keep money simple',
    copy: 'Track shared costs, budgets, and who paid for what.',
    photo: {
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=88',
      credit: 'Photo: Unsplash',
      accessibilityLabel: 'A warm cafe interior with tables for shared travel expenses.',
    },
  },
  {
    key: 'ready',
    title: 'Arrive with a real plan',
    copy: "Know where you're going, who's coming, and what's next.",
    photo: {
      url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=88',
      credit: 'Photo: Unsplash',
      accessibilityLabel: 'An airplane wing above sunlit clouds on the way to a destination.',
    },
  },
];

const AVATARS = ['R', 'M', 'C'];

export default function OnboardingScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(windowWidth);
  const [photoErrors, setPhotoErrors] = useState<Partial<Record<SlideKey, boolean>>>({});
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isConfigured, signIn } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<AuthProvider | null>(null);

  const isLastPage = page === SLIDES.length - 1;
  const pageWidth = Math.max(1, viewportWidth || windowWidth);
  const heroHeight = Math.min(windowHeight * 0.6, Math.max(380, pageWidth * 1.2));

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
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

  function markPhotoFailed(key: SlideKey) {
    setPhotoErrors((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
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
          const active = page === index;
          const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
          const heroTranslate = scrollX.interpolate({ inputRange, outputRange: [pageWidth * 0.08, 0, -pageWidth * 0.08], extrapolate: 'clamp' });
          const photoTranslate = scrollX.interpolate({ inputRange, outputRange: [-26, 0, 26], extrapolate: 'clamp' });
          const heroOpacity = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
          const textTranslate = scrollX.interpolate({ inputRange, outputRange: [pageWidth * 0.14, 0, -pageWidth * 0.14], extrapolate: 'clamp' });
          const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

          return (
            <View key={slide.key} style={[styles.slide, { width: pageWidth }]}> 
              <Animated.View style={[styles.heroArea, { height: heroHeight, opacity: heroOpacity, transform: [{ translateX: heroTranslate }] }]}> 
                <PhotoHero
                  slide={slide}
                  active={active}
                  photoTranslate={photoTranslate}
                  photoFailed={Boolean(photoErrors[slide.key])}
                  onPhotoError={() => markPhotoFailed(slide.key)}
                />
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

function PhotoHero({
  slide,
  active,
  photoTranslate,
  photoFailed,
  onPhotoError,
}: {
  slide: Slide;
  active: boolean;
  photoTranslate: Animated.AnimatedInterpolation<string | number>;
  photoFailed: boolean;
  onPhotoError: () => void;
}) {
  return (
    <View style={styles.photoCard}>
      <LinearGradient colors={['#17233A', '#234F7A']} style={StyleSheet.absoluteFill} />
      {!photoFailed ? (
        <Animated.Image
          source={{ uri: slide.photo.url }}
          style={[styles.heroPhoto, { transform: [{ translateX: photoTranslate }, { scale: 1.08 }] }]}
          resizeMode="cover"
          accessibilityLabel={slide.photo.accessibilityLabel}
          onError={onPhotoError}
        />
      ) : (
        <FallbackPhoto />
      )}
      <LinearGradient colors={['rgba(8,15,30,0.52)', 'rgba(8,15,30,0.24)', 'rgba(8,15,30,0.06)']} locations={[0, 0.5, 0.78]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(37,99,255,0.13)', 'rgba(37,99,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 0.65 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,248,239,0)', 'rgba(255,248,239,0)', '#FFF8EF']} locations={[0, 0.72, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {!photoFailed ? <Text style={styles.photoCredit}>{slide.photo.credit}</Text> : null}
      <SlideOverlay slideKey={slide.key} active={active} />
    </View>
  );
}

function FallbackPhoto() {
  return (
    <View style={styles.fallbackPhoto}>
      <LinearGradient colors={['#0F1F3A', '#2563FF', '#8EC5FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.fallbackGlow} />
    </View>
  );
}

function SlideOverlay({ slideKey, active }: { slideKey: SlideKey; active: boolean }) {
  const entrances = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    entrances.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });

    if (!active) return;

    Animated.stagger(
      95,
      entrances.map((value) =>
        Animated.spring(value, {
          toValue: 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 7,
        }),
      ),
    ).start();
  }, [active, entrances]);

  function floatStyle(index: number) {
    const value = entrances[index];
    return {
      opacity: value,
      transform: [
        { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
        { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
      ],
    };
  }

  if (slideKey === 'plan') return <PlanningOverlay floatStyle={floatStyle} />;
  if (slideKey === 'vote') return <VotingOverlay floatStyle={floatStyle} />;
  if (slideKey === 'money') return <MoneyOverlay floatStyle={floatStyle} />;
  return <ReadyOverlay floatStyle={floatStyle} />;
}

function PlanningOverlay({ floatStyle }: OverlayProps) {
  return (
    <View style={styles.overlayFill}>
      <Animated.View style={[styles.dayPillWrap, floatStyle(0)]}>
        <GlassCard style={styles.dayPill}>
          <Text style={styles.dayPillText}>Day 1</Text>
          <View style={styles.avatarStack}>{AVATARS.map((name) => renderAvatar(name))}</View>
        </GlassCard>
      </Animated.View>
      <Animated.View style={[styles.pinOne, floatStyle(1)]}>
        <PinChip icon="location" label="Shibuya" />
      </Animated.View>
      <Animated.View style={[styles.pinTwo, floatStyle(2)]}>
        <PinChip icon="restaurant" label="Dinner" />
      </Animated.View>
      <Animated.View style={[styles.planCardWrap, floatStyle(3)]}>
        <GlassCard style={styles.planCard}>
          <View style={styles.planHeader}>
            <Text style={styles.glassTitle}>Tokyo plan</Text>
            <View style={styles.routeBadge}>
              <Ionicons name="git-branch" size={12} color="#FFFFFF" />
              <Text style={styles.routeBadgeText}>6 stops</Text>
            </View>
          </View>
          <TimelineRow time="9:40" icon="airplane" title="Land at HND" />
          <TimelineRow time="14:00" icon="bed" title="Check in" />
          <TimelineRow time="19:30" icon="sparkles" title="Sushi night" />
        </GlassCard>
      </Animated.View>
    </View>
  );
}

function VotingOverlay({ floatStyle }: OverlayProps) {
  return (
    <View style={styles.overlayFill}>
      <Animated.View style={[styles.voteTopCard, floatStyle(0)]}>
        <VoteCard icon="restaurant" title="Sushi night" meta="Dinner - Ginza" hearts={5} winner />
      </Animated.View>
      <Animated.View style={[styles.voteMidCard, floatStyle(1)]}>
        <VoteCard icon="wine" title="Rooftop bar" meta="Night out - Shibuya" hearts={3} />
      </Animated.View>
      <Animated.View style={[styles.voteBottomCard, floatStyle(2)]}>
        <VoteCard icon="color-palette" title="Museum morning" meta="Culture - Ueno" hearts={1} />
      </Animated.View>
    </View>
  );
}

function MoneyOverlay({ floatStyle }: OverlayProps) {
  return (
    <View style={styles.overlayFill}>
      <Animated.View style={[styles.moneyChipOne, floatStyle(0)]}>
        <MetricChip icon="wallet" label="$236 tracked" tone="blue" />
      </Animated.View>
      <Animated.View style={[styles.moneyChipTwo, floatStyle(1)]}>
        <MetricChip icon="people" label="Split evenly" tone="green" />
      </Animated.View>
      <Animated.View style={[styles.expensePanelWrap, floatStyle(2)]}>
        <GlassCard style={styles.expensePanel}>
          <View style={styles.expenseHeader}>
            <Text style={styles.glassTitle}>Trip expenses</Text>
            <View style={styles.settledBadge}>
              <Ionicons name="checkmark" size={13} color="#0B8F6C" />
              <Text style={styles.settledText}>settled</Text>
            </View>
          </View>
          <ExpenseRow icon="restaurant" title="Dinner" payer="You paid" amount="$84" />
          <ExpenseRow icon="car" title="Airport ride" payer="M paid" amount="$32" muted />
          <ExpenseRow icon="ticket" title="Museum" payer="C paid" amount="$28" muted />
        </GlassCard>
      </Animated.View>
    </View>
  );
}

function ReadyOverlay({ floatStyle }: OverlayProps) {
  return (
    <View style={styles.overlayFill}>
      <Animated.View style={[styles.weatherPillWrap, floatStyle(0)]}>
        <GlassCard style={styles.weatherPill}>
          <Ionicons name="sunny" size={16} color="#FFD166" />
          <Text style={styles.weatherText}>75F Sunny</Text>
        </GlassCard>
      </Animated.View>
      <Animated.View style={[styles.readyBadgeWrap, floatStyle(1)]}>
        <GlassCard style={styles.readyBadge}>
          <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
          <Text style={styles.readyBadgeText}>Ready</Text>
        </GlassCard>
      </Animated.View>
      <Animated.View style={[styles.arrivalCardWrap, floatStyle(2)]}>
        <GlassCard style={styles.arrivalCard}>
          <Text style={styles.glassTitle}>Arrival timeline</Text>
          <TimelineRow time="09:40" icon="airplane" title="Flight UA 234" />
          <TimelineRow time="12:20" icon="map" title="Hotel route saved" />
          <TimelineRow time="15:00" icon="people" title="Meet the group" />
        </GlassCard>
      </Animated.View>
      <Animated.View style={[styles.mapChipWrap, floatStyle(3)]}>
        <GlassCard style={styles.mapChip}>
          <Ionicons name="navigate" size={15} color={colors.blue} />
          <Text style={styles.mapChipText}>3.2 mi to hotel</Text>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

type OverlayProps = {
  floatStyle: (index: number) => {
    opacity: Animated.Value;
    transform: Array<{ translateY: Animated.AnimatedInterpolation<string | number> } | { scale: Animated.AnimatedInterpolation<string | number> }>;
  };
};

function GlassCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <BlurView intensity={34} tint="light" style={[styles.glassBase, style]}>
      {children}
    </BlurView>
  );
}

function PinChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <GlassCard style={styles.pinChip}>
      <Ionicons name={icon} size={14} color="#FFFFFF" />
      <Text style={styles.pinText}>{label}</Text>
    </GlassCard>
  );
}

function MetricChip({ icon, label, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone: 'blue' | 'green' }) {
  return (
    <GlassCard style={[styles.metricChip, tone === 'green' ? styles.metricGreen : styles.metricBlue]}>
      <Ionicons name={icon} size={14} color={tone === 'green' ? '#0FA47F' : colors.blue} />
      <Text style={[styles.metricText, tone === 'green' ? styles.metricTextGreen : styles.metricTextBlue]}>{label}</Text>
    </GlassCard>
  );
}

function VoteCard({ icon, title, meta, hearts, winner }: { icon: keyof typeof Ionicons.glyphMap; title: string; meta: string; hearts: number; winner?: boolean }) {
  return (
    <GlassCard style={[styles.voteCard, winner ? styles.winnerCard : null]}>
      <View style={styles.voteIconBox}>
        <Ionicons name={icon} size={20} color={winner ? colors.coral : colors.blue} />
      </View>
      <View style={styles.voteTextBlock}>
        <Text style={styles.voteTitle}>{title}</Text>
        <Text style={styles.voteMeta}>{meta}</Text>
      </View>
      <View style={styles.voteRight}>
        {winner ? (
          <View style={styles.winnerBadge}>
            <Ionicons name="trophy" size={11} color="#8A5A00" />
            <Text style={styles.winnerText}>Winner</Text>
          </View>
        ) : null}
        <View style={styles.heartPill}>
          <Ionicons name={winner ? 'heart' : 'heart-outline'} size={13} color={winner ? colors.coral : '#FFFFFF'} />
          <Text style={styles.heartText}>{hearts}</Text>
        </View>
      </View>
    </GlassCard>
  );
}

function TimelineRow({ time, icon, title }: { time: string; icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineTime}>{time}</Text>
      <View style={styles.timelineIcon}>
        <Ionicons name={icon} size={13} color="#FFFFFF" />
      </View>
      <Text style={styles.timelineTitle}>{title}</Text>
    </View>
  );
}

function ExpenseRow({ icon, title, payer, amount, muted }: { icon: keyof typeof Ionicons.glyphMap; title: string; payer: string; amount: string; muted?: boolean }) {
  return (
    <View style={styles.expenseRow}>
      <View style={[styles.expenseIcon, muted ? styles.expenseIconMuted : null]}>
        <Ionicons name={icon} size={16} color={muted ? '#7EA6FF' : colors.coral} />
      </View>
      <View style={styles.expenseCopy}>
        <Text style={[styles.expenseTitle, muted ? styles.mutedTitle : null]}>{title}</Text>
        <Text style={styles.expensePayer}>{payer}</Text>
      </View>
      <Text style={[styles.expenseAmount, muted ? styles.mutedTitle : null]}>{amount}</Text>
    </View>
  );
}

function renderAvatar(name: string) {
  return (
    <View key={name} style={styles.avatar}>
      <Text style={styles.avatarText}>{name}</Text>
    </View>
  );
}

/** Button wrapper with a springy press-scale microinteraction. */
function PressableScale({ children, style, onPress, disabled }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress: () => void; disabled?: boolean }) {
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 26, height: 26, borderRadius: 9, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  brand: { fontSize: 16, fontWeight: '800', color: colors.ink },
  skip: { fontSize: 15, fontWeight: '800', color: colors.ink2 },

  carousel: { flex: 1 },
  carouselContent: { alignItems: 'stretch' },
  slide: { flexGrow: 0, flexShrink: 0 },
  heroArea: { justifyContent: 'flex-end', paddingTop: 10 },
  photoCard: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#14243D',
  },
  heroPhoto: { ...StyleSheet.absoluteFillObject, width: '112%', left: '-6%' },
  fallbackPhoto: { ...StyleSheet.absoluteFillObject },
  fallbackGlow: { position: 'absolute', right: -44, top: 46, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.16)' },
  photoCredit: { position: 'absolute', right: 16, bottom: 12, zIndex: 4, fontSize: 9.5, fontWeight: '700', color: 'rgba(107,100,86,0.72)' },
  overlayFill: { ...StyleSheet.absoluteFillObject, zIndex: 3 },
  glassBase: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.62)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    ...shadows.card,
  },

  dayPillWrap: { position: 'absolute', top: '5%', left: 16 },
  dayPill: { minWidth: 146, height: 42, borderRadius: 21, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dayPillText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  avatarStack: { flexDirection: 'row' },
  avatar: { width: 24, height: 24, marginLeft: -6, borderRadius: 12, backgroundColor: colors.blue, borderWidth: 1.4, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  pinOne: { position: 'absolute', top: '13%', right: 18 },
  pinTwo: { position: 'absolute', top: '18%', left: 20 },
  pinChip: { height: 38, borderRadius: 19, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(37,99,255,0.24)' },
  pinText: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' },
  planCardWrap: { position: 'absolute', left: 16, right: 16, bottom: '30%' },
  planCard: { borderRadius: 26, padding: 16, gap: 12 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  glassTitle: { fontSize: 19, lineHeight: 23, fontWeight: '900', color: '#FFFFFF' },
  routeBadge: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(37,99,255,0.82)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  timelineTime: { width: 43, fontSize: 12.5, fontWeight: '900', color: 'rgba(255,255,255,0.78)' },
  timelineIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  timelineTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  voteTopCard: { position: 'absolute', left: 16, right: 16, top: '6%' },
  voteMidCard: { position: 'absolute', left: 32, right: 20, top: '27%' },
  voteBottomCard: { position: 'absolute', left: 44, right: 16, top: '47%' },
  voteCard: { minHeight: 72, borderRadius: 23, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  winnerCard: { borderColor: 'rgba(255,209,102,0.95)', backgroundColor: 'rgba(255,255,255,0.25)' },
  voteIconBox: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center' },
  voteTextBlock: { flex: 1 },
  voteTitle: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  voteMeta: { marginTop: 2, fontSize: 12.5, fontWeight: '700', color: 'rgba(255,255,255,0.76)' },
  voteRight: { alignItems: 'flex-end', gap: 6 },
  winnerBadge: { height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#FFD166', flexDirection: 'row', alignItems: 'center', gap: 4 },
  winnerText: { fontSize: 11.5, fontWeight: '900', color: '#8A5A00' },
  heartPill: { minWidth: 48, height: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  heartText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },

  moneyChipOne: { position: 'absolute', top: '6%', left: 16 },
  moneyChipTwo: { position: 'absolute', top: '6%', right: 16 },
  metricChip: { height: 39, borderRadius: 20, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricBlue: { backgroundColor: 'rgba(234,244,255,0.72)' },
  metricGreen: { backgroundColor: 'rgba(224,255,246,0.74)' },
  metricText: { fontSize: 13, fontWeight: '900' },
  metricTextBlue: { color: colors.blue },
  metricTextGreen: { color: '#0FA47F' },
  expensePanelWrap: { position: 'absolute', left: 16, right: 16, bottom: '30%' },
  expensePanel: { borderRadius: 28, padding: 17, gap: 14 },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settledBadge: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(224,255,246,0.82)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  settledText: { color: '#0B8F6C', fontSize: 12, fontWeight: '900' },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  expenseIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,238,234,0.88)', alignItems: 'center', justifyContent: 'center' },
  expenseIconMuted: { backgroundColor: 'rgba(235,244,255,0.78)' },
  expenseCopy: { flex: 1 },
  expenseTitle: { fontSize: 15.5, fontWeight: '900', color: '#FFFFFF' },
  expensePayer: { marginTop: 2, fontSize: 12.5, fontWeight: '800', color: 'rgba(255,255,255,0.68)' },
  expenseAmount: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  mutedTitle: { color: 'rgba(255,255,255,0.74)' },

  weatherPillWrap: { position: 'absolute', top: '6%', right: 18 },
  weatherPill: { height: 40, borderRadius: 20, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.24)' },
  weatherText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  readyBadgeWrap: { position: 'absolute', top: '6%', left: 18 },
  readyBadge: { height: 40, borderRadius: 20, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(37,99,255,0.50)' },
  readyBadgeText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  arrivalCardWrap: { position: 'absolute', left: 16, right: 16, bottom: '30%' },
  arrivalCard: { borderRadius: 28, padding: 17, gap: 13 },
  mapChipWrap: { position: 'absolute', right: 20, bottom: '24%' },
  mapChip: { height: 38, borderRadius: 19, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.78)' },
  mapChipText: { fontSize: 12.5, fontWeight: '900', color: colors.ink },

  textBlock: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 24, paddingTop: 22 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: '900', color: colors.ink, textAlign: 'center' },
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
