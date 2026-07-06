import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Card, PrimaryButton } from '@/components';
import type { ItineraryKind } from '@/data/itinerary';
import type { MapPlace, MapPlaceStatus } from '@/data/mapPlaces';
import { useMapPlaces } from '@/state/useMapPlaces';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';

type Filter = 'all' | 'planned' | 'booked' | 'ideas';

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'planned', label: 'Planned' },
  { id: 'booked', label: 'Booked' },
  { id: 'ideas', label: 'Ideas' },
];

const kindOptions: ItineraryKind[] = ['activity', 'food', 'transport', 'flight', 'stay', 'free'];

const kindMeta: Record<ItineraryKind, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  activity: { label: 'Activity', icon: 'sparkles-outline', bg: '#EEF3FF', fg: '#3563D9' },
  food: { label: 'Food', icon: 'restaurant-outline', bg: '#FFF0EA', fg: '#CE5A3C' },
  transport: { label: 'Transit', icon: 'train-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  flight: { label: 'Flight', icon: 'airplane-outline', bg: '#E9F0F4', fg: '#3E5C76' },
  stay: { label: 'Stay', icon: 'bed-outline', bg: '#F0EBFA', fg: '#7455B0' },
  free: { label: 'Free', icon: 'sunny-outline', bg: '#EDF7EE', fg: '#3C8A50' },
};

const statusCopy: Record<MapPlaceStatus, string> = { idea: 'Idea', planned: 'Planned', booked: 'Booked', visited: 'Visited' };

function nextStatus(status: MapPlaceStatus): MapPlaceStatus {
  if (status === 'idea') return 'planned';
  if (status === 'planned') return 'booked';
  if (status === 'booked') return 'visited';
  return 'planned';
}

function matchesFilter(place: MapPlace, filter: Filter) {
  if (filter === 'all') return true;
  if (filter === 'ideas') return place.status === 'idea';
  return place.status === filter;
}

export default function MapScreen() {
  const { trips, isReady: tripsReady } = useTrips();
  const trip = trips[0];
  const { places, addPlace, updatePlace, removePlace } = useMapPlaces(trip?.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const visiblePlaces = useMemo(() => places.filter((place) => matchesFilter(place, filter)), [places, filter]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedId) ?? visiblePlaces[0];
  const bookedCount = places.filter((place) => place.status === 'booked' || place.status === 'visited').length;
  const ideaCount = places.filter((place) => place.status === 'idea').length;

  useEffect(() => {
    if (visiblePlaces.length && !visiblePlaces.some((place) => place.id === selectedId)) {
      setSelectedId(visiblePlaces[0].id);
    }
  }, [selectedId, visiblePlaces]);

  if (!tripsReady) {
    return <Centered title="Loading map" copy="Getting your saved places ready." />;
  }

  if (!trip) {
    return <Centered title="Create a trip first" copy="Create a trip, then your saved places and route pins will live here." action="Create trip" />;
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={type.eyebrow}>Trip map</Text>
            <Text style={styles.h1}>{trip.destination}</Text>
            <Text style={type.sub}>{places.length} places - {bookedCount} locked - {ideaCount} ideas</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setIsAdding(true)} accessibilityLabel="Add map place">
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          <MapCanvas places={visiblePlaces} selectedId={selectedPlace?.id} onSelect={setSelectedId} />
          {selectedPlace ? <SelectedPlaceCard place={selectedPlace} onOpenMaps={() => openInMaps(selectedPlace)} /> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((item) => (
            <Pressable key={item.id} style={[styles.filterChip, filter === item.id && styles.filterChipActive]} onPress={() => setFilter(item.id)}>
              <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.summaryGrid}>
          <StatCard icon="location-outline" label="Places" value={`${places.length}`} />
          <StatCard icon="checkmark-circle-outline" label="Locked" value={`${bookedCount}`} />
          <StatCard icon="bulb-outline" label="Ideas" value={`${ideaCount}`} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Places</Text>
          <Text style={type.cap}>Tap a row to focus</Text>
        </View>

        <View style={styles.placeList}>
          {visiblePlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              selected={selectedPlace?.id === place.id}
              onSelect={() => setSelectedId(place.id)}
              onOpenMaps={() => openInMaps(place)}
              onCycleStatus={() => updatePlace(place.id, { status: nextStatus(place.status) })}
              onDelete={() => removePlace(place.id)}
            />
          ))}
        </View>

        {visiblePlaces.length === 0 ? (
          <Card padded style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No places here</Text>
            <Text style={type.body}>Change the filter or add a saved place to the trip map.</Text>
            <PrimaryButton label="Add place" size="small" onPress={() => setIsAdding(true)} />
          </Card>
        ) : null}
      </ScrollView>

      <AddPlaceModal
        visible={isAdding}
        onClose={() => setIsAdding(false)}
        onAdd={async (place) => {
          await addPlace(place);
          setIsAdding(false);
        }}
      />
    </View>
  );
}

