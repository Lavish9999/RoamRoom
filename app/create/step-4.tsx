import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
import type { BudgetComfort } from '@/data/types';
import { useCreateTrip } from '@/state/CreateTripContext';
import { colors } from '@/theme';

const options: Array<{ value: BudgetComfort; emoji: string; description: string }> = [
  { value: 'Budget', emoji: '💸', description: 'Hostels, street food, transit passes' },
  { value: 'Mid-range', emoji: '⚖️', description: '3-4★ hotels, mix of casual and nice dinners' },
  { value: 'Premium', emoji: '✨', description: 'Great hotels, reservations, private transfers' },
  { value: 'Mixed', emoji: '🎛', description: 'Different comfort per person — splits stay fair' },
];

export default function CreateStep4() {
  const { draft, setDraft } = useCreateTrip();

  return (
    <View style={styles.wrap}>
      <StepHeader
        step={4}
        title="Group budget comfort"
        subtitle="RoamRoom quietly flags ideas that would push past this — no awkward money talk needed."
        onBack={() => router.back()}
        onClose={() => router.dismissTo('/')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {options.map((option) => {
          const selected = draft.budgetComfort === option.value;
          return (
            <Card key={option.value} padded selected={selected} onPress={() => setDraft({ budgetComfort: option.value })} style={styles.card}>
              <View style={styles.radio}>
                <View style={[styles.radioDot, selected && styles.radioDotOn]} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.label}>
                  {option.emoji} {option.value}
                </Text>
                <Text style={styles.description}>{option.description}</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Next · Starting point" onPress={() => router.push('/create/step-5')} />
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
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D5DBE3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: {
    width: 0,
    height: 0,
    borderRadius: 5,
  },
  radioDotOn: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  description: {
    marginTop: 4,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.ink2,
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
