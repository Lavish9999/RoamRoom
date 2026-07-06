import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PillButton, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
import type { Vibe } from '@/data/types';
import { useCreateTrip } from '@/state/CreateTripContext';
import { colors } from '@/theme';

const vibeOptions: Array<{ vibe: Vibe; emoji: string }> = [
  { vibe: 'Foodie', emoji: '🍜' },
  { vibe: 'Culture', emoji: '🏛' },
  { vibe: 'Relaxing', emoji: '🌊' },
  { vibe: 'Nightlife', emoji: '🌃' },
  { vibe: 'Adventure', emoji: '🥾' },
  { vibe: 'Shopping', emoji: '🛍' },
  { vibe: 'Family', emoji: '👨‍👩‍👧' },
  { vibe: 'Road trip', emoji: '🚗' },
];

const MAX_VIBES = 3;

export default function CreateStep3() {
  const { draft, setDraft } = useCreateTrip();

  function toggleVibe(vibe: Vibe) {
    const isSelected = draft.vibes.includes(vibe);
    if (isSelected) {
      setDraft({ vibes: draft.vibes.filter((item) => item !== vibe) });
      return;
    }
    if (draft.vibes.length >= MAX_VIBES) return;
    setDraft({ vibes: [...draft.vibes, vibe] });
  }

  return (
    <View style={styles.wrap}>
      <StepHeader
        step={3}
        title="What kind of trip is this?"
        subtitle="Pick up to three. This shapes suggestions and daily pace."
        onBack={() => router.back()}
        onClose={() => router.dismissTo('/')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {vibeOptions.map(({ vibe, emoji }) => (
            <View key={vibe} style={styles.gridItem}>
              <PillButton label={`${emoji}  ${vibe}`} selected={draft.vibes.includes(vibe)} onPress={() => toggleVibe(vibe)} large />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Next · Budget comfort" onPress={() => router.push('/create/step-4')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '47%',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
