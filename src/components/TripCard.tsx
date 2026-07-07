import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Trip, TripStatus } from '@/data/types';
import { colors, radii, type ChipVariant } from '@/theme';
import { countdownLabel, formatDateRange } from '@/utils/date';

import { AvatarStack } from './Avatar';
import { Card } from './Card';
import { Chip } from './Chip';
import { CoverImage } from './CoverImage';
import { ProgressRing } from './ProgressRing';

const statusToChipVariant: Record<TripStatus, ChipVariant> = {
  Planning: 'planning',
  Live: 'live',
  Done: 'done',
};

export function TripCard({
  trip,
  active,
  onPress,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  active?: boolean;
  onPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const readinessPct = trip.readinessTotal > 0 ? (trip.readinessDone / trip.readinessTotal) * 100 : 0;

  return (
    <Card style={[styles.card, active && styles.cardActive]}>
      <Pressable onPress={onPress}>
        <CoverImage coverKey={trip.coverKey} destination={trip.destination} style={styles.cover} radius={0}>
          <View style={styles.coverOverlay} />
          <View style={styles.coverTopRow}>
            <View style={styles.chipWrap}>
              <Chip variant={statusToChipVariant[trip.status]} label={trip.status} />
            </View>
            <View style={styles.countdown}>
              <Text style={styles.countdownText}>{countdownLabel(trip.startDate, trip.status)}</Text>
            </View>
          </View>
          <View style={styles.coverBottom}>
            {active ? (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            ) : null}
            <Text style={styles.tripName}>{trip.name}</Text>
            <Text style={styles.tripMeta}>
              {trip.destination} · {formatDateRange(trip.startDate, trip.endDate)}
            </Text>
          </View>
        </CoverImage>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.bodyRow}>
          <AvatarStack avatars={trip.members.map((member) => ({ initial: member.initial, avatarKey: member.avatarKey }))} />
          <View style={styles.readiness}>
            <View style={styles.readinessText}>
              <Text style={styles.caption}>Trip setup</Text>
              <Text style={styles.readinessValue}>
                {trip.readinessDone} of {trip.readinessTotal} done
              </Text>
            </View>
            <ProgressRing progress={readinessPct} />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={17} color={colors.ink} />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={17} color={colors.coral} />
            <Text style={[styles.actionText, { color: colors.coral }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.blue,
  },
  activePill: {
    alignSelf: 'flex-start',
    height: 20,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.blue,
    justifyContent: 'center',
    marginBottom: 6,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cover: {
    height: 172,
    padding: 14,
    justifyContent: 'space-between',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,21,28,0.18)',
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chipWrap: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
  },
  countdown: {
    backgroundColor: 'rgba(16,21,28,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    height: 26,
    justifyContent: 'center',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  coverBottom: {
    gap: 2,
  },
  tripName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  tripMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    padding: 16,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readiness: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readinessText: {
    alignItems: 'flex-end',
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink2,
  },
  readinessValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  actions: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: '#232B36',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
});
