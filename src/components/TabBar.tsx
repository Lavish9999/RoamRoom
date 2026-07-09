import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  map: 'map-outline',
  plan: 'calendar-outline',
  expenses: 'card-outline',
  memories: 'images-outline',
};

const labels: Record<string, string> = {
  index: 'Trips',
  map: 'Map',
  plan: 'Plan',
  expenses: 'Expenses',
  memories: 'Memories',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <BlurView intensity={40} tint="light" style={styles.bar}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const icon = icons[route.name] ?? 'ellipse-outline';
          const label = labels[route.name] ?? route.name;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.item, isActive && styles.itemActive]}
            >
              <Ionicons name={icon} size={22} color={isActive ? colors.blue : '#98A2B3'} />
              <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  bar: {
    height: 76,
    borderRadius: radii.lg - 2,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  item: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: {
    backgroundColor: 'rgba(37,99,255,0.12)',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#98A2B3',
  },
  labelActive: {
    color: colors.blue,
  },
});
