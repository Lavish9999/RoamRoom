import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { coverGradients } from '@/data/covers';
import type { CoverKey } from '@/data/types';
import { useDestinationPhoto } from '@/state/useDestinationPhoto';
import { radii } from '@/theme';

export function CoverImage({
  coverKey,
  destination,
  photoUrl,
  style,
  radius = radii.md,
  children,
}: {
  coverKey: CoverKey;
  /** When provided, a real photo of this place is fetched and shown. */
  destination?: string;
  /** Explicit photo URL override (skips the lookup). */
  photoUrl?: string;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  children?: React.ReactNode;
}) {
  const [start, end] = coverGradients[coverKey];
  const photo = useDestinationPhoto(photoUrl, destination);

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: start }, style]}>
      {/* Gradient sits underneath as the fallback + while the photo loads. */}
      <LinearGradient colors={[start, end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {photo ? (
        <>
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {/* Scrim keeps overlaid white text legible on bright photos. */}
          <LinearGradient colors={['rgba(16,21,28,0.12)', 'rgba(16,21,28,0.52)']} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      {children}
    </View>
  );
}
