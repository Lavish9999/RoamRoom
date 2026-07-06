import { StyleSheet, Text, View } from 'react-native';

import type { TripInvite } from '@/data/types';
import { colors } from '@/theme';

import { Card } from './Card';
import { CoverImage } from './CoverImage';
import { PrimaryButton } from './PrimaryButton';

export function InviteCard({ invite, onJoin }: { invite: TripInvite; onJoin: () => void }) {
  return (
    <Card padded style={styles.card}>
      <CoverImage coverKey={invite.coverKey} style={styles.photo} />
      <View style={styles.textWrap}>
        <Text style={styles.name}>{invite.tripName}</Text>
        <Text style={styles.caption}>
          {invite.invitedBy} invited you · {invite.dates} · {invite.goingCount} going
        </Text>
      </View>
      <PrimaryButton label="Join" size="small" onPress={onJoin} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  photo: {
    width: 56,
    height: 56,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  caption: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink2,
  },
});
