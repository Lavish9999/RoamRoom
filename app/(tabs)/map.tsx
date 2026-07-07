import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, type LongPressEvent, type MarkerDragStartEndEvent, type Region } from 'react-native-maps';

import { Card, PrimaryButton } from '@/components';
import type { ItineraryKind } from '@/data/itinerary';
import { getCityCenter, type LatLng, type MapPlace, type MapPlaceStatus } from '@/data/mapPlaces';
import { useItinerary } from '@/state/useItinerary';
import { useItineraryPins } from '@/state/useItineraryPins';
import { useMapPlaces } from '@/state/useMapPlaces';
import { useToast } from '@/state/ToastContext';
import { useTrips } from '@/state/useTrips';
import { geocodeQuery } from '@/utils/geocode';
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
  const { activeTrip, isReady: tripsReady } = useTrips();
  const trip = activeTrip;
  const toast = useToast();
  const { places, addPlace, updatePlace, removePlace } = useMapPlaces(trip?.id);
  const { items: itineraryItems } = useItinerary(trip?.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<LatLng | null>(null);
  const [showItinerary, setShowItinerary] = useState(true);

  const cityCenter = useMemo(() => getCityCenter(trip?.destination), [trip?.destination]);
  const itineraryPins = useItineraryPins(itineraryItems, cityCenter, showItinerary);

  // The map, route, filters and stats work off saved places plus the geocoded
  // itinerary pins; only saved places are editable (drag/status/delete).
  const allPlaces = useMemo(() => [...places, ...itineraryPins], [places, itineraryPins]);

  const dayOptions = useMemo(() => {
    const days = Array.from(new Set(allPlaces.flatMap((place) => (place.day ? [place.day] : [])))).sort((a, b) => a - b);
    return ['all' as const, ...days, 'unscheduled' as const];
  }, [allPlaces]);

  const visiblePlaces = useMemo(
    () => allPlaces.filter((place) => matchesStatus(place, statusFilter) && matchesDay(place, dayFilter)),
    [allPlaces, dayFilter, statusFilter],
  );
  const routePlaces = useMemo(() => sortRoutePlaces(visiblePlaces.filter((place) => place.status !== 'idea')), [visiblePlaces]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedId) ?? visiblePlaces[0];
  const bookedCount = allPlaces.filter((place) => place.status === 'booked' || place.status === 'visited').length;
  const ideaCount = allPlaces.filter((place) => place.status === 'idea').length;
  const itineraryCount = itineraryPins.length;
  const routeMinutes = Math.max(routePlaces.length - 1, 0) * 18 + routePlaces.length * 30;
  const areaGroups = useMemo(() => getAreaGroups(visiblePlaces), [visiblePlaces]);

  useEffect(() => {
    if (visiblePlaces.length && !visiblePlaces.some((place) => place.id === selectedId)) {
      setSelectedId(visiblePlaces[0].id);
    }
  }, [selectedId, visiblePlaces]);

  function openAddSheet() {
    setPendingCoord(null);
    setIsAdding(true);
  }

  function closeAddSheet() {
    setIsAdding(false);
    setPendingCoord(null);
  }

  function handleLongPress(event: LongPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPendingCoord({ lat: latitude, lng: longitude });
    setIsAdding(true);
  }

  function handleMarkerDragEnd(place: MapPlace, event: MarkerDragStartEndEvent) {
    if (place.source === 'itinerary') return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void updatePlace(place.id, { lat: latitude, lng: longitude });
    toast.show('Pin moved');
  }

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
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live native map</Text>
            </View>
            <Text style={styles.h1}>{trip.destination}</Text>
            <Text style={type.sub}>
              {allPlaces.length} places - {bookedCount} locked{itineraryCount ? ` - ${itineraryCount} from plan` : ` - ${ideaCount} ideas`}
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={openAddSheet} accessibilityLabel="Add map place">
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          <NativeMap
            places={visiblePlaces}
            routePlaces={routePlaces}
            selectedId={selectedPlace?.id}
            center={cityCenter}
            onSelect={setSelectedId}
            onLongPress={handleLongPress}
            onMarkerDragEnd={handleMarkerDragEnd}
          />
          {selectedPlace ? (
            <View style={styles.selectedFloat} pointerEvents="box-none">
              <SelectedPlaceCard place={selectedPlace} onOpenMaps={() => openInMaps(selectedPlace)} />
            </View>
          ) : null}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotSaved]} />
            <Text style={styles.legendText}>Saved - drag to move</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotItinerary]} />
            <Text style={styles.legendText}>From itinerary</Text>
          </View>
          <Text style={styles.legendHint}>Long-press map to add</Text>
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
          <Pressable
            style={[styles.filterChip, styles.toggleChip, showItinerary && styles.filterChipActive]}
            onPress={() => setShowItinerary((value) => !value)}
            accessibilityLabel="Toggle itinerary pins"
          >
            <Ionicons name={showItinerary ? 'eye-outline' : 'eye-off-outline'} size={15} color={showItinerary ? '#FFFFFF' : colors.ink2} />
            <Text style={[styles.filterText, showItinerary && styles.filterTextActive]}>Itinerary</Text>
          </Pressable>
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
              onOpenPlan={() => router.push('/plan')}
            />
          ))}
        </View>

        {visiblePlaces.length === 0 ? (
          <Card padded style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No places here</Text>
            <Text style={type.body}>Change the filter or add a saved place to the trip map.</Text>
            <PrimaryButton label="Add place" size="small" onPress={openAddSheet} />
          </Card>
        ) : null}
      </ScrollView>

      <AddPlaceModal
        visible={isAdding}
        pinnedCoord={pendingCoord}
        cityCenter={cityCenter}
        onClose={closeAddSheet}
        onAdd={async (place) => {
          await addPlace(place);
          closeAddSheet();
        }}
        onToast={toast.show}
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

