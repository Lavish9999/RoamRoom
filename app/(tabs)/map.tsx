import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, type LongPressEvent, type MarkerDragStartEndEvent, type Region } from 'react-native-maps';

import { Card, PrimaryButton } from '@/components';
import { LocationField } from '@/components/LocationField';
import type { ItineraryKind, ItineraryStatus } from '@/data/itinerary';
import { getCityCenter, type LatLng, type MapPlace, type MapPlaceStatus } from '@/data/mapPlaces';
import { useItinerary } from '@/state/useItinerary';
import { useItineraryPins } from '@/state/useItineraryPins';
import { useMapPlaces } from '@/state/useMapPlaces';
import { useToast } from '@/state/ToastContext';
import { useTrips } from '@/state/useTrips';
import { tripNights } from '@/utils/budget';
import { geocodeQuery } from '@/utils/geocode';
import { colors, radii, shadows, type } from '@/theme';

function mapToItineraryStatus(status: MapPlaceStatus): ItineraryStatus {
  return status === 'visited' ? 'done' : status;
}

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
  activity: { label: 'Activity', icon: 'sparkles-outline', bg: '#182B45', fg: '#8FB4FF' },
  food: { label: 'Food', icon: 'restaurant-outline', bg: '#301F19', fg: '#F08A6A' },
  transport: { label: 'Transit', icon: 'train-outline', bg: '#1B2733', fg: '#8FB0CC' },
  flight: { label: 'Flight', icon: 'airplane-outline', bg: '#1B2733', fg: '#8FB0CC' },
  stay: { label: 'Stay', icon: 'bed-outline', bg: '#241E33', fg: '#B79BE6' },
  free: { label: 'Free', icon: 'sunny-outline', bg: '#142A1C', fg: '#5FCB86' },
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
  const { items: itineraryItems, days: itineraryDays, addItem } = useItinerary(trip?.id);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingCoord, setPendingCoord] = useState<LatLng | null>(null);
  const [showItinerary, setShowItinerary] = useState(true);
  const [planningPlace, setPlanningPlace] = useState<MapPlace | null>(null);

  // Known-city center instantly, then geocode the real destination so search
  // and pin fallbacks are biased to the actual place (not the Paris default).
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
  // 1-based order of each place along the route, for numbered pins.
  const routeOrder = useMemo(() => {
    const order: Record<string, number> = {};
    routePlaces.forEach((place, index) => {
      order[place.id] = index + 1;
    });
    return order;
  }, [routePlaces]);
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedId) ?? visiblePlaces[0];
  const bookedCount = allPlaces.filter((place) => place.status === 'booked' || place.status === 'visited').length;
  const itineraryCount = itineraryPins.length;

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

  async function handleAddToPlan(place: MapPlace, day: number) {
    await addItem({
      day,
      time: place.time || '12:00 PM',
      title: place.title,
      location: place.area,
      kind: place.kind,
      notes: place.note,
      lat: place.lat,
      lng: place.lng,
      status: mapToItineraryStatus(place.status),
    });
    setPlanningPlace(null);
    toast.show(`Added to Day ${day}`);
  }

  // Days offered when scheduling a place: however many the trip spans, and at
  // least what the itinerary already uses.
  const planDayCount = Math.max(trip ? tripNights(trip.startDate, trip.endDate) + 1 : 1, itineraryDays.length ? Math.max(...itineraryDays) : 1, 1);
  const planDayOptions = Array.from({ length: planDayCount }, (_, index) => index + 1);

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
            <Text style={type.sub}>
              {allPlaces.length} places · {bookedCount} locked{itineraryCount ? ` · ${itineraryCount} from plan` : ''}
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
            routeOrder={routeOrder}
            selectedId={selectedPlace?.id}
            center={cityCenter}
            onSelect={setSelectedId}
            onLongPress={handleLongPress}
            onMarkerDragEnd={handleMarkerDragEnd}
          />
          {selectedPlace ? (
            <View style={styles.selectedFloat} pointerEvents="box-none">
              <SelectedPlaceCard
                place={selectedPlace}
                onOpenMaps={() => openInMaps(selectedPlace)}
                onAddToPlan={selectedPlace.source === 'itinerary' ? undefined : () => setPlanningPlace(selectedPlace)}
              />
            </View>
          ) : null}
        </View>

        <Text style={styles.mapHint}>Numbered pins show route order · tap a pin to focus · long-press the map to add</Text>

        {routePlaces.length >= 2 ? (
          <Pressable style={styles.routeBar} onPress={() => openRouteInMaps(routePlaces)}>
            <Ionicons name="git-branch-outline" size={16} color={colors.blue} />
            <Text style={styles.routeBarText} numberOfLines={1}>{dayLabel(dayFilter)} · {routePlaces.length} stops</Text>
            <Text style={styles.routeBarLink}>Export route</Text>
            <Ionicons name="open-outline" size={15} color={colors.blue} />
          </Pressable>
        ) : null}

        {dayOptions.length > 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {dayOptions.map((item) => (
              <Pressable key={String(item)} style={[styles.filterChip, dayFilter === item && styles.filterChipActive]} onPress={() => setDayFilter(item)}>
                <Text style={[styles.filterText, dayFilter === item && styles.filterTextActive]}>{dayLabel(item)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Places</Text>
          <Text style={type.cap}>{visiblePlaces.length} shown</Text>
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

      <AddToPlanModal
        place={planningPlace}
        dayOptions={planDayOptions}
        onClose={() => setPlanningPlace(null)}
        onPick={(day) => planningPlace && handleAddToPlan(planningPlace, day)}
      />
    </View>
  );
}

function AddToPlanModal({
  place,
  dayOptions,
  onClose,
  onPick,
}: {
  place: MapPlace | null;
  dayOptions: number[];
  onClose: () => void;
  onPick: (day: number) => void;
}) {
  return (
    <Modal visible={place != null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalVeil} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={type.eyebrow}>Add to itinerary</Text>
          <Text style={styles.sheetTitle} numberOfLines={1}>{place?.title}</Text>
          <Text style={type.sub}>Pick a day to schedule this stop in your Plan.</Text>
          <View style={styles.planDayGrid}>
            {dayOptions.map((day) => (
              <Pressable key={day} style={styles.planDayChip} onPress={() => onPick(day)}>
                <Text style={styles.planDayText}>Day {day}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.planCancel}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
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
  routeOrder,
  selectedId,
  center,
  onSelect,
  onLongPress,
  onMarkerDragEnd,
}: {
  places: MapPlace[];
  routePlaces: MapPlace[];
  routeOrder: Record<string, number>;
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
      userInterfaceStyle="dark"
      showsPointsOfInterest={false}
      showsCompass={false}
      loadingEnabled
      loadingBackgroundColor="#10151C"
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
          routeNumber={routeOrder[place.id]}
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
  routeNumber,
  onPress,
  onDragEnd,
}: {
  place: MapPlace;
  selected: boolean;
  routeNumber?: number;
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
  }, [selected, place.kind, place.status, routeNumber]);

  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracks}
      draggable={!itinerary}
      onDragEnd={onDragEnd}
      zIndex={selected ? 10 : routeNumber ? 5 : 1}
    >
      <View
        style={[
          styles.markerPin,
          itinerary ? [styles.markerPinItinerary, { borderColor: meta.fg }] : { backgroundColor: meta.fg },
          selected && styles.markerPinActive,
        ]}
      >
        {routeNumber ? (
          <Text style={[styles.markerNumber, itinerary && { color: meta.fg }]}>{routeNumber}</Text>
        ) : (
          <Ionicons name={meta.icon} size={selected ? 18 : 15} color={itinerary ? meta.fg : '#FFFFFF'} />
        )}
      </View>
    </Marker>
  );
}

function SelectedPlaceCard({ place, onOpenMaps, onAddToPlan }: { place: MapPlace; onOpenMaps: () => void; onAddToPlan?: () => void }) {
  const meta = kindMeta[place.kind];
  return (
    <View style={styles.selectedCard}>
      <View style={[styles.selectedIcon, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={18} color={meta.fg} />
      </View>
      <View style={styles.selectedCopy}>
        <Text style={styles.selectedTitle} numberOfLines={1}>{place.title}</Text>
        <Text style={styles.selectedMeta} numberOfLines={1}>{place.area}{place.day ? ` - Day ${place.day}` : ''} - {statusCopy[place.status]}</Text>
      </View>
      {onAddToPlan ? (
        <Pressable style={styles.miniButton} onPress={onAddToPlan} accessibilityLabel={`Add ${place.title} to plan`}>
          <Ionicons name="calendar-outline" size={17} color={colors.blue} />
        </Pressable>
      ) : null}
      <Pressable style={styles.miniButton} onPress={onOpenMaps} accessibilityLabel={`Open ${place.title} in maps`}>
        <Ionicons name="navigate-outline" size={17} color={colors.ink} />
      </Pressable>
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
  const [coord, setCoord] = useState<LatLng | null>(null);
  const [note, setNote] = useState('');
  const [kind, setKind] = useState<ItineraryKind>('activity');
  const [locating, setLocating] = useState(false);
  // A long-press drop only needs a name; a manual add needs a name + a
  // searched/typed location.
  const canAdd = title.trim().length > 0 && (pinnedCoord != null || area.trim().length > 0);

  function reset() {
    setTitle('');
    setArea('');
    setCoord(null);
    setNote('');
    setKind('activity');
  }

  async function handleAdd() {
    if (!canAdd || locating) return;

    // Prefer the exact coordinate from a long-press or a picked search result;
    // only geocode as a fallback when the location was hand-typed.
    let resolved: LatLng | undefined = pinnedCoord ?? coord ?? undefined;
    if (!resolved && area.trim()) {
      setLocating(true);
      const query = [title.trim(), area.trim()].filter(Boolean).join(', ');
      const found = await geocodeQuery(query);
      setLocating(false);
      if (found) {
        resolved = found;
      } else {
        onToast('Couldn\'t pinpoint that address - dropped near the city center');
      }
    }

    await onAdd({
      title: title.trim(),
      area: area.trim() || 'Pinned location',
      kind,
      status: 'idea',
      note: note.trim() || undefined,
      lat: resolved?.lat,
      lng: resolved?.lng,
    });
    reset();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <Pressable style={styles.modalVeil} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <Text style={type.eyebrow}>Saved place</Text>
            <Text style={styles.sheetTitle}>Add place</Text>

            {pinnedCoord ? (
              <View style={styles.pinnedBanner}>
                <Ionicons name="location" size={16} color={colors.blue} />
                <Text style={styles.pinnedBannerText}>Dropping at the spot you pressed on the map.</Text>
              </View>
            ) : (
              <Text style={styles.geocodeHint}>Search a place to drop it exactly, or type an address.</Text>
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
            {pinnedCoord ? (
              <Field label="Area (optional)" value={area} onChangeText={setArea} placeholder="Neighborhood or city" />
            ) : (
              <LocationField
                label="Location"
                value={area}
                center={cityCenter}
                placeholder="Search a place or address"
                onChangeText={(text) => {
                  setArea(text);
                  setCoord(null);
                }}
                onSelect={(place) => {
                  setArea(place.name);
                  setCoord({ lat: place.lat, lng: place.lng });
                  if (!title.trim()) setTitle(place.name);
                }}
              />
            )}
            <Field label="Note" value={note} onChangeText={setNote} placeholder="Why save this?" multiline />
            <Text style={styles.geocodeHint}>Saves as a spot on the map. To put it on a day, use “Add to plan” after.</Text>

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
      </KeyboardAvoidingView>
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
        placeholderTextColor="#7C8593"
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
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
  liveBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: '#123024' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  liveBadgeText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.3, color: '#4FD39E', textTransform: 'uppercase' },
  mapCard: { height: 360, borderRadius: 30, overflow: 'hidden', backgroundColor: '#10151C', borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  markerPin: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', ...shadows.pin },
  markerPinActive: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
  markerPinItinerary: { backgroundColor: '#FFFFFF' },
  markerNumber: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
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
  miniButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#232B36', alignItems: 'center', justifyContent: 'center' },
  routeCard: { gap: 12, marginTop: 14 },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#182B45', alignItems: 'center', justifyContent: 'center' },
  routeCopy: { flex: 1 },
  routeTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  routeDetail: { fontSize: 13.5, lineHeight: 20, color: colors.ink2 },
  mapHint: { marginTop: 10, marginBottom: 4, fontSize: 12, lineHeight: 17, color: colors.ink2 },
  routeBar: { marginTop: 10, height: 46, borderRadius: radii.md, backgroundColor: '#182B45', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  routeBarText: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.ink },
  routeBarLink: { fontSize: 13, fontWeight: '800', color: colors.blue },
  filterRow: { gap: 8, paddingTop: 14, paddingBottom: 8, paddingRight: 20 },
  filterRowTight: { gap: 8, paddingTop: 14, paddingBottom: 8, paddingRight: 20 },
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
  iconButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#232B36' },
  note: { fontSize: 13.5, lineHeight: 20, color: colors.ink2 },
  placeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindPill: { height: 28, paddingHorizontal: 11, borderRadius: radii.pill, justifyContent: 'center' },
  kindPillText: { fontSize: 12, fontWeight: '800' },
  planLink: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: '#182B45' },
  planLinkText: { fontSize: 12.5, fontWeight: '800', color: colors.blue },
  statusButton: { height: 32, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: '#232B36', justifyContent: 'center' },
  statusDone: { backgroundColor: '#123024' },
  statusButtonText: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  statusDoneText: { color: '#4FD39E' },
  deleteButton: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#232B36' },
  emptyCard: { marginTop: 12, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,21,28,0.34)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.cream, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, ...shadows.float },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: '#39424E', alignSelf: 'center', marginBottom: 8 },
  sheetContent: { gap: 12, paddingBottom: 4 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink },
  planDayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  planDayChip: { minWidth: 82, height: 48, paddingHorizontal: 16, borderRadius: radii.md, backgroundColor: '#182B45', alignItems: 'center', justifyContent: 'center' },
  planDayText: { fontSize: 15, fontWeight: '800', color: colors.blue },
  planCancel: { marginTop: 16 },
  pinnedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 15, backgroundColor: '#182B45' },
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
