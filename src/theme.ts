// Design tokens — dark theme. This is the single source of truth for
// colors/radii/shadows/type; screens consume `theme` rather than hard-coding.

export const colors = {
  bg: '#0E1217',
  ink: '#EDEFF3',
  ink2: '#9BA3AF',
  btn: '#4A7DFF',
  blue: '#5B8CFF',
  coral: '#FF6B5A',
  green: '#2ED18C',
  amber: '#F0A93B',
  card: '#171D26',
  border: '#252D39',
  borderSoft: 'rgba(255,255,255,0.07)',
  cream: '#1B222C',
  water: '#1B2733',
  land: '#20262F',
  park: '#142A1C',
} as const;

export const avatarColors = {
  robert: '#5C86A8',
  maya: '#E08A5F',
  chris: '#6FA46F',
  lena: '#A98FD8',
  you: '#4A7DFF',
  plus: '#2A323D',
} as const;

export type AvatarKey = keyof typeof avatarColors;

export const radii = {
  lg: 26,
  md: 20,
  sm: 14,
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

// Soft, single-source elevation. On dark, keep shadows subtle (a muddy blur
// looks worse than none) and let the hairline border define the card edge.
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  float: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.42,
    shadowRadius: 34,
    elevation: 12,
  },
  pin: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.4, color: '#EDEFF3' },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.3, color: '#EDEFF3' },
  h2: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.2, color: '#EDEFF3' },
  h3: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.1, color: '#EDEFF3' },
  body: { fontSize: 15, lineHeight: 22, color: '#EDEFF3' },
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

// Chip status taxonomy (bg/fg/dot per variant), tuned for dark surfaces.
export const chipVariants = {
  planning: { bg: '#182B45', fg: '#8FB4FF', dot: colors.blue },
  live: { bg: '#123024', fg: '#4FD39E', dot: colors.green },
  done: { bg: '#20262F', fg: colors.ink2, dot: '#5A6270' },
  ready: { bg: '#2E2413', fg: '#E9B25C', dot: colors.amber },
  warn: { bg: '#331C19', fg: '#F0897A', dot: colors.coral },
} as const;

export type ChipVariant = keyof typeof chipVariants;

export const theme = { colors, avatarColors, radii, space, shadows, type, chipVariants };

export default theme;
