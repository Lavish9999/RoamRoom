import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { Trip } from '@/data/types';
import { colors, radii, type } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

export type TripEditFields = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
};

export function EditTripModal({
  trip,
  visible,
  onClose,
  onSave,
}: {
  trip: Trip | null;
  visible: boolean;
  onClose: () => void;
  onSave: (fields: TripEditFields) => void;
}) {
  const [fields, setFields] = useState<TripEditFields>({ name: '', destination: '', startDate: '', endDate: '' });

  useEffect(() => {
    if (trip) {
      setFields({ name: trip.name, destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate });
    }
  }, [trip]);

  function setField(field: keyof TripEditFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardWrap}>
          <View style={styles.header}>
            <View>
              <Text style={type.eyebrow}>Edit trip</Text>
              <Text style={styles.title}>Update the room</Text>
            </View>
            <Pressable style={styles.iconButton} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Field label="Trip name" value={fields.name} onChangeText={(v) => setField('name', v)} placeholder="e.g. Tokyo Spring Trip" />
            <Field label="Destination" value={fields.destination} onChangeText={(v) => setField('destination', v)} placeholder="e.g. Tokyo, Japan" />
            <Field label="Start date" value={fields.startDate} onChangeText={(v) => setField('startDate', v)} placeholder="e.g. May 12, 2026" />
            <Field label="End date" value={fields.endDate} onChangeText={(v) => setField('endDate', v)} placeholder="e.g. May 18, 2026" />
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Save changes" onPress={() => onSave(fields)} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        onChangeText={onChangeText}
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    marginTop: 3,
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    paddingHorizontal: 20,
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
