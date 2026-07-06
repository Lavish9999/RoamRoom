// Design tokens ported verbatim from the roamroom.html prototype (:root block).
// This is the single source of truth for colors/radii/shadows/type — screens must
// never hard-code hex values, they should consume `theme` instead.

export const colors = {
  bg: '#F7F5F0',
  ink: '#10151C',
  ink2: '#7A808A',
  btn: '#101827',
  blue: '#4A7DFF',
  coral: '#FF6B5A',
  green: '#2ED18C',
  amber: '#F0A93B',
  card: '#FFFFFF',
  border: '#E8E4DC',
  borderSoft: 'rgba(232,228,220,0.6)',
  cream: '#FCFBF7',
  water: '#DCEAF2',
  land: '#EFEDE4',
  park: '#DCEAD8',
} as const;

export const avatarColors = {
  robert: '#3E5C76',
  maya: '#C96F4A',
  chris: '#5B8A5B',
  lena: '#8A6FB0',
  you: '#10151C',
  plus: '#EDEAE2',
} as const;

export type AvatarKey = keyof typeof avatarColors;

export const radii = {
  lg: 28,
  md: 22,
  sm: 18,
  xs: 12,
  pill: 999,
} as const;

// React Native shadow props approximating the prototype's CSS box-shadows.
export const shadows = {
  card: {
    shadowColor: 'rgba(16,21,28,1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  float: {
    shadowColor: 'rgba(16,21,28,1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
  pin: {
    shadowColor: 'rgba(16,21,28,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.4 },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 15, lineHeight: 22 },
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

// Chip status taxonomy (bg/fg/dot per variant), ported from .chip.<variant>.
export const chipVariants = {
  planning: { bg: '#EEF3FF', fg: '#3563D9', dot: colors.blue },
  live: { bg: '#E7F9F0', fg: '#199964', dot: colors.green },
  done: { bg: '#F1EFE9', fg: colors.ink2, dot: '#B9B4A8' },
  ready: { bg: '#FFF4E3', fg: '#B87A16', dot: colors.amber },
  warn: { bg: '#FFEFEC', fg: '#D6483A', dot: colors.coral },
} as const;

export type ChipVariant = keyof typeof chipVariants;

export const theme = { colors, avatarColors, radii, shadows, type, chipVariants };

export default theme;
