import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton } from '@/components';
import { LocationField } from '@/components/LocationField';
import { TimePicker } from '@/components/TimePicker';
import type { ItineraryItem, ItineraryKind, ItineraryStatus } from '@/data/itinerary';
import { getCityCenter, type LatLng } from '@/data/mapPlaces';
import { useItinerary } from '@/state/useItinerary';
import { useTrips } from '@/state/useTrips';
import { geocodeQuery } from '@/utils/geocode';
import { colors, radii, shadows, type } from '@/theme';

type ItemPayload = {
  day: number;
  time: string;
  title: string;
  location: string;
  kind: ItineraryKind;
  notes?: string;
  lat?: number;
  lng?: number;
};

const kindOptions: ItineraryKind[] = ['activity', 'food', 'transport', 'flight', 'stay', 'free'];

const kindMeta: Record<ItineraryKind, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  activity: { label: 'Activity', icon: 'sparkles-outline', bg: '#EEF3FF', fg: '#3563D9' },
  food: { label: 'Food', icon: 'restaurant-outline', bg: '#FFF0EA', fg: '#CE5A3C' },
  transport: { label: 'Transit', icon: 'train-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  flight: { label: 'Flight', icon: 'airplane-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  stay: { label: 'Stay', icon: 'bed-outline', bg: '#F0EBFA', fg: '#7455B0' },
  free: { label: 'Free', icon: 'sunny-outline', bg: '#EDF7EE', fg: '#3C8A50' },
};

const statusCopy: Record<ItineraryStatus, string> = { idea: 'Idea', planned: 'Planned', booked: 'Booked', done: 'Done' };

function nextStatus(status: ItineraryStatus): ItineraryStatus {
  if (status === 'idea') return 'planned';
  if (status === 'planned') return 'booked';
  if (status === 'booked') return 'done';
  return 'planned';
}

export default function PlanScreen() {
  const { activeTrip, isReady: tripsReady } = useTrips();
  const trip = activeTrip;
  const { items, days, addItem, updateItem, removeItem } = useItinerary(trip?.id);
  const [selectedDay, setSelectedDay] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItineraryItem | null>(null);

  // Start with the known-city center (instant), then geocode the trip's actual
  // destination so location search is biased to the *real* place - not the
  // Paris fallback that getCityCenter returns for unrecognized destinations.
  const [cityCenter, setCityCenter] = useState<LatLng>(() => getCityCenter(trip?.destination));
  useEffect(() => {
    const dest = trip?.destination;
    if (!dest) return;
    setCityCenter(getCityCenter(dest));
    let cancelled = false;
    geocodeQuery(dest).then((coord) => {
      if (coord && !cancelled) setCityCenter(coord);
    });
    return () => {
      cancelled = true;
    };
  }, [trip?.destination]);

  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const visibleItems = useMemo(() => items.filter((item) => item.day === activeDay), [items, activeDay]);
  const bookedCount = items.filter((item) => item.status === 'booked' || item.status === 'done').length;
  const maxDay = days.length ? Math.max(...days) : 1;

  function openAdd(day: number) {
    setEditing(null);
    setSelectedDay(day);
    setModalOpen(true);
  }

  function openEdit(item: ItineraryItem) {
    setEditing(item);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(payload: ItemPayload) {
    if (editing) {
      await updateItem(editing.id, payload);
    } else {
      await addItem(payload);
      setSelectedDay(payload.day);
    }
    closeModal();
  }

  if (!tripsReady) {
    return <Centered title="Loading itinerary" copy="Getting your locally saved trip plan ready." />;
  }

  if (!trip) {
    return <Centered title="Create a trip first" copy="Trips are stored locally. Create one, then your itinerary will live here." action="Create trip" />;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={type.eyebrow}>Live itinerary</Text>
            <Text style={styles.h1}>{trip.name}</Text>
            <Text style={type.sub}>
              {items.length} stops · {bookedCount} booked · {trip.members.length} travelers
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => openAdd(activeDay)} accessibilityLabel="Add itinerary item">
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((day) => (
            <Pressable key={day} style={[styles.dayChip, activeDay === day && styles.dayChipActive]} onPress={() => setSelectedDay(day)}>
              <Text style={[styles.dayChipText, activeDay === day && styles.dayChipTextActive]}>Day {day}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.dayAddChip} onPress={() => openAdd(maxDay + 1)}>
            <Ionicons name="add" size={15} color={colors.blue} />
            <Text style={styles.dayAddText}>Day</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.green} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Day {activeDay} is {visibleItems.length ? 'mapped out' : 'open'}</Text>
            <Text style={type.sub}>{visibleItems.length ? 'Tap a stop to edit it, or tap its status to move it forward.' : 'Add the first stop for this day.'}</Text>
          </View>
        </View>

        <View style={styles.timeline}>
          {visibleItems.map((item, index) => (
            <ItineraryCard
              key={item.id}
              item={item}
              isLast={index === visibleItems.length - 1}
              onEdit={() => openEdit(item)}
              onCycleStatus={() => updateItem(item.id, { status: nextStatus(item.status) })}
              onDelete={() => removeItem(item.id)}
            />
          ))}
        </View>

        {visibleItems.length === 0 ? (
          <Card padded style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No stops yet</Text>
            <Text style={type.body}>Search a place, pick a time, and it saves to this day — and shows up on the map.</Text>
            <PrimaryButton label="Add first stop" size="small" onPress={() => openAdd(activeDay)} />
          </Card>
        ) : null}
      </ScrollView>

      <ItemModal
        visible={modalOpen}
        day={editing ? editing.day : selectedDay}
        editing={editing}
        cityCenter={cityCenter}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onDelete={
          editing
            ? async () => {
                await removeItem(editing.id);
                closeModal();
              }
            : undefined
        }
      />
    </View>
  );
}

