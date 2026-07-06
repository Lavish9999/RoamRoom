import { LinearGradient } from 'expo-linear-gradient';
import type { ViewStyle } from 'react-native';

import { coverGradients } from '@/data/covers';
import type { CoverKey } from '@/data/types';
import { radii } from '@/theme';

export function CoverImage({
  coverKey,
  style,
  radius = radii.md,
  children,
}: {
  coverKey: CoverKey;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  children?: React.ReactNode;
}) {
  const [start, end] = coverGradients[coverKey];
  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
    >
      {children}
    </LinearGradient>
  );
}