function regionForPlaces(places: MapPlace[], fallback: LatLng): Region {
  if (places.length === 0) {
    return { latitude: fallback.lat, longitude: fallback.lng, latitudeDelta: 0.09, longitudeDelta: 0.09 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  places.forEach((place) => {
    minLat = Math.min(minLat, place.lat);
    maxLat = Math.max(maxLat, place.lat);
    minLng = Math.min(minLng, place.lng);
    maxLng = Math.max(maxLng, place.lng);
  });

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.03),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.03),
  };
}

function NativeMap({
  places,
  routePlaces,
  selectedId,
  center,
  onSelect,
  onLongPress,
  onMarkerDragEnd,
}: {
  places: MapPlace[];
  routePlaces: MapPlace[];
  selectedId?: string;
  center: LatLng;
  onSelect: (id: string) => void;
  onLongPress: (event: LongPressEvent) => void;
  onMarkerDragEnd: (place: MapPlace, event: MarkerDragStartEndEvent) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const initialRegion = useMemo(() => regionForPlaces(places.length ? places : [], center), [center]);
  const routeCoords = routePlaces.map((place) => ({ latitude: place.lat, longitude: place.lng }));

  // Re-frame the map whenever the filtered set of pins changes so the visible
  // markers stay in view. Keyed on the ids so it only fires on real changes.
  const visibleKey = places.map((place) => place.id).join('|');
  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;
    const coords = places.map((place) => ({ latitude: place.lat, longitude: place.lng }));
    const timer = setTimeout(() => {
      if (coords.length === 1) {
        mapRef.current?.animateToRegion({ ...coords[0], latitudeDelta: 0.02, longitudeDelta: 0.02 }, 350);
      } else {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 70, right: 60, bottom: 130, left: 60 },
          animated: true,
        });
      }
    }, 260);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  function handleSelect(place: MapPlace) {
    onSelect(place.id);
    mapRef.current?.animateToRegion(
      { latitude: place.lat, longitude: place.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      350,
    );
  }

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsPointsOfInterest={false}
      showsCompass={false}
      loadingEnabled
      loadingBackgroundColor="#F7F3EA"
      onLongPress={onLongPress}
    >
      {routeCoords.length >= 2 ? (
        <>
          <Polyline coordinates={routeCoords} strokeColor="#FFFFFF" strokeWidth={7} lineCap="round" lineJoin="round" />
          <Polyline coordinates={routeCoords} strokeColor={colors.btn} strokeWidth={4} lineCap="round" lineJoin="round" />
        </>
      ) : null}
      {places.map((place) => (
        <MarkerPin
          key={place.id}
          place={place}
          selected={place.id === selectedId}
          onPress={() => handleSelect(place)}
          onDragEnd={(event) => onMarkerDragEnd(place, event)}
        />
      ))}
    </MapView>
  );
}

