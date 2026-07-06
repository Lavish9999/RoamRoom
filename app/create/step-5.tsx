import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, CoverImage, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
import type { CoverKey } from '@/data/types';
import { useCreateTrip } from '@/state/CreateTripContext';
import { useToast } from '@/state/ToastContext';
import { useTrips } from '@/state/useTrips';
import { colors, radii, type } from '@/theme';
import { buildTripFromDraft } from '@/utils/buildTrip';

type Template = {
  id: string;
  name: string;
  coverKey: CoverKey;
  bestFor: string;
  bullets: string[];
  plus?: boolean;
};

const templates: Template[] = [
  {
    id: 'international',
    name: 'International Group Trip',
    coverKey: 'tokyo',
    bestFor: 'Best for 3+ people flying abroad',
    bullets: ['Passports & visas', 'Flights + hotel', 'Currency & emergency info', 'Shared expenses & daily plan'],
  },
  {
    id: 'weekend-city',
    name: 'Weekend City Trip',
    coverKey: 'lisbon',
    bestFor: 'Best for 2-3 night getaways',
    bullets: ['Light packing list', 'Food-first day plan', 'Quick expense split'],
  },
  {
    id: 'road-trip',
    name: 'Road Trip',
    coverKey: 'kyoto',
    bestFor: 'Best for multi-stop drives',
    bullets: ['Route with overnight stops', 'Gas & toll expense split', 'Car packing checklist'],
  },
  {
    id: 'bachelor',
    name: 'Bachelor / Bachelorette',
    coverKey: 'goldengai',
    bestFor: 'Best for big-group celebrations',
    bullets: ['RSVP & payment tracking', 'Night-by-night plan', 'Group polls built in'],
    plus: true,
  },
  {
    id: 'family',
    name: 'Family Vacation',
    coverKey: 'sky',
    bestFor: 'Best for mixed ages & kids',
    bullets: ['Slower-paced days', 'Per-family rooms & costs', 'Medical & allergy notes'],
  },
  {
    id: 'theme-park',
    name: 'Theme Park Trip',
    coverKey: 'teamlab',
    bestFor: 'Best for park days & ride plans',
    bullets: ['Timed entries & queues', 'Rope-drop day plans', 'Park ticket tracking'],
    plus: true,
  },
  {
    id: 'couple',
    name: 'Couple Getaway',
    coverKey: 'ichiran',
    bestFor: 'Best for two travelers',
    bullets: ['Reservations-first plan', '50/50 or one-payer split', 'Shared memories book'],
  },
];

export default function CreateStep5() {
  const { draft, reset } = useCreateTrip();
  const { addTrip } = useTrips();
  const toast = useToast();

  async function finish(overrides?: { name?: string; coverKey?: CoverKey }) {
    const trip = buildTripFromDraft(draft, overrides);
    await addTrip(trip);
    reset();
    toast.show(`${trip.name} created`);
    router.dismissTo('/');
  }

  function handleTemplatePress(template: Template) {
    if (template.plus) {
      toast.show('RoamRoom Plus required for this template');
      return;
    }
    finish({ name: draft.name.trim() || template.name, coverKey: template.coverKey });
  }

  return (
    <View style={styles.wrap}>
      <StepHeader step={5} title="How do you want to start?" onBack={() => router.back()} onClose={() => router.dismissTo('/')} />

      <ScrollView contentContainerStyle={styles.content}>
        <Card padded onPress={() => finish()} style={styles.optionCard}>
          <Text style={styles.optionEmoji}>📝</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Start with a blank trip</Text>
            <Text style={type.sub}>Add flights, ideas, and days yourself.</Text>
          </View>
        </Card>

        <Card padded onPress={() => toast.show('RoamRoom Plus required to generate a starter plan')} style={styles.optionCard}>
          <Text style={styles.optionEmoji}>✨</Text>
          <View style={styles.optionText}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>Generate a starter plan</Text>
              <Chip variant="ready" label="Plus" />
            </View>
            <Text style={type.sub}>7 days shaped by your vibe, dates, and budget — from real places, editable by everyone.</Text>
          </View>
        </Card>

        <Text style={styles.orLabel}>Or start from a template</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {templates.map((template) => (
            <Card key={template.id} onPress={() => handleTemplatePress(template)} style={styles.templateCard}>
              <CoverImage coverKey={template.coverKey} style={styles.templatePhoto} radius={0}>
                {template.plus ? (
                  <View style={styles.plusBadge}>
                    <Chip variant="ready" label="Plus" />
                  </View>
                ) : null}
              </CoverImage>
              <View style={styles.templateBody}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateBestFor}>{template.bestFor}</Text>
                {template.bullets.map((bullet) => (
                  <Text key={bullet} style={styles.templateBullet}>
                    ✓ {bullet}
                  </Text>
                ))}
              </View>
            </Card>
          ))}
        </ScrollView>

        <Text style={type.cap}>
          Templates prefill the readiness checklist, packing list, tasks, and suggested itinerary categories. Saving your own custom
          templates is a Plus feature.
        </Text>
      </ScrollView>
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
    paddingBottom: 32,
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  orLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink2,
  },
  templateRow: {
    gap: 12,
    paddingRight: 8,
  },
  templateCard: {
    width: 200,
    overflow: 'hidden',
  },
  templatePhoto: {
    height: 82,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: 8,
    alignItems: 'flex-end',
  },
  plusBadge: {
    alignSelf: 'flex-end',
  },
  templateBody: {
    padding: 12,
    gap: 4,
  },
  templateName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  templateBestFor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink2,
    marginBottom: 4,
  },
  templateBullet: {
    fontSize: 11.5,
    color: colors.ink2,
  },
});
