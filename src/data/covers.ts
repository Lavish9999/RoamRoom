import type { CoverKey } from './types';

// The prototype uses hand-drawn SVG scene art (#ph-tokyo, #ph-lisbon, ...) for
// trip covers. Per the milestone scope we don't recreate that art — each cover
// is a simple two-stop gradient placeholder instead, keyed the same way.
export const coverGradients: Record<CoverKey, readonly [string, string]> = {
  tokyo: ['#3E5C76', '#0F1B2E'],
  lisbon: ['#E8A65C', '#C96F4A'],
  kyoto: ['#5B8A5B', '#2E4A34'],
  goldengai: ['#8A3B5C', '#2A1230'],
  sky: ['#6FA7D6', '#2C4E70'],
  teamlab: ['#8A6FB0', '#2B1E45'],
  ichiran: ['#D6483A', '#5C1810'],
  default: ['#7A808A', '#3A3D42'],
};