function MarkerPin({
  place,
  selected,
  onPress,
  onDragEnd,
}: {
  place: MapPlace;
  selected: boolean;
  onPress: () => void;
  onDragEnd: (event: MarkerDragStartEndEvent) => void;
}) {
  const meta = kindMeta[place.kind];
  const itinerary = place.source === 'itinerary';
  // Custom marker views need tracksViewChanges=true long enough to draw the
  // icon, then off for performance. Re-enable briefly when appearance changes.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const timer = setTimeout(() => setTracks(false), 800);
    return () => clearTimeout(timer);
  }, [selected, place.kind, place.status]);

  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      draggable={!itinerary}
      onDragEnd={onDragEnd}
      zIndex={selected ? 10 : 1}
    >
      <View
        style={[
          styles.markerPin,
          itinerary ? [styles.markerPinItinerary, { borderColor: meta.fg }] : { backgroundColor: meta.fg },
          selected && styles.markerPinActive,
        ]}
      >
        <Ionicons name={meta.icon} size={selected ? 18 : 15} color={itinerary ? meta.fg : '#FFFFFF'} />
      </View>
    </Marker>
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
    <View style={styles.selectedCard}>
      <View style={[styles.selectedIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.fg} />
      </View>
      <View style={styles.selectedCopy}>
        <Text style={styles.selectedTitle}>{place.title}</Text>
        <Text style={styles.selectedMeta}>{place.area}{place.day ? ` - Day ${place.day}` : ''} - {statusCopy[place.status]}</Text>
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
  onOpenPlan,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: () => void;
  onOpenMaps: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
  onOpenPlan: () => void;
}) {
  const meta = kindMeta[place.kind];
  const itinerary = place.source === 'itinerary';

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
        {itinerary ? (
          <Pressable style={styles.planLink} onPress={onOpenPlan} accessibilityLabel="Open in plan">
            <Ionicons name="calendar-outline" size={14} color={colors.blue} />
            <Text style={styles.planLinkText}>{place.day ? `Day ${place.day}` : 'In itinerary'}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.blue} />
          </Pressable>
        ) : (
          <View style={styles.footerActions}>
            <Pressable style={[styles.statusButton, place.status === 'visited' && styles.statusDone]} onPress={onCycleStatus}>
              <Text style={[styles.statusButtonText, place.status === 'visited' && styles.statusDoneText]}>{statusCopy[place.status]}</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityLabel={`Delete ${place.title}`}>
              <Ionicons name="trash-outline" size={17} color={colors.ink2} />
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
}

function AddPlaceModal({
  visible,
  pinnedCoord,
  cityCenter,
  onClose,
  onAdd,
  onToast,
}: {
  visible: boolean;
  pinnedCoord: LatLng | null;
  cityCenter: LatLng;
  onClose: () => void;
  onAdd: (place: {
    title: string;
    area: string;
    day?: number;
    time?: string;
    kind: ItineraryKind;
    status: MapPlaceStatus;
    note?: string;
    lat?: number;
    lng?: number;
  }) => void | Promise<void>;
  onToast: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<ItineraryKind>('activity');
  const [locating, setLocating] = useState(false);
  // A long-press drop only needs a name; a manual add needs a name + area we
  // can geocode.
  const canAdd = title.trim().length > 0 && (pinnedCoord != null || area.trim().length > 0);

  function reset() {
    setTitle('');
    setArea('');
    setDay('');
    setTime('');
    setNote('');
    setKind('activity');
  }

  async function handleAdd() {
    if (!canAdd || locating) return;
    const parsedDay = Number.parseInt(day.trim(), 10);

    let coord: LatLng | undefined = pinnedCoord ?? undefined;
    if (!coord) {
      setLocating(true);
      const query = [title.trim(), area.trim()].filter(Boolean).join(', ');
      const found = await geocodeQuery(query);
      setLocating(false);
      if (found) {
        coord = found;
      } else {
        onToast('Couldn\'t pinpoint that address - dropped near the city center');
      }
    }

    await onAdd({
      title: title.trim(),
      area: area.trim() || 'Pinned location',
      day: Number.isFinite(parsedDay) ? parsedDay : undefined,
      time: time.trim() || undefined,
      kind,
      status: 'idea',
      note: note.trim() || undefined,
      lat: coord?.lat,
      lng: coord?.lng,
    });
    reset();
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

            {pinnedCoord ? (
              <View style={styles.pinnedBanner}>
                <Ionicons name="location" size={16} color={colors.blue} />
                <Text style={styles.pinnedBannerText}>Dropping at the spot you pressed on the map.</Text>
              </View>
            ) : (
              <Text style={styles.geocodeHint}>We&apos;ll look up the address to place it on the map.</Text>
            )}

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
            <Field label={pinnedCoord ? 'Area (optional)' : 'Address or area'} value={area} onChangeText={setArea} placeholder="Neighborhood, address, or city" />
            <View style={styles.twoCol}>
              <Field label="Day" value={day} onChangeText={setDay} placeholder="3" keyboardType="number-pad" />
              <Field label="Time" value={time} onChangeText={setTime} placeholder="10:00 AM" />
            </View>
            <Field label="Note" value={note} onChangeText={setNote} placeholder="Why save this?" multiline />

            <View style={styles.modalActions}>
              <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} disabled={locating} />
              <PrimaryButton label={locating ? 'Locating...' : 'Add place'} onPress={handleAdd} disabled={!canAdd || locating} />
            </View>
            {locating ? (
              <View style={styles.locatingRow}>
                <ActivityIndicator size="small" color={colors.blue} />
                <Text style={styles.locatingText}>Finding this place...</Text>
              </View>
            ) : null}
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

function openInMaps(place: MapPlace) {
  const label = encodeURIComponent(place.title);
  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${place.lat},${place.lng}&q=${label}`,
    default: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`,
  });
  void Linking.openURL(url as string);
}

function openRouteInMaps(places: MapPlace[]) {
  if (places.length < 2) return;
  const ordered = sortRoutePlaces(places);
  const origin = `${ordered[0].lat},${ordered[0].lng}`;
  const destination = `${ordered[ordered.length - 1].lat},${ordered[ordered.length - 1].lng}`;
  const waypoints = ordered.slice(1, -1).map((place) => `${place.lat},${place.lng}`).join('|');
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
  liveBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#E7F9F0' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  liveBadgeText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3, color: '#178A5B', textTransform: 'uppercase' },
  mapCard: { height: 360, borderRadius: 30, overflow: 'hidden', backgroundColor: '#F7F3EA', borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  markerPin: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', ...shadows.pin },
  markerPinActive: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
  markerPinItinerary: { backgroundColor: '#FFFFFF' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  legendDotSaved: { backgroundColor: colors.blue, borderColor: colors.blue },
  legendDotItinerary: { backgroundColor: '#FFFFFF', borderColor: colors.blue },
  legendText: { fontSize: 11.5, fontWeight: '700', color: colors.ink2 },
  legendHint: { marginLeft: 'auto', fontSize: 11.5, fontWeight: '700', color: colors.ink2 },
  selectedFloat: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  selectedCard: { minHeight: 78, borderRadius: 22, backgroundColor: colors.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadows.float },
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
  toggleChip: { flexDirection: 'row', gap: 6 },
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
  planLink: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: '#EEF3FF' },
  planLinkText: { fontSize: 12.5, fontWeight: '800', color: colors.blue },
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
  pinnedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 15, backgroundColor: '#EEF3FF' },
  pinnedBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.blue },
  geocodeHint: { fontSize: 13, lineHeight: 19, color: colors.ink2 },
  locatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 4 },
  locatingText: { fontSize: 13, fontWeight: '700', color: colors.ink2 },
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