function Centered({ title, copy, action }: { title: string; copy: string; action?: string }) {
  return (
    <View style={styles.centered}>
      <Card padded style={styles.centeredCard}>
        <Text style={type.eyebrow}>Plan</Text>
        <Text style={styles.h1}>{title}</Text>
        <Text style={type.body}>{copy}</Text>
        {action ? <PrimaryButton label={action} onPress={() => router.push('/create/step-1')} /> : null}
      </Card>
    </View>
  );
}

function ItineraryCard({
  item,
  isLast,
  onEdit,
  onCycleStatus,
  onDelete,
}: {
  item: ItineraryItem;
  isLast: boolean;
  onEdit: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
}) {
  const meta = kindMeta[item.kind];

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeCol}>
        <Text style={styles.timeText}>{item.time}</Text>
        <View style={[styles.dot, { borderColor: meta.fg }]} />
        {!isLast ? <View style={styles.line} /> : null}
      </View>

      <Card padded onPress={onEdit} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={[styles.kindIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={18} color={meta.fg} />
          </View>
          <View style={styles.itemTitleWrap}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemLocation} numberOfLines={1}>
              {item.lat != null ? '📍 ' : ''}{item.location}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.ink2} />
        </View>

        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

        <View style={styles.itemFooter}>
          <View style={[styles.kindPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.kindPillText, { color: meta.fg }]}>{meta.label}</Text>
          </View>
          <View style={styles.footerActions}>
            <Pressable style={[styles.statusButton, item.status === 'done' && styles.statusDone]} onPress={onCycleStatus}>
              <Text style={[styles.statusButtonText, item.status === 'done' && styles.statusDoneText]}>{statusCopy[item.status]}</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityLabel={`Delete ${item.title}`}>
              <Ionicons name="trash-outline" size={17} color={colors.ink2} />
            </Pressable>
          </View>
        </View>
      </Card>
    </View>
  );
}

