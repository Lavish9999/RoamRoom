import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, CoverImage, PrimaryButton } from '@/components';
import { useExpenses } from '@/state/useExpenses';
import { useItinerary } from '@/state/useItinerary';
import { useMapPlaces } from '@/state/useMapPlaces';
import { useMemories, type MemoryPhoto } from '@/state/useMemories';
import { useToast } from '@/state/ToastContext';
import { useTrips } from '@/state/useTrips';
import { colors, radii, shadows, type } from '@/theme';
import { tripNights } from '@/utils/budget';

function cityName(destination?: string) {
  return destination?.split(',')[0]?.trim() || 'your trip';
}

export default function MemoriesScreen() {
  const { activeTrip, isReady: tripsReady } = useTrips();
  const trip = activeTrip;
  const toast = useToast();
  const { photos, journal, addPhoto, removePhoto, setCaption, saveJournal } = useMemories(trip?.id);
  const { places } = useMapPlaces(trip?.id);
  const { items } = useItinerary(trip?.id);
  const { expenses } = useExpenses(trip?.id);

  const [viewer, setViewer] = useState<MemoryPhoto | null>(null);

  const spent = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const nights = trip ? tripNights(trip.startDate, trip.endDate) : 0;
  const visited = places.filter((place) => place.status === 'visited' || place.status === 'booked').length;

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.show('Allow photo access to add memories');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 12,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      await addPhoto(asset.uri);
    }
    toast.show(result.assets.length > 1 ? `${result.assets.length} photos added` : 'Photo added');
  }

  if (!tripsReady) {
    return <Centered title="Loading memories" copy="Getting this trip's recap ready." />;
  }

  if (!trip) {
    return <Centered title="Create a trip first" copy="Once you have a trip, its recap, photos, and journal live here." action="Create trip" />;
  }

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <CoverImage coverKey={trip.coverKey} destination={trip.destination} style={styles.heroCover} radius={0}>
            <View style={styles.heroOverlay} />
            <Pressable style={styles.heroAdd} onPress={pickPhotos} accessibilityLabel="Add photos">
              <Ionicons name="camera" size={19} color="#FFFFFF" />
            </Pressable>
            <View>
              <Text style={styles.heroEyebrow}>Memories</Text>
              <Text style={styles.heroTitle}>{trip.name}</Text>
              <Text style={styles.heroMeta}>{nights} {nights === 1 ? 'night' : 'nights'} in {cityName(trip.destination)}</Text>
            </View>
          </CoverImage>
        </View>

        <View style={styles.recapStrip}>
          <RecapStat value={`${photos.length}`} label="Photos" />
          <View style={styles.recapDivider} />
          <RecapStat value={`${items.length}`} label="Stops" />
          <View style={styles.recapDivider} />
          <RecapStat value={`$${Math.round(spent)}`} label="Spent" />
          <View style={styles.recapDivider} />
          <RecapStat value={`${trip.members.length}`} label={trip.members.length === 1 ? 'Traveler' : 'Crew'} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Pressable onPress={pickPhotos} accessibilityLabel="Add photos">
            <Text style={styles.sectionLink}>+ Add</Text>
          </Pressable>
        </View>

        {photos.length === 0 ? (
          <Pressable onPress={pickPhotos}>
            <Card padded style={styles.emptyPhotos}>
              <View style={styles.emptyIcon}>
                <Ionicons name="images-outline" size={26} color={colors.blue} />
              </View>
              <Text style={styles.emptyTitle}>Add your first photo</Text>
              <Text style={type.body}>Pull in shots from your library to build this trip's album.</Text>
            </Card>
          </Pressable>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <Pressable key={photo.id} style={styles.photoWrap} onPress={() => setViewer(photo)}>
                <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
                {photo.caption ? (
                  <View style={styles.photoCaption}>
                    <Text style={styles.photoCaptionText} numberOfLines={1}>{photo.caption}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trip journal</Text>
        </View>
        <Card padded style={styles.journalCard}>
          <JournalEditor value={journal} onSave={saveJournal} />
        </Card>
      </ScrollView>

      <PhotoViewer
        photo={viewer}
        onClose={() => setViewer(null)}
        onSaveCaption={(caption) => {
          if (viewer) void setCaption(viewer.id, caption);
        }}
        onDelete={() => {
          if (viewer) void removePhoto(viewer.id);
          setViewer(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function RecapStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.recapStat}>
      <Text style={styles.recapValue}>{value}</Text>
      <Text style={styles.recapLabel}>{label}</Text>
    </View>
  );
}

function JournalEditor({ value, onSave }: { value: string; onSave: (text: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onBlur={() => onSave(text)}
      placeholder="What was the best part? Anything to remember for next time?"
      placeholderTextColor="#7C8593"
      multiline
      style={styles.journalInput}
    />
  );
}

function PhotoViewer({
  photo,
  onClose,
  onSaveCaption,
  onDelete,
}: {
  photo: MemoryPhoto | null;
  onClose: () => void;
  onSaveCaption: (caption: string) => void;
  onDelete: () => void;
}) {
  const [caption, setCaptionText] = useState('');
  useEffect(() => setCaptionText(photo?.caption ?? ''), [photo]);

  return (
    <Modal visible={photo != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close photo" />
        <View style={styles.viewerCard}>
          {photo ? <Image source={{ uri: photo.uri }} style={styles.viewerImage} resizeMode="cover" /> : null}
          <TextInput
            value={caption}
            onChangeText={setCaptionText}
            onBlur={() => onSaveCaption(caption)}
            placeholder="Add a caption"
            placeholderTextColor="#7C8593"
            style={styles.viewerCaption}
          />
          <View style={styles.viewerActions}>
            <Pressable style={styles.viewerDelete} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.coral} />
              <Text style={styles.viewerDeleteText}>Delete</Text>
            </Pressable>
            <PrimaryButton
              label="Done"
              size="small"
              onPress={() => {
                onSaveCaption(caption);
                onClose();
              }}
            />
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
        <Text style={type.eyebrow}>Memories</Text>
        <Text style={styles.h1}>{title}</Text>
        <Text style={type.body}>{copy}</Text>
        {action ? <PrimaryButton label={action} onPress={() => router.push('/create/step-1')} /> : null}
      </Card>
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
  hero: { borderRadius: 24, overflow: 'hidden', marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  heroCover: { height: 190, padding: 16, justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,18,23,0.28)' },
  heroAdd: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(14,18,23,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  heroTitle: { marginTop: 3, fontSize: 27, lineHeight: 31, fontWeight: '800', letterSpacing: -0.3, color: '#FFFFFF' },
  heroMeta: { marginTop: 3, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  recapStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 14, marginBottom: 4, ...shadows.card },
  recapStat: { flex: 1, alignItems: 'center' },
  recapValue: { fontSize: 19, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
  recapLabel: { marginTop: 2, fontSize: 11.5, fontWeight: '800', color: colors.ink2 },
  recapDivider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: colors.border },
  sectionHeader: { marginTop: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  sectionLink: { fontSize: 14, fontWeight: '800', color: colors.blue },
  emptyPhotos: { alignItems: 'flex-start', gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#182B45', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: colors.ink },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrap: { width: '31.8%', aspectRatio: 1, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.card },
  photo: { width: '100%', height: '100%' },
  photoCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(16,21,28,0.5)' },
  photoCaptionText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
  journalCard: {},
  journalInput: { minHeight: 100, fontSize: 15, lineHeight: 21, color: colors.ink, textAlignVertical: 'top' },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(16,21,28,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  viewerCard: { width: '100%', maxWidth: 420, borderRadius: 24, backgroundColor: colors.cream, padding: 14, gap: 12, ...shadows.float },
  viewerImage: { width: '100%', height: 320, borderRadius: 16, backgroundColor: colors.card },
  viewerCaption: { minHeight: 46, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 15, color: colors.ink },
  viewerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerDelete: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: '#331C19' },
  viewerDeleteText: { fontSize: 14, fontWeight: '800', color: colors.coral },
});
