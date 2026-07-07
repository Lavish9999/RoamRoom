import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getTime() === b.getTime();
}

function buildMonth(view: Date): (Date | null)[] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateRangeCalendar({
  visible,
  startDate,
  endDate,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  startDate?: string;
  endDate?: string;
  onClose: () => void;
  onConfirm: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [view, setView] = useState<Date>(() => startOfDay(new Date()));

  useEffect(() => {
    if (!visible) return;
    const initialStart = parseDate(startDate);
    const initialEnd = parseDate(endDate);
    setStart(initialStart);
    setEnd(initialEnd);
    setView(initialStart ? new Date(initialStart.getFullYear(), initialStart.getMonth(), 1) : startOfDay(new Date()));
  }, [visible, startDate, endDate]);

  const cells = useMemo(() => buildMonth(view), [view]);
  const today = startOfDay(new Date());

  function handlePick(day: Date) {
    // First pick (or restart) sets the start; second pick sets the end. Picking
    // an earlier day than the current start restarts the range from there.
    if (!start || (start && end)) {
      setStart(day);
      setEnd(null);
      return;
    }
    if (day.getTime() < start.getTime()) {
      setStart(day);
      return;
    }
    setEnd(day);
  }

  function shiftMonth(delta: number) {
    setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function inRange(day: Date) {
    if (!start || !end) return false;
    return day.getTime() > start.getTime() && day.getTime() < end.getTime();
  }

  const rangeLabel = start ? `${formatDate(start)}${end ? `  ->  ${formatDate(end)}` : '  ->  pick end date'}` : 'Pick your start date';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close calendar" />

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Trip dates</Text>
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>

          <View style={styles.monthRow}>
            <Pressable style={styles.navButton} onPress={() => shiftMonth(-1)} accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </Pressable>
            <Text style={styles.monthTitle}>{MONTHS[view.getMonth()]} {view.getFullYear()}</Text>
            <Pressable style={styles.navButton} onPress={() => shiftMonth(1)} accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.cell} />;
              const isStart = sameDay(day, start);
              const isEnd = sameDay(day, end);
              const isEdge = isStart || isEnd;
              const between = inRange(day);
              const isToday = sameDay(day, today);
              return (
                <Pressable key={day.toISOString()} style={styles.cell} onPress={() => handlePick(day)}>
                  <View style={[styles.dayInner, between && styles.dayBetween, isEdge && styles.dayEdge]}>
                    <Text style={[styles.dayText, between && styles.dayBetweenText, isEdge && styles.dayEdgeText, isToday && !isEdge && styles.dayToday]}>
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
            <PrimaryButton
              label="Set dates"
              disabled={!start}
              onPress={() => {
                if (!start) return;
                const finalEnd = end ?? start;
                onConfirm(formatDate(start), formatDate(finalEnd));
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 380, borderRadius: 28, backgroundColor: 'rgba(27,34,44,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 18, gap: 12, ...shadows.float },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.ink2 },
  rangeLabel: { fontSize: 17, fontWeight: '800', color: colors.ink },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  navButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  weekdayRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.ink2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayInner: { width: '100%', height: '100%', borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  dayBetween: { backgroundColor: '#182B45', borderRadius: 8 },
  dayEdge: { backgroundColor: colors.btn },
  dayText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  dayBetweenText: { color: colors.blue },
  dayEdgeText: { color: '#FFFFFF', fontWeight: '800' },
  dayToday: { color: colors.blue, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
