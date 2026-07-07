import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

function parseTime(value?: string): { hour: number; minute: number; meridiem: 'AM' | 'PM' } {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    return { hour: Number(match[1]), minute: Number(match[2]), meridiem: match[3].toUpperCase() as 'AM' | 'PM' };
  }
  return { hour: 10, minute: 0, meridiem: 'AM' };
}

function toDate(value?: string): Date {
  const { hour, minute, meridiem } = parseTime(value);
  const date = new Date();
  let h = hour % 12;
  if (meridiem === 'PM') h += 12;
  date.setHours(h, minute, 0, 0);
  return date;
}

function fromDate(date: Date): string {
  let hour = date.getHours();
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour %= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(date.getMinutes()).padStart(2, '0')} ${meridiem}`;
}

export function TimePicker({
  visible,
  value,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onConfirm: (time: string) => void;
}) {
  const [date, setDate] = useState<Date>(() => toDate(value));

  useEffect(() => {
    if (visible) setDate(toDate(value));
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close time picker" />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <Text style={styles.title}>Pick a time</Text>
            <Text style={styles.preview}>{fromDate(date)}</Text>
          </View>

          <DateTimePicker
            value={date}
            mode="time"
            display="spinner"
            themeVariant="dark"
            textColor={colors.ink}
            minuteInterval={5}
            onChange={(_event, selected) => {
              if (selected) setDate(selected);
            }}
            style={styles.picker}
          />

          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
            <PrimaryButton label="Set time" onPress={() => onConfirm(fromDate(date))} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.cream, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, ...shadows.float },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#39424E', alignSelf: 'center', marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  preview: { fontSize: 22, fontWeight: '800', color: colors.blue, fontVariant: ['tabular-nums'] },
  picker: { alignSelf: 'stretch', height: 190 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
