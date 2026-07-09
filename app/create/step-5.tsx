import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Chip, CoverImage, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
import { vibeStarterStops, type StarterStop } from '@/data/tripSetup';
import type { BudgetComfort, CoverKey, Vibe } from '@/data/types';
import { useCreateTrip } from '@/state/CreateTripContext';
import { useDestinationPhotos } from '@/state/useDestinationPhotos';
import { seedTripChecklist } from '@/state/useChecklist';
import { seedTripItinerary } from '@/state/useItinerary';
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
  // Archetype applied to the new trip: vibe + budget defaults, a starter
  // checklist, and a starter itinerary — so a template fully sets the trip up.
  vibes: Vibe[];
  budget: BudgetComfort;
  checklist: string[];
  itinerary: StarterStop[];
  plus?: boolean;
};

const templates: Template[] = [
  {
    id: 'international',
    name: 'International Group Trip',
    coverKey: 'tokyo',
    bestFor: 'Best for 3+ people flying abroad',
    bullets: ['Passports & visas', 'Flights + hotel', 'Currency & emergency info', 'Shared expenses & daily plan'],
    vibes: ['Culture', 'Foodie'],
    budget: 'Mid-range',
    itinerary: [
      { day: 1, time: '11:15 AM', title: 'Outbound flight', kind: 'flight', status: 'planned' },
      { day: 1, time: '3:00 PM', title: 'Arrive & check in', kind: 'stay', status: 'planned' },
      { day: 2, time: '10:00 AM', title: 'City highlights walk', kind: 'activity' },
      { day: 2, time: '7:30 PM', title: 'Group dinner', kind: 'food' },
      { day: 3, time: '9:00 AM', title: 'Day trip', kind: 'transport' },
    ],
    checklist: [
      'Book flights',
      'Book accommodation',
      'Check passport / visa',
      'Get travel insurance',
      'Notify bank / get currency',
      'Download offline maps',
      'Share itinerary with the group',
      'Set up shared expenses',
      'Plan the first day',
      'Pack essentials',
    ],
  },
  {
    id: 'weekend-city',
    name: 'Weekend City Trip',
    coverKey: 'lisbon',
    bestFor: 'Best for 2-3 night getaways',
    bullets: ['Light packing list', 'Food-first day plan', 'Quick expense split'],
    vibes: ['Foodie', 'Culture'],
    budget: 'Mid-range',
    itinerary: [
      { day: 1, time: '3:00 PM', title: 'Arrive & check in', kind: 'stay', status: 'planned' },
      { day: 1, time: '8:00 PM', title: 'Dinner out', kind: 'food' },
      { day: 2, time: '10:00 AM', title: 'Explore the old town', kind: 'activity' },
      { day: 2, time: '1:00 PM', title: 'Food crawl', kind: 'food' },
    ],
    checklist: ['Book accommodation', 'Shortlist food spots', 'Plan the first day', 'Pack light', 'Set up expense split'],
  },
  {
    id: 'road-trip',
    name: 'Road Trip',
    coverKey: 'kyoto',
    bestFor: 'Best for multi-stop drives',
    bullets: ['Route with overnight stops', 'Gas & toll expense split', 'Car packing checklist'],
    vibes: ['Road trip', 'Adventure'],
    budget: 'Budget',
    itinerary: [
      { day: 1, time: '9:00 AM', title: 'Drive to the first stop', kind: 'transport', status: 'planned' },
      { day: 1, time: '5:00 PM', title: 'Check in for the night', kind: 'stay' },
      { day: 2, time: '9:00 AM', title: 'Scenic drive leg', kind: 'transport' },
      { day: 2, time: '2:00 PM', title: 'Roadside sight', kind: 'activity' },
    ],
    checklist: [
      'Map the route + overnight stops',
      'Service / check the car',
      'Book stopover stays',
      'Split gas & tolls',
      'Pack car essentials',
      'Download offline maps',
    ],
  },
  {
    id: 'bachelor',
    name: 'Bachelor / Bachelorette',
    coverKey: 'goldengai',
    bestFor: 'Best for big-group celebrations',
    bullets: ['RSVP & payment tracking', 'Night-by-night plan', 'Group polls built in'],
    vibes: ['Nightlife', 'Foodie'],
    budget: 'Premium',
    itinerary: [],
    checklist: ['Confirm the guest list', 'Book the house / hotel', 'Plan each night', 'Collect payments', 'Pack essentials'],
    plus: true,
  },
  {
    id: 'family',
    name: 'Family Vacation',
    coverKey: 'sky',
    bestFor: 'Best for mixed ages & kids',
    bullets: ['Slower-paced days', 'Per-family rooms & costs', 'Medical & allergy notes'],
    vibes: ['Family', 'Relaxing'],
    budget: 'Mid-range',
    itinerary: [
      { day: 1, time: '3:00 PM', title: 'Arrive & check in', kind: 'stay', status: 'planned' },
      { day: 2, time: '10:00 AM', title: 'Easy family outing', kind: 'activity' },
      { day: 2, time: '6:30 PM', title: 'Casual dinner', kind: 'food' },
      { day: 3, time: '10:00 AM', title: 'Kid-friendly activity', kind: 'activity' },
    ],
    checklist: [
      'Book family rooms',
      'Plan slower-paced days',
      'Note medical & allergy info',
      'Pack for the kids',
      'Split per-family costs',
      'Get travel insurance',
    ],
  },
  {
    id: 'theme-park',
    name: 'Theme Park Trip',
    coverKey: 'teamlab',
    bestFor: 'Best for park days & ride plans',
    bullets: ['Timed entries & queues', 'Rope-drop day plans', 'Park ticket tracking'],
    vibes: ['Family', 'Adventure'],
    budget: 'Mid-range',
    itinerary: [],
    checklist: ['Buy park tickets', 'Reserve timed entries', 'Plan rope-drop days', 'Pack essentials', 'Set up expense split'],
    plus: true,
  },
  {
    id: 'couple',
    name: 'Couple Getaway',
    coverKey: 'ichiran',
    bestFor: 'Best for two travelers',
    bullets: ['Reservations-first plan', '50/50 or one-payer split', 'Shared memories book'],
    vibes: ['Relaxing', 'Foodie'],
    budget: 'Premium',
    itinerary: [
      { day: 1, time: '3:00 PM', title: 'Arrive & check in', kind: 'stay', status: 'planned' },
      { day: 1, time: '8:00 PM', title: 'Reservation dinner', kind: 'food' },
      { day: 2, time: '11:00 AM', title: 'Slow morning', kind: 'free' },
      { day: 2, time: '7:00 PM', title: 'Special evening out', kind: 'activity' },
    ],
    checklist: ['Make key reservations', 'Plan the first day', 'Set up 50/50 split', 'Pack essentials', 'Start a shared memories book'],
  },
];

