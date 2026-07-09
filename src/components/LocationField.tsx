import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LatLng } from '@/data/mapPlaces';
import { searchPlaces, type PlaceResult } from '@/utils/placeSearch';
import { colors, radii } from '@/theme';

export function LocationField({
  label,
  value,
  placeholder,
  center,
  onChangeText,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  center?: LatLng;
  onChangeText: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (dismissed || query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    // Debounce so we don't hit the API on every keystroke.
    const timer = setTimeout(async () => {
      const found = await searchPlaces(query, center);
      if (!cancelled) {
        setResults(found);
        setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, dismissed, center?.lat, center?.lng]);

  const showList = focused && !dismissed && (results.length > 0 || loading);

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, showList && styles.inputRowOpen]}>
        <Ionicons name="location-outline" size={18} color={colors.ink2} />
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#98A2B3"
          onChangeText={(next) => {
            setDismissed(false);
            onChangeText(next);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
        {loading ? <ActivityIndicator size="small" color={colors.blue} /> : null}
      </View>

      {showList ? (
        <View style={styles.list}>
          {results.length === 0 && loading ? (
            <Text style={styles.searching}>Searching nearby places...</Text>
          ) : (
            results.map((place) => (
              <Pressable
                key={place.id}
                style={styles.item}
                onPress={() => {
                  onSelect(place);
                  setDismissed(true);
                  setResults([]);
                }}
              >
                <Ionicons name="pin-outline" size={15} color={colors.blue} />
                <View style={styles.itemText}>
                  <Text style={styles.itemName} numberOfLines={1}>{place.name}</Text>
                  {place.label ? <Text style={styles.itemLabel} numberOfLines={1}>{place.label}</Text> : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  inputRow: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputRowOpen: { borderColor: colors.blue },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  list: { borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  searching: { padding: 13, fontSize: 13.5, color: colors.ink2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: { flex: 1 },
  itemName: { fontSize: 14.5, fontWeight: '700', color: colors.ink },
  itemLabel: { marginTop: 1, fontSize: 12, color: colors.ink2 },
});
