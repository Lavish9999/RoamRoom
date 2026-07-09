import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CoverImage, PrimaryButton } from '@/components';
import { DateRangeCalendar } from '@/components/DateRangeCalendar';
import { DestinationField } from '@/components/DestinationField';
import { StepHeader } from '@/components/StepHeader';
import { coverKeyForDestination } from '@/data/destinations';
import type { CoverKey } from '@/data/types';
import { useCreateTrip } from '@/state/CreateTripContext';
import { colors, radii } from '@/theme';

const coverCycle: CoverKey[] = ['default', 'tokyo', 'lisbon', 'kyoto', 'goldengai', 'sky', 'teamlab', 'ichiran'];

export default function CreateStep1() {
  const { draft, setDraft } = useCreateTrip();
  const [name, setName] = useState(draft.name);
  const [destination, setDestination] = useState(draft.destination);
  const [startDate, setStartDate] = useState(draft.startDate);
  const [endDate, setEndDate] = useState(draft.endDate);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  // Once the user manually cycles the cover we stop auto-matching it.
  const [coverTouched, setCoverTouched] = useState(
    () => draft.coverKey !== 'default' && !!draft.destination.trim() && draft.coverKey !== coverKeyForDestination(draft.destination),
  );

  // Keep the cover matched to the destination as it's typed or picked, unless
  // the user has chosen one themselves via "Change".
  useEffect(() => {
    const trimmed = destination.trim();
    if (coverTouched || !trimmed) return;
    const next = coverKeyForDestination(trimmed);
    if (next !== draft.coverKey) setDraft({ coverKey: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, coverTouched]);

  function cycleCover() {
    setCoverTouched(true);
    const currentIndex = coverCycle.indexOf(draft.coverKey);
    const next = coverCycle[(currentIndex + 1) % coverCycle.length];
    setDraft({ coverKey: next });
  }

  function handleSelectDestination(value: string) {
    setDestination(value);
    // Persist the picked destination; the effect above matches the cover.
    setDraft({ destination: value });
    const city = value.split(',')[0]?.trim();
    if (!name.trim() && city) setName(`${city} Trip`);
  }

  function handleConfirmDates(start: string, end: string) {
    setStartDate(start);
    setEndDate(end);
    setDraft({ startDate: start, endDate: end });
    setCalendarOpen(false);
  }

  function handleNext() {
    const trimmedDestination = destination.trim();
    // Free-typed destinations still get an auto cover unless the user picked one.
    const coverKey = draft.coverKey === 'default' && trimmedDestination ? coverKeyForDestination(trimmedDestination) : draft.coverKey;
    setDraft({ name: name.trim(), destination: trimmedDestination, startDate: startDate.trim(), endDate: endDate.trim(), coverKey });
    router.push('/create/step-2');
  }

  const canContinue = name.trim().length > 0 && destination.trim().length > 0 && startDate.trim().length > 0 && endDate.trim().length > 0;
  const dateLabel = startDate && endDate ? `${startDate}  ->  ${endDate}` : startDate || 'Select trip dates';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <StepHeader step={1} title="Where are you headed?" onBack={() => router.back()} onClose={() => router.dismissTo('/')} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Trip name" value={name} onChangeText={setName} placeholder="e.g. Tokyo Spring Trip" />

        <DestinationField
          label="Destination"
          value={destination}
          onChangeText={setDestination}
          onSelect={handleSelectDestination}
          placeholder="Start typing a city..."
        />

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Dates</Text>
          <Pressable style={styles.dateField} onPress={() => setCalendarOpen(true)}>
            <Ionicons name="calendar-outline" size={18} color={colors.ink2} />
            <Text style={[styles.dateText, !startDate && styles.datePlaceholder]}>{dateLabel}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.ink2} />
          </Pressable>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Cover photo</Text>
          <CoverImage coverKey={draft.coverKey} destination={destination} style={styles.cover}>
            <Pressable style={styles.changeButton} onPress={cycleCover}>
              <Text style={styles.changeButtonText}>Change</Text>
            </Pressable>
          </CoverImage>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Next · Invite people" onPress={handleNext} disabled={!canContinue} />
      </View>

      <DateRangeCalendar
        visible={isCalendarOpen}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setCalendarOpen(false)}
        onConfirm={handleConfirmDates}
      />
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} placeholder={placeholder} placeholderTextColor="#98A2B3" onChangeText={onChangeText} style={styles.fieldInput} />
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
    gap: 16,
  },
  fieldWrap: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink2,
  },
  fieldInput: {
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.ink,
  },
  dateField: {
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  datePlaceholder: {
    color: '#98A2B3',
    fontWeight: '400',
  },
  cover: {
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
  },
  changeButton: {
    backgroundColor: 'rgba(16,21,28,0.55)',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
