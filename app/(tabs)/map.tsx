import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Card, PrimaryButton } from '@/components';
import type { ItineraryKind } from '@/data/itinerary';
import type { MapPlace, MapPlaceStatus } from '@/data/mapPlaces';
import { useMapPlaces } from '@/state/useMapPlaces';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';

type StatusFilter = 'all' | 'planned' | 'booked' | 'ideas';
type DayFilter = 'all' | 'unscheduled' | number;

const statusFilters: { id: StatusFilter; label: string }[] = [
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

function matchesStatus(place: MapPlace, filter: StatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'ideas') return place.status === 'idea';
  return place.status === filter;
}

function matchesDay(place: MapPlace, day: DayFilter) {
  if (day === 'all') return true;
  if (day === 'unscheduled') return !place.day;
  return place.day === day;
}

function sortRoutePlaces(places: MapPlace[]) {
  return [...places].sort((a, b) => {
    const dayA = a.day ?? 99;
    const dayB = b.day ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    return a.title.localeCompare(b.title);
  });
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function dayLabel(day: DayFilter) {
  if (day === 'all') return 'All days';
  if (day === 'unscheduled') return 'Unscheduled';
  return `Day ${day}`;
}

export default function MapScreen() {
  const { trips, isReady: tripsReady } = useTrips();
  const trip = trips[0];
  const { places, addPlace, updatePlace, removePlace } = useMapPlaces(trip?.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const dayOptions = useMemo(() => {
    const days = Array.from(new Set(places.flatMap((place) => (place.day ? [place.day] : [])))).sort((a, b) => a - b);
    return ['all' as const, ...days, 'unscheduled' as const];
  }, [places]);

  const visiblePlaces = useMemo(
    () => places.filter((place) => matchesStatus(place, statusFilter) && matchesDay(place, dayFilter)),
    [dayFilter, places, statusFilter],
  );
  const routePlaces = useMemo(() => sortRoutePlaces(visiblePlaces.filter((place) => place.status !== 'idea')), [visiblePlaces]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedId) ?? visiblePlaces[0];
  const bookedCount = places.filter((place) => place.status === 'booked' || place.status === 'visited').length;
  const ideaCount = places.filter((place) => place.status === 'idea').length;
  const routeMinutes = Math.max(routePlaces.length - 1, 0) * 18 + routePlaces.length * 30;
  const areaGroups = useMemo(() => getAreaGroups(visiblePlaces), [visiblePlaces]);

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
          <MapCanvas places={visiblePlaces} routePlaces={routePlaces} selectedId={selectedPlace?.id} onSelect={setSelectedId} />
          {selectedPlace ? <SelectedPlaceCard place={selectedPlace} onOpenMaps={() => openInMaps(selectedPlace)} /> : null}
        </View>

        <RoutePlannerCard day={dayFilter} routePlaces={routePlaces} routeMinutes={routeMinutes} onOpenRoute={() => openRouteInMaps(routePlaces)} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {dayOptions.map((item) => (
            <Pressable key={String(item)} style={[styles.filterChip, dayFilter === item && styles.filterChipActive]} onPress={() => setDayFilter(item)}>
              <Text style={[styles.filterText, dayFilter === item && styles.filterTextActive]}>{dayLabel(item)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowTight}>
          {statusFilters.map((item) => (
            <Pressable key={item.id} style={[styles.filterChip, statusFilter === item.id && styles.filterChipActive]} onPress={() => setStatusFilter(item.id)}>
              <Text style={[styles.filterText, statusFilter === item.id && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.summaryGrid}>
          <StatCard icon="location-outline" label="Places" value={`${visiblePlaces.length}`} />
          <StatCard icon="map-outline" label="Route" value={routePlaces.length ? formatDuration(routeMinutes) : 'Open'} />
          <StatCard icon="bulb-outline" label="Ideas" value={`${ideaCount}`} />
        </View>

        {areaGroups.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Area stacks</Text>
              <Text style={type.cap}>Nearby clusters</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaRow}>
              {areaGroups.map((area) => (
                <Pressable key={area.name} style={styles.areaCard} onPress={() => setSelectedId(area.firstPlaceId)}>
                  <Text style={styles.areaCount}>{area.count}</Text>
                  <Text style={styles.areaName}>{area.name}</Text>
                  <Text style={styles.areaMeta}>{area.bookedCount} locked</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

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

function MapCanvas({
  places,
  routePlaces,
  selectedId,
  onSelect,
}: {
  places: MapPlace[];
  routePlaces: MapPlace[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const routePath = buildRoutePath(routePlaces);

  return (
    <View style={styles.mapCanvas}>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 320 250" style={StyleSheet.absoluteFill}>
        <Rect x="0" y="0" width="320" height="250" rx="30" fill="#F7F3EA" />
        <Path d="M250 0 H320 V250 H231 C247 222 253 195 248 170 C241 139 246 111 267 86 C286 63 285 30 250 0 Z" fill="#DCEFF6" />
        <Path d="M0 202 C43 191 82 197 123 215 C164 233 211 229 252 207 L252 250 H0 Z" fill="#E2F2F6" opacity="0.92" />
        <Path d="M18 20 H100 V72 H18 Z" fill="#E4EEDB" opacity="0.74" />
        <Path d="M122 28 H209 V92 H122 Z" fill="#FDFBF6" opacity="0.82" />
        <Path d="M26 90 H108 V150 H26 Z" fill="#FDFBF6" opacity="0.86" />
        <Path d="M126 106 H220 V170 H126 Z" fill="#FDFBF6" opacity="0.82" />
        <Path d="M34 166 H116 V222 H34 Z" fill="#FDFBF6" opacity="0.74" />
        <Path d="M30 58 H236" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity="0.82" />
        <Path d="M18 118 H244" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity="0.82" />
        <Path d="M54 0 V236" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity="0.68" />
        <Path d="M112 0 V238" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" opacity="0.58" />
        <Path d="M178 14 V226" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity="0.72" />
        <Path d="M226 38 C205 70 198 96 205 119 C214 151 201 183 164 217" stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" opacity="0.78" />
        <Path d="M6 168 C40 154 72 151 105 159 C140 168 177 162 219 139 C237 129 253 126 272 130" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity="0.72" />
        <Path d="M30 58 H236" stroke="#DED8CC" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <Path d="M18 118 H244" stroke="#DED8CC" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <Path d="M54 0 V236" stroke="#DED8CC" strokeWidth="1.3" strokeLinecap="round" opacity="0.58" />
        <Path d="M112 0 V238" stroke="#DED8CC" strokeWidth="1.2" strokeLinecap="round" opacity="0.48" />
        <Path d="M178 14 V226" stroke="#DED8CC" strokeWidth="1.3" strokeLinecap="round" opacity="0.58" />
        <Path d="M226 38 C205 70 198 96 205 119 C214 151 201 183 164 217" stroke="#DED8CC" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <Path d="M19 178 C47 155 76 141 109 135 C142 129 177 108 217 72" stroke="#6D8FEF" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" opacity="0.78" />
        <Path d="M19 178 C47 155 76 141 109 135 C142 129 177 108 217 72" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="8 8" opacity="0.72" />
        {routePath ? <Path d={routePath} stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.86" /> : null}
        {routePath ? <Path d={routePath} stroke="#3158D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 7" opacity="0.84" /> : null}
        <Circle cx="54" cy="58" r="4" fill="#FFFFFF" opacity="0.92" />
        <Circle cx="178" cy="118" r="4" fill="#FFFFFF" opacity="0.92" />
        <Circle cx="226" cy="70" r="4" fill="#FFFFFF" opacity="0.92" />
        <SvgText x="28" y="42" fill="#8E958F" fontSize="8" fontWeight="700">Shinjuku</SvgText>
        <SvgText x="132" y="78" fill="#8E958F" fontSize="8" fontWeight="700">Ueno</SvgText>
        <SvgText x="34" y="142" fill="#8E958F" fontSize="8" fontWeight="700">Shibuya</SvgText>
        <SvgText x="134" y="154" fill="#8E958F" fontSize="8" fontWeight="700">Ginza</SvgText>
        <SvgText x="257" y="206" fill="#7F99A5" fontSize="8" fontWeight="700">Tokyo Bay</SvgText>
      </Svg>

      <View pointerEvents="none" style={styles.mapHint}>
        <Ionicons name="hand-left-outline" size={13} color={colors.ink2} />
        <Text style={styles.mapHintText}>Tap a pin</Text>
      </View>

      {places.map((place) => {
        const meta = kindMeta[place.kind];
        const selected = place.id === selectedId;
        return (
          <Pressable
            key={place.id}
            hitSlop={14}
            style={[styles.pin, { left: `${place.x}%`, top: `${place.y}%`, backgroundColor: meta.fg }, selected && styles.pinActive]}
            onPress={() => onSelect(place.id)}
            accessibilityLabel={`Select ${place.title}`}
          >
            <Ionicons name={meta.icon} size={selected ? 19 : 16} color="#FFFFFF" />
          </Pressable>
        );
      })}
    </View>
  );
}

function RoutePlannerCard({ day, routePlaces, routeMinutes, onOpenRoute }: { day: DayFilter; routePlaces: MapPlace[]; routeMinutes: number; onOpenRoute: () => void }) {
  const first = routePlaces[0];
  const last = routePlaces[routePlaces.length - 1];

  return (
    <Card padded style={styles.routeCard}>
      <View style={styles.routeTop}>
        <View style={styles.routeIcon}>
          <Ionicons name="git-branch-outline" size={20} color={colors.blue} />
        </View>
        <View style={styles.routeCopy}>
          <Text style={styles.routeTitle}>{dayLabel(day)} route</Text>
          <Text style={type.sub}>
            {routePlaces.length >= 2 ? `${routePlaces.length} stops - est. ${formatDuration(routeMinutes)}` : 'Add or plan at least two places to build a route.'}
          </Text>
        </View>
      </View>
      {first && last && first.id !== last.id ? <Text style={styles.routeDetail}>{first.title} to {last.title}</Text> : null}
      <PrimaryButton label="Export route" size="small" variant="secondary" disabled={routePlaces.length < 2} onPress={onOpenRoute} />
    </Card>
  );
}

function SelectedPlaceCard({ place, onOpenMaps }: { place: MapPlace; onOpenMaps: () => void }) {
  const meta = kindMeta[place.kind];
  return (
    <Pressable style={styles.selectedCard} onPress={onOpenMaps} accessibilityRole="button" accessibilityLabel={`Open ${place.title} in maps`}>
      <View style={[styles.selectedIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.fg} />
      </View>
      <View style={styles.selectedCopy}>
        <Text style={styles.selectedTitle}>{place.title}</Text>
        <Text style={styles.selectedMeta}>{place.area}{place.day ? ` - Day ${place.day}` : ''} - {statusCopy[place.status]}</Text>
      </View>
      <View style={styles.miniButton}>
        <Ionicons name="navigate-outline" size={17} color={colors.ink} />
      </View>
    </Pressable>
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

function getAreaGroups(places: MapPlace[]) {
  const groups = new Map<string, { name: string; count: number; bookedCount: number; firstPlaceId: string }>();

  places.forEach((place) => {
    const current = groups.get(place.area);
    if (!current) {
      groups.set(place.area, {
        name: place.area,
        count: 1,
        bookedCount: place.status === 'booked' || place.status === 'visited' ? 1 : 0,
        firstPlaceId: place.id,
      });
      return;
    }

    current.count += 1;
    if (place.status === 'booked' || place.status === 'visited') current.bookedCount += 1;
  });

  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function buildRoutePath(places: MapPlace[]) {
  if (places.length < 2) return '';
  return places
    .map((place, index) => {
      const x = (place.x / 100) * 320;
      const y = (place.y / 100) * 250;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function openInMaps(place: MapPlace) {
  const query = encodeURIComponent(`${place.title} ${place.area}`);
  void Linking.openURL(`https://maps.apple.com/?q=${query}`);
}

function openRouteInMaps(places: MapPlace[]) {
  if (places.length < 2) return;
  const ordered = sortRoutePlaces(places);
  const origin = encodeURIComponent(`${ordered[0].title} ${ordered[0].area}`);
  const destination = encodeURIComponent(`${ordered[ordered.length - 1].title} ${ordered[ordered.length - 1].area}`);
  const waypoints = ordered.slice(1, -1).map((place) => `${place.title} ${place.area}`).join('|');
  const waypointQuery = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';
  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointQuery}&travelmode=walking`);
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
  mapCard: { minHeight: 340, borderRadius: 30, overflow: 'hidden', backgroundColor: '#F7F3EA', borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  mapCanvas: { height: 252, position: 'relative', overflow: 'hidden' },
  mapHint: { position: 'absolute', left: 12, top: 12, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.82)', flexDirection: 'row', alignItems: 'center', gap: 5, zIndex: 4 },
  mapHintText: { fontSize: 11.5, fontWeight: '800', color: colors.ink2 },
  pin: { position: 'absolute', width: 36, height: 36, marginLeft: -18, marginTop: -18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', zIndex: 5, ...shadows.pin },
  pinActive: { width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 24, borderWidth: 4, zIndex: 6 },
  selectedCard: { minHeight: 78, margin: 12, marginTop: -4, borderRadius: 22, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.card },
  selectedIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  selectedCopy: { flex: 1 },
  selectedTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  selectedMeta: { marginTop: 2, fontSize: 13, color: colors.ink2 },
  miniButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#F3F1EA', alignItems: 'center', justifyContent: 'center' },
  routeCard: { gap: 12, marginTop: 14 },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF3FF', alignItems: 'center', justifyContent: 'center' },
  routeCopy: { flex: 1 },
  routeTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  routeDetail: { fontSize: 13.5, lineHeight: 20, color: colors.ink2 },
  filterRow: { gap: 8, paddingTop: 16, paddingBottom: 8, paddingRight: 20 },
  filterRowTight: { gap: 8, paddingBottom: 16, paddingRight: 20 },
  filterChip: { height: 36, paddingHorizontal: 15, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: colors.btn, borderColor: colors.btn },
  filterText: { fontSize: 13.5, fontWeight: '800', color: colors.ink2 },
  filterTextActive: { color: '#FFFFFF' },
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minHeight: 84, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, padding: 13, ...shadows.card },
  statValue: { marginTop: 8, fontSize: 20, fontWeight: '800', color: colors.ink },
  statLabel: { marginTop: 1, fontSize: 12, fontWeight: '800', color: colors.ink2 },
  sectionHeader: { marginTop: 2, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  areaRow: { gap: 10, paddingRight: 20, marginBottom: 16 },
  areaCard: { width: 132, minHeight: 92, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSoft, padding: 14, ...shadows.card },
  areaCount: { fontSize: 22, fontWeight: '800', color: colors.ink },
  areaName: { marginTop: 4, fontSize: 13.5, fontWeight: '800', color: colors.ink },
  areaMeta: { marginTop: 2, fontSize: 12, fontWeight: '700', color: colors.ink2 },
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
