import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchDestinations } from '@/data/destinations';
import { colors, radii } from '@/theme';
import { searchDestinationPlaces } from '@/utils/placeSearch';

export function DestinationField({
  label,
  value,
  placeholder,
  onChangeText,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onSelect: (destination: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [remote, setRemote] = useState<string[]>([]);

  // Instant matches from the curated popular list.
  const local = useMemo(() => searchDestinations(value), [value]);

  // Full coverage (any city, state, region, country) from the geocoder,
  // debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setRemote([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDestinationPlaces(query).then((results) => {
        if (!cancelled) setRemote(results);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  // Curated hits first (instant, familiar), then geocoder results, de-duped.
  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const item of [...local, ...remote]) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    return merged.slice(0, 8);
  }, [local, remote]);

  const showList = focused && !dismissed && suggestions.length > 0 && suggestions[0].toLowerCase() !== value.trim().toLowerCase();

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, showList && styles.inputRowOpen]}>
        <Ionicons name="location-outline" size={18} color={colors.ink2} />
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7C8593"
          onChangeText={(next) => {
            setDismissed(false);
            onChangeText(next);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>

      {showList ? (
        <View style={styles.list}>
          {suggestions.map((dest) => (
            <Pressable
              key={dest}
              style={styles.item}
              onPress={() => {
                onSelect(dest);
                setDismissed(true);
              }}
            >
              <Ionicons name="navigate-outline" size={15} color={colors.blue} />
              <Text style={styles.itemText}>{dest}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: colors.ink2 },
  inputRow: {
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputRowOpen: { borderColor: colors.blue },
  input: { flex: 1, fontSize: 16, color: colors.ink },
  list: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemText: { fontSize: 15, fontWeight: '600', color: colors.ink },
});