export default function CreateStep5() {
  const { draft, reset } = useCreateTrip();
  const { addTrip, setActiveTrip } = useTrips();
  const toast = useToast();
  // Real photos of the chosen destination, one per template card (falls back to
  // the template's gradient when a photo isn't available).
  const destinationPhotos = useDestinationPhotos(draft.destination, templates.length);

  async function finish(opts?: { name?: string; coverKey?: CoverKey; vibes?: Vibe[]; budget?: BudgetComfort; checklist?: string[]; stops?: StarterStop[] }) {
    const trip = buildTripFromDraft(draft, { name: opts?.name, coverKey: opts?.coverKey, vibes: opts?.vibes, budgetComfort: opts?.budget });
    const { trip: savedTrip, syncError } = await addTrip(trip);
    // Seed the trip's starter content before it opens: the template's checklist
    // (or the default), and an itinerary from the template or the chosen vibes.
    if (opts?.checklist?.length) await seedTripChecklist(savedTrip.id, opts.checklist);
    const stops = opts?.stops ?? vibeStarterStops(opts?.vibes ?? draft.vibes);
    await seedTripItinerary(savedTrip.id, stops, draft.destination.trim());
    // Make the just-created trip the active one so Plan/Map/Expenses open to it.
    await setActiveTrip(savedTrip.id);
    reset();
    // If the cloud save failed, say so loudly — a local-only trip can't be
    // shared by invite code.
    toast.show(syncError ? `Saved on device — ${syncError}` : `${savedTrip.name} created`);
    // Close the create modal, then open the new trip so you land right on it.
    router.dismissTo('/');
    setTimeout(() => router.push(`/trip/${savedTrip.id}`), 0);
  }

  function handleTemplatePress(template: Template) {
    if (template.plus) {
      toast.show('RoamRoom Plus required for this template');
      return;
    }
    finish({
      name: draft.name.trim() || template.name,
      coverKey: template.coverKey,
      vibes: template.vibes,
      budget: template.budget,
      checklist: template.checklist,
      stops: template.itinerary,
    });
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

        <View style={styles.templateList}>
          {templates.map((template, index) => (
            <Card key={template.id} onPress={() => handleTemplatePress(template)} style={styles.templateCard}>
              <CoverImage
                coverKey={template.coverKey}
                photoUrl={destinationPhotos.length ? destinationPhotos[index % destinationPhotos.length] : undefined}
                style={styles.templatePhoto}
                radius={0}
              >
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
        </View>

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
  templateList: {
    gap: 12,
  },
  templateCard: {
    width: '100%',
    overflow: 'hidden',
  },
  templatePhoto: {
    height: 96,
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
