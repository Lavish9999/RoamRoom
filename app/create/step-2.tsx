import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
import { useCreateTrip, type Invitee } from '@/state/CreateTripContext';
import { useToast } from '@/state/ToastContext';
import { colors, radii, type } from '@/theme';
import { createInviteCode } from '@/utils/inviteCode';

export default function CreateStep2() {
  const { draft, setDraft } = useCreateTrip();
  const toast = useToast();
  const [inputValue, setInputValue] = useState('');

  // Create the code once and persist it on the draft so the shared link and the
  // saved trip use the identical code (previously each was randomised separately).
  useEffect(() => {
    if (!draft.inviteCode) setDraft({ inviteCode: createInviteCode(draft.name || 'trip') });
  }, [draft.inviteCode, draft.name, setDraft]);
  const inviteCode = draft.inviteCode || createInviteCode(draft.name || 'trip');

  function addInvitee() {
    const value = inputValue.trim();
    if (!value) return;
    const invitee: Invitee = { id: `${Date.now()}`, name: value, status: 'pending' };
    setDraft({ invitees: [...draft.invitees, invitee] });
    setInputValue('');
  }

  async function copyShareLink() {
    const link = `roamroom.app/j/${inviteCode}`;
    await Clipboard.setStringAsync(link);
    toast.show(`Link copied — ${link}`);
  }

  return (
    <View style={styles.wrap}>
      <StepHeader
        step={2}
        title="Who's coming?"
        subtitle="They'll get the itinerary, votes, and expenses the moment they join."
        onBack={() => router.back()}
        onClose={() => router.dismissTo('/')}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputRow}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Name, phone, or email"
            placeholderTextColor="#7C8593"
            style={styles.input}
            onSubmitEditing={addInvitee}
            returnKeyType="done"
          />
          <Pressable style={styles.addButton} onPress={addInvitee} accessibilityLabel="Add invitee">
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {draft.invitees.map((invitee) => (
          <View key={invitee.id} style={styles.inviteeRow}>
            <View>
              <Text style={styles.inviteeName}>{invitee.name}</Text>
              <Text style={type.cap}>Invited just now</Text>
            </View>
            <Chip variant="ready" label="Pending" />
          </View>
        ))}

        <Pressable style={styles.shareButton} onPress={copyShareLink}>
          <Ionicons name="copy-outline" size={17} color={colors.ink} />
          <Text style={styles.shareButtonText}>Copy share link</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Next · Trip vibe" onPress={() => router.push('/create/step-3')} />
        <Pressable style={styles.ghostButton} onPress={() => router.push('/create/step-3')}>
          <Text style={styles.ghostButtonText}>I'll invite people later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.ink,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.btn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  shareButton: {
    marginTop: 4,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: 10,
  },
  ghostButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink2,
  },
});
