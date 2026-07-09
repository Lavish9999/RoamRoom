import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { avatarColors, type AvatarKey } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizes: Record<AvatarSize, { box: number; font: number; border: number }> = {
  sm: { box: 26, font: 10.5, border: 1.5 },
  md: { box: 34, font: 13, border: 2 },
  lg: { box: 52, font: 19, border: 2 },
};

export function Avatar({
  initial,
  avatarKey,
  size = 'md',
  style,
}: {
  initial: string;
  avatarKey: AvatarKey;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}) {
  const dims = sizes[size];
  const isPlus = avatarKey === 'plus';
  return (
    <View
      style={[
        styles.base,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: dims.box / 2,
          borderWidth: dims.border,
          backgroundColor: avatarColors[avatarKey],
        },
        style,
      ]}
    >
      <Text style={[styles.label, { fontSize: dims.font, color: isPlus ? '#667085' : '#FFFFFF' }]}>{initial}</Text>
    </View>
  );
}

export function AvatarStack({ avatars, size = 'md' }: { avatars: Array<{ initial: string; avatarKey: AvatarKey }>; size?: AvatarSize }) {
  return (
    <View style={styles.stack}>
      {avatars.map((avatar, index) => (
        <Avatar key={`${avatar.avatarKey}-${index}`} initial={avatar.initial} avatarKey={avatar.avatarKey} size={size} style={index > 0 && styles.overlap} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
    shadowColor: 'rgba(16,21,28,1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontWeight: '700',
  },
  stack: {
    flexDirection: 'row',
  },
  overlap: {
    marginLeft: -9,
  },
});