function Centered({ title, copy, action }: { title: string; copy: string; action?: string }) {
  return (
    <View style={styles.centered}>
      <Card padded style={styles.centeredCard}>
        <Text style={type.eyebrow}>Map</Text>
        <Text style={styles.h1}>{title}</Text>
        <Text style={type.body}>{copy}</Text>
        {action ? <PrimaryButton label={action} onPress={() => router.push('/create/step-1')} /> : null}
      </Card>
    </View>
  );
}

function MapCanvas({ places, selectedId, onSelect }: { places: MapPlace[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <View style={styles.mapCanvas}>
      <Svg width="100%" height="100%" viewBox="0 0 320 250" style={StyleSheet.absoluteFill}>
        <Rect x="0" y="0" width="320" height="250" rx="28" fill={colors.water} />
        <Path d="M18 162 C58 118 66 70 116 48 C164 26 208 44 238 78 C272 116 288 165 307 231 L0 250 L0 185 Z" fill={colors.land} />
        <Path d="M32 46 C83 34 112 52 135 84 C160 120 194 128 234 116 C268 105 294 118 315 144 L315 0 L32 0 Z" fill={colors.park} opacity="0.7" />
        <Path d="M52 188 C95 151 119 126 163 121 C206 116 235 86 282 58" stroke="#FFFFFF" strokeWidth="16" strokeLinecap="round" opacity="0.72" />
        <Path d="M52 188 C95 151 119 126 163 121 C206 116 235 86 282 58" stroke={colors.blue} strokeWidth="3" strokeLinecap="round" strokeDasharray="7 8" opacity="0.9" />
        <Circle cx="64" cy="182" r="18" fill="#FFFFFF" opacity="0.58" />
        <Circle cx="245" cy="76" r="20" fill="#FFFFFF" opacity="0.54" />
      </Svg>

      {places.map((place) => {
        const meta = kindMeta[place.kind];
        const selected = place.id === selectedId;
        return (
          <Pressable
            key={place.id}
            style={[styles.pin, { left: `${place.x}%`, top: `${place.y}%`, backgroundColor: meta.fg }, selected && styles.pinActive]}
            onPress={() => onSelect(place.id)}
            accessibilityLabel={`Select ${place.title}`}
          >
            <Ionicons name={meta.icon} size={selected ? 18 : 15} color="#FFFFFF" />
          </Pressable>
        );
      })}
    </View>
  );
}

function SelectedPlaceCard({ place, onOpenMaps }: { place: MapPlace; onOpenMaps: () => void }) {
  const meta = kindMeta[place.kind];
  return (
    <View style={styles.selectedCard}>
      <View style={[styles.selectedIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.fg} />
      </View>
      <View style={styles.selectedCopy}>
        <Text style={styles.selectedTitle}>{place.title}</Text>
        <Text style={styles.selectedMeta}>{place.area}{place.day ? ` - Day ${place.day}` : ''}</Text>
      </View>
      <Pressable style={styles.miniButton} onPress={onOpenMaps} accessibilityLabel={`Open ${place.title} in maps`}>
        <Ionicons name="navigate-outline" size={17} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={17} color={colors.ink2} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PlaceCard({
  place,
  selected,
  onSelect,
  onOpenMaps,
  onCycleStatus,
  onDelete,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: () => void;
  onOpenMaps: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
}) {
  const meta = kindMeta[place.kind];

  return (
    <Card padded selected={selected} style={styles.placeCard} onPress={onSelect}>
      <View style={styles.placeHeader}>
        <View style={[styles.placeIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.fg} />
        </View>
        <View style={styles.placeTitleWrap}>
          <Text style={styles.placeTitle}>{place.title}</Text>
          <Text style={styles.placeMeta}>{place.area}{place.time ? ` - ${place.time}` : ''}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={onOpenMaps} accessibilityLabel={`Open ${place.title} in maps`}>
          <Ionicons name="navigate-outline" size={17} color={colors.ink2} />
        </Pressable>
      </View>

      {place.note ? <Text style={styles.note}>{place.note}</Text> : null}

      <View style={styles.placeFooter}>
        <View style={[styles.kindPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.kindPillText, { color: meta.fg }]}>{meta.label}</Text>
        </View>
        <View style={styles.footerActions}>
          <Pressable style={[styles.statusButton, place.status === 'visited' && styles.statusDone]} onPress={onCycleStatus}>
            <Text style={[styles.statusButtonText, place.status === 'visited' && styles.statusDoneText]}>{statusCopy[place.status]}</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityLabel={`Delete ${place.title}`}>
            <Ionicons name="trash-outline" size={17} color={colors.ink2} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

function AddPlaceModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (place: { title: string; area: string; day?: number; time?: string; kind: ItineraryKind; status: MapPlaceStatus; note?: string }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<ItineraryKind>('activity');
  const canAdd = title.trim().length > 0 && area.trim().length > 0;

  async function handleAdd() {
    if (!canAdd) return;
    const parsedDay = Number.parseInt(day.trim(), 10);
    await onAdd({
      title: title.trim(),
      area: area.trim(),
      day: Number.isFinite(parsedDay) ? parsedDay : undefined,
      time: time.trim() || undefined,
      kind,
      status: 'idea',
      note: note.trim() || undefined,
    });
    setTitle('');
    setArea('');
    setDay('');
    setTime('');
    setNote('');
    setKind('activity');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalVeil} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={type.eyebrow}>Saved place</Text>
            <Text style={styles.sheetTitle}>Add place</Text>

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

            <Field label="Place" value={title} onChangeText={setTitle} placeholder="e.g. Tsukiji Outer Market" />
            <Field label="Area" value={area} onChangeText={setArea} placeholder="Neighborhood or city" />
            <View style={styles.twoCol}>
              <Field label="Day" value={day} onChangeText={setDay} placeholder="3" keyboardType="number-pad" />
              <Field label="Time" value={time} onChangeText={setTime} placeholder="10:00 AM" />
            </View>
            <Field label="Note" value={note} onChangeText={setNote} placeholder="Why save this?" multiline />

            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
              <PrimaryButton label="Add place" onPress={handleAdd} disabled={!canAdd} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
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
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function openInMaps(place: MapPlace) {
  const query = encodeURIComponent(`${place.title} ${place.area}`);
  void Linking.openURL(`https://maps.apple.com/?q=${query}`);
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
  mapCard: { minHeight: 330, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.water, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  mapCanvas: { height: 250, position: 'relative', overflow: 'hidden' },
  pin: { position: 'absolute', width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', ...shadows.pin },
  pinActive: { width: 42, height: 42, marginLeft: -21, marginTop: -21, borderRadius: 21, borderWidth: 4, zIndex: 2 },
  selectedCard: { minHeight: 78, margin: 12, marginTop: -4, borderRadius: 22, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.card },
  selectedIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  selectedCopy: { flex: 1 },
  selectedTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  selectedMeta: { marginTop: 2, fontSize: 13, color: colors.ink2 },
  miniButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F3F1EA', alignItems: 'center', justifyContent: 'center' },
  filterRow: { gap: 8, paddingVertical: 16, paddingRight: 20 },
  filterChip: { height: 36, paddingHorizontal: 15, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.btn, borderColor: colors.btn },
  filterText: { fontSize: 13.5, fontWeight: '800', color: colors.ink2 },
  filterTextActive: { color: '#FFFFFF' },
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minHeight: 84, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, padding: 13, ...shadows.card },
  statValue: { marginTop: 8, fontSize: 21, fontWeight: '800', color: colors.ink },
  statLabel: { marginTop: 1, fontSize: 12, fontWeight: '800', color: colors.ink2 },
  sectionHeader: { marginTop: 2, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  placeList: { gap: 12 },
  placeCard: { gap: 12 },
  placeHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  placeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  placeTitleWrap: { flex: 1 },
  placeTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  placeMeta: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  iconButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1EA' },
  note: { fontSize: 13.5, lineHeight: 20, color: colors.ink2 },
  placeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindPill: { height: 28, paddingHorizontal: 11, borderRadius: radii.pill, justifyContent: 'center' },
  kindPillText: { fontSize: 12, fontWeight: '800' },
  statusButton: { height: 32, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: '#F3F1EA', justifyContent: 'center' },
  statusDone: { backgroundColor: '#E7F9F0' },
  statusButtonText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  statusDoneText: { color: '#178A5B' },
  deleteButton: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1EA' },
  emptyCard: { marginTop: 12, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,21,28,0.34)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.cream, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, ...shadows.float },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#D8D4C9', alignSelf: 'center', marginBottom: 8 },
  sheetContent: { gap: 12, paddingBottom: 4 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindOption: { height: 36, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindOptionText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  twoCol: { flexDirection: 'row', gap: 10 },
  fieldWrap: { flex: 1, gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  input: { minHeight: 50, borderRadius: 15, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 15, fontSize: 15, color: colors.ink },
  inputMultiline: { minHeight: 76, paddingTop: 13, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, paddingTop: 2 },
});
