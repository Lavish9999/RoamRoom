// Design tokens — bright travel theme ("vacation command center").
// Single source of truth for colors/radii/shadows/type; screens consume
// `theme` rather than hard-coding values.

export const colors = {
  bg: '#FFF8EF', // warm cloud
  ink: '#101828', // navy ink text
  ink2: '#667085', // muted text
  btn: '#2563FF', // primary electric blue
  blue: '#2563FF',
  coral: '#FF6B4A',
  green: '#19D3A2',
  amber: '#FFD166',
  card: '#FFFFFF',
  border: 'rgba(16,24,40,0.10)',
  borderSoft: 'rgba(16,24,40,0.06)',
  cream: '#FFFFFF', // sheet surface
  // Soft tinted surfaces for chips/icon wells.
  softBlue: '#EAF6FF',
  softCoral: '#FFE9E2',
  softMint: '#DCF7EE',
  softYellow: '#FFF3D6',
  // Map-ish fills.
  water: '#D7EBFA',
  land: '#F4EDE0',
  park: '#DDF3E4',
} as const;

export const avatarColors = {
  robert: '#4A90D9',
  maya: '#FF8A65',
  chris: '#34B37E',
  lena: '#9B7EDE',
  you: '#2563FF',
  plus: '#98A2B3',
} as const;

export type AvatarKey = keyof typeof avatarColors;

export const radii = {
  lg: 28,
  md: 22,
  sm: 15,
  xs: 10,
  pill: 999,
} as const;

// One spacing scale for consistent rhythm. Screen gutter = lg (20).
export const space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

// Soft, warm elevation for light surfaces — tinted navy so shadows read as
// depth, never as grey mud.
export const shadows = {
  card: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  float: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 10,
  },
  pin: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.4, color: '#101828' },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.3, color: '#101828' },
  h2: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.2, color: '#101828' },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.1, color: '#101828' },
  body: { fontSize: 15, lineHeight: 22, color: '#101828' },
  sub: { fontSize: 14, lineHeight: 21, color: colors.ink2 },
  cap: { fontSize: 12, fontWeight: '600' as const, color: colors.ink2 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.ink2,
  },
} as const;

// Chip status taxonomy (bg/fg/dot per variant), tuned for bright surfaces.
export const chipVariants = {
  planning: { bg: '#EAF6FF', fg: '#2563FF', dot: colors.blue },
  live: { bg: '#DCF7EE', fg: '#0FA47F', dot: colors.green },
  done: { bg: '#F2F4F7', fg: colors.ink2, dot: '#98A2B3' },
  ready: { bg: '#FFF3D6', fg: '#B7791F', dot: colors.amber },
  warn: { bg: '#FFE9E2', fg: '#E5533C', dot: colors.coral },
} as const;

export type ChipVariant = keyof typeof chipVariants;

export const theme = { colors, avatarColors, radii, space, shadows, type, chipVariants };

export default theme;
