import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CoverImage, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
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

  function cycleCover() {
    const currentIndex = coverCycle.indexOf(draft.coverKey);
    const next = coverCycle[(currentIndex + 1) % coverCycle.length];
    setDraft({ coverKey: next });
  }

  function handleNext() {
    setDraft({ name: name.trim(), destination: destination.trim(), startDate: startDate.trim(), endDate: endDate.trim() });
    router.push('/create/step-2');
  }

  const canContinue = name.trim().length > 0 && destination.trim().length > 0 && startDate.trim().length > 0 && endDate.trim().length > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <StepHeader step={1} title="Where are you headed?" onBack={() => router.back()} onClose={() => router.dismissTo('/')} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Trip name" value={name} onChangeText={setName} placeholder="e.g. Tokyo Spring Trip" />
        <Field label="Destination" value={destination} onChangeText={setDestination} placeholder="e.g. Tokyo, Japan" />
        <View style={styles.row}>
          <View style={styles.half}>
            <Field label="Start" value={startDate} onChangeText={setStartDate} placeholder="May 12, 2026" />
          </View>
          <View style={styles.half}>
            <Field label="End" value={endDate} onChangeText={setEndDate} placeholder="May 18, 2026" />
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Cover photo</Text>
          <CoverImage coverKey={draft.coverKey} style={styles.cover}>
            <Pressable style={styles.changeButton} onPress={cycleCover}>
              <Text style={styles.changeButtonText}>Change</Text>
            </Pressable>
          </CoverImage>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Next · Invite people" onPress={handleNext} disabled={!canContinue} />
      </View>
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
      <TextInput value={value} placeholder={placeholder} placeholderTextColor="#A6A296" onChangeText={onChangeText} style={styles.fieldInput} />
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
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
