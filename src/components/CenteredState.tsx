import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme';

import { Card } from './Card';
import { PrimaryButton } from './PrimaryButton';

/**
 * Shared full-screen loading / empty state used by every tab. Pass `loading`
 * for the "getting ready" variant (shows a spinner) or an `action` label for an
 * empty state that offers to create a trip.
 */
export function CenteredState({
  eyebrow,
  title,
  copy,
  action,
  loading,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.centered}>
      <Card padded style={styles.card}>
        <Text style={type.eyebrow}>{eyebrow}</Text>
        <View style={styles.titleRow}>
          {loading ? <ActivityIndicator color={colors.blue} /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={type.body}>{copy}</Text>
        {action ? <PrimaryButton label={action} onPress={() => router.push('/create/step-1')} /> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 112 },
  card: { gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 25, lineHeight: 30, fontWeight: '800', color: colors.ink },
});
