import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, PrimaryButton } from '@/components';
import { StepHeader } from '@/components/StepHeader';
import { useCreateTrip, type Invitee } from '@/state/CreateTripContext';
import { useToast } from '@/state/ToastContext';
import { colors, radii, type } from '@/theme';
import { buildInviteMessage } from '@/utils/invite';
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

  function inviteMessage() {
    return buildInviteMessage({ tripName: draft.name, destination: draft.destination, code: inviteCode });
  }

  // Adds the person to the roster, then — if they entered an email or phone —
  // opens the native Mail / Messages composer prefilled with the invite so it
  // actually gets sent (there's no server that can send it for you).
  async function addInvitee() {
    const value = inputValue.trim();
    if (!value) return;
    const invitee: Invitee = { id: `${Date.now()}`, name: value, status: 'pending' };
    setDraft({ invitees: [...draft.invitees, invitee] });
    setInputValue('');

    const message = inviteMessage();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const phone = value.replace(/[^\d+]/g, '');
    const isPhone = !isEmail && phone.replace(/\D/g, '').length >= 7;

    try {
      if (isEmail) {
        await Linking.openURL(`mailto:${value}?subject=${encodeURIComponent('Join my RoamRoom trip')}&body=${encodeURIComponent(message)}`);
      } else if (isPhone) {
        const separator = Platform.OS === 'ios' ? '&' : '?';
        await Linking.openURL(`sms:${phone}${separator}body=${encodeURIComponent(message)}`);
      } else {
        // A plain name has no channel to send to — open the native share sheet
        // so they can pick how to send the invite (Messages, WhatsApp, etc.).
        await Share.share({ message });
      }
    } catch {
      toast.show('Added — tap “Share invite” to send it.');
    }
  }

  async function shareInvite() {
    try {
      await Share.share({ message: inviteMessage() });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  async function copyCode() {
    await Clipboard.setStringAsync(inviteCode);
    toast.show(`Invite code copied — ${inviteCode}`);
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
            placeholderTextColor="#98A2B3"
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

        <View style={styles.codeCard}>
          <View style={styles.codeIcon}>
            <Ionicons name="key" size={18} color={colors.blue} />
          </View>
          <Text style={styles.codeLabel}>Invite code</Text>
          <Text style={styles.codeValue}>{inviteCode}</Text>
          <Text style={styles.codeHint}>Share this code — anyone who enters it joins the trip and sees the plan, votes, and expenses.</Text>
          <View style={styles.codeActions}>
            <Pressable style={styles.copySecondary} onPress={copyCode}>
              <Ionicons name="copy-outline" size={17} color={colors.ink} />
              <Text style={styles.copySecondaryText}>Copy</Text>
            </Pressable>
            <Pressable style={styles.shareButton} onPress={shareInvite}>
              <Ionicons name="share-outline" size={17} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share invite</Text>
            </Pressable>
          </View>
        </View>
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
  codeCard: {
    marginTop: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    gap: 8,
  },
  codeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EAF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.blue,
  },
  codeValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.ink,
  },
  codeHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink2,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  codeActions: {
    marginTop: 6,
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  copySecondary: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  copySecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  shareButton: {
    flex: 1,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.btn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
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