function ItemModal({
  visible,
  day,
  editing,
  cityCenter,
  onClose,
  onSubmit,
  onDelete,
}: {
  visible: boolean;
  day: number;
  editing: ItineraryItem | null;
  cityCenter: LatLng;
  onClose: () => void;
  onSubmit: (payload: ItemPayload) => void | Promise<void>;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('10:00 AM');
  const [location, setLocation] = useState('');
  const [coord, setCoord] = useState<LatLng | null>(null);
  const [notes, setNotes] = useState('');
  const [kind, setKind] = useState<ItineraryKind>('activity');
  const [timeOpen, setTimeOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTitle(editing.title);
      setTime(editing.time);
      setLocation(editing.location);
      setCoord(editing.lat != null && editing.lng != null ? { lat: editing.lat, lng: editing.lng } : null);
      setNotes(editing.notes ?? '');
      setKind(editing.kind);
    } else {
      setTitle('');
      setTime('10:00 AM');
      setLocation('');
      setCoord(null);
      setNotes('');
      setKind('activity');
    }
  }, [visible, editing]);

  const canSave = title.trim().length > 0 && time.trim().length > 0 && location.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    await onSubmit({
      day,
      time: time.trim(),
      title: title.trim(),
      location: location.trim(),
      kind,
      notes: notes.trim() || undefined,
      lat: coord?.lat,
      lng: coord?.lng,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <Pressable style={styles.modalVeil} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={type.eyebrow}>Day {day}</Text>
            <Text style={styles.sheetTitle}>{editing ? 'Edit stop' : 'Add itinerary stop'}</Text>

            <View style={styles.kindRow}>
              {kindOptions.map((option) => {
                const meta = kindMeta[option];
                const selected = kind === option;
                return (
                  <Pressable key={option} style={[styles.kindOption, selected && { backgroundColor: meta.bg, borderColor: meta.fg }]} onPress={() => setKind(option)}>
                    <Ionicons name={meta.icon} size={16} color={selected ? meta.fg : colors.ink2} />
                    <Text style={[styles.kindOptionText, selected && { color: meta.fg }]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Sushi lunch" />

            <LocationField
              label="Location"
              value={location}
              center={cityCenter}
              placeholder="Search a place or address"
              onChangeText={(text) => {
                setLocation(text);
                setCoord(null);
              }}
              onSelect={(place) => {
                setLocation(place.label ? `${place.name}` : place.name);
                setCoord({ lat: place.lat, lng: place.lng });
                if (!title.trim()) setTitle(place.name);
              }}
            />

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Time</Text>
              <Pressable style={styles.timeField} onPress={() => setTimeOpen(true)}>
                <Ionicons name="time-outline" size={18} color={colors.ink2} />
                <Text style={styles.timeText2}>{time}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink2} />
              </Pressable>
            </View>

            <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional details" multiline />

            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
              <PrimaryButton label={editing ? 'Save' : 'Add stop'} onPress={handleSave} disabled={!canSave} />
            </View>

            {editing && onDelete ? (
              <Pressable style={styles.deleteRow} onPress={onDelete}>
                <Ionicons name="trash-outline" size={17} color={colors.coral} />
                <Text style={styles.deleteRowText}>Delete this stop</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <TimePicker visible={timeOpen} value={time} onClose={() => setTimeOpen(false)} onConfirm={(next) => { setTime(next); setTimeOpen(false); }} />
    </Modal>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#A6A296"
        onChangeText={onChangeText}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 112 },
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 112 },
  centeredCard: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16 },
  headerCopy: { flex: 1 },
  h1: { marginTop: 4, fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.ink },
  addButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  dayRow: { gap: 8, paddingVertical: 2, paddingRight: 20, marginBottom: 14 },
  dayChip: { height: 36, paddingHorizontal: 15, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: colors.btn, borderColor: colors.btn },
  dayChipText: { fontSize: 13.5, fontWeight: '700', color: colors.ink2 },
  dayChipTextActive: { color: '#FFFFFF' },
  dayAddChip: { height: 36, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: '#EEF3FF', flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' },
  dayAddText: { fontSize: 13.5, fontWeight: '800', color: colors.blue },
  summaryCard: { minHeight: 78, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.card },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#E7F9F0', alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  timeline: { marginTop: 18 },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch' },
  timeCol: { width: 58, alignItems: 'center' },
  timeText: { alignSelf: 'flex-start', fontSize: 11.5, fontWeight: '800', color: colors.ink2, fontVariant: ['tabular-nums'], marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, backgroundColor: colors.card },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4, marginBottom: 4 },
  itemCard: { flex: 1, marginBottom: 12, gap: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  kindIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemTitleWrap: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  itemLocation: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  notes: { fontSize: 13.5, lineHeight: 20, color: colors.ink2 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindPill: { height: 28, paddingHorizontal: 11, borderRadius: radii.pill, justifyContent: 'center' },
  kindPillText: { fontSize: 12, fontWeight: '800' },
  statusButton: { height: 32, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: '#F3F1EA', justifyContent: 'center' },
  statusDone: { backgroundColor: '#E7F9F0' },
  statusButtonText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  statusDoneText: { color: '#178A5B' },
  deleteButton: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1EA' },
  emptyCard: { gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,21,28,0.34)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.cream, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, ...shadows.float },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#D8D4C9', alignSelf: 'center', marginBottom: 8 },
  sheetContent: { gap: 12, paddingBottom: 8 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindOption: { height: 36, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindOptionText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  input: { minHeight: 50, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 15, fontSize: 15, color: colors.ink },
  inputMultiline: { minHeight: 76, paddingTop: 13, textAlignVertical: 'top' },
  timeField: { minHeight: 50, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText2: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  modalActions: { flexDirection: 'row', gap: 10, paddingTop: 2 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  deleteRowText: { fontSize: 14, fontWeight: '800', color: colors.coral },
});
