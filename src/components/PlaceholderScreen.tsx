import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme';

import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';

export function PlaceholderScreen({ tripName, copy }: { tripName?: string; copy: string }) {
  return (
    <View style={styles.wrap}>
      <Card padded style={styles.card}>
        <Text style={type.eyebrow}>MVP module</Text>
        <Text style={styles.title}>{tripName ?? 'Create a trip first'}</Text>
        <Text style={type.body}>{tripName ? copy : 'Trips are now stored locally. Create one first, then we can wire this module to real trip data.'}</Text>
        <PrimaryButton
          label={tripName ? 'Build this next' : 'Create trip'}
          variant="primary"
          onPress={() => (tripName ? undefined : router.push('/create/step-1'))}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingBottom: 112,
    justifyContent: 'center',
  },
  card: {
    gap: 10,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.ink,
  },
});
