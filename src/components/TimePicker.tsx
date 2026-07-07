import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parseTime(value?: string): { hour: number; minute: number; meridiem: 'AM' | 'PM' } {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    return { hour: Number(match[1]), minute: Number(match[2]), meridiem: match[3].toUpperCase() as 'AM' | 'PM' };
  }
  return { hour: 10, minute: 0, meridiem: 'AM' };
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
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (!visible) return;
    const parsed = parseTime(value);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setMeridiem(parsed.meridiem);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close time picker" />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title}>Pick a time</Text>
          <Text style={styles.preview}>{hour}:{String(minute).padStart(2, '0')} {meridiem}</Text>

          <Text style={styles.groupLabel}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {HOURS.map((h) => (
              <Pressable key={h} style={[styles.chip, hour === h && styles.chipActive]} onPress={() => setHour(h)}>
                <Text style={[styles.chipText, hour === h && styles.chipTextActive]}>{h}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.groupLabel}>Minute</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {MINUTES.map((m) => (
              <Pressable key={m} style={[styles.chip, minute === m && styles.chipActive]} onPress={() => setMinute(m)}>
                <Text style={[styles.chipText, minute === m && styles.chipTextActive]}>{String(m).padStart(2, '0')}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.meridiemRow}>
            {(['AM', 'PM'] as const).map((m) => (
              <Pressable key={m} style={[styles.meridiemButton, meridiem === m && styles.chipActive]} onPress={() => setMeridiem(m)}>
                <Text style={[styles.chipText, meridiem === m && styles.chipTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
            <PrimaryButton label="Set time" onPress={() => onConfirm(`${hour}:${String(minute).padStart(2, '0')} ${meridiem}`)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.cream, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 10, ...shadows.float },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#39424E', alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  preview: { fontSize: 28, fontWeight: '800', color: colors.blue, fontVariant: ['tabular-nums'] },
  groupLabel: { fontSize: 13, fontWeight: '800', color: colors.ink2, marginTop: 6 },
  row: { gap: 8, paddingRight: 8 },
  chip: { minWidth: 46, height: 42, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.btn, borderColor: colors.btn },
  chipText: { fontSize: 15, fontWeight: '800', color: colors.ink2 },
  chipTextActive: { color: '#FFFFFF' },
  meridiemRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  meridiemButton: { flex: 1, height: 46, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
