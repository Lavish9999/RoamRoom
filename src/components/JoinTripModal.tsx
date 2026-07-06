import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, type } from '@/theme';

import { PrimaryButton } from './PrimaryButton';

export function JoinTripModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState('');

  function handleClose() {
    setCode('');
    onClose();
  }

  function handleSubmit() {
    if (!code.trim()) return;
    onSubmit(code);
    setCode('');
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.veil}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Join a trip</Text>
            <Pressable style={styles.iconButton} onPress={handleClose} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={type.sub}>Enter the invite code someone shared with you.</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="e.g. TOKYO-4XR2"
            placeholderTextColor="#A6A296"
            autoCapitalize="characters"
            style={styles.input}
          />
          <PrimaryButton label="Join trip" onPress={handleSubmit} disabled={!code.trim()} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: {
    flex: 1,
    backgroundColor: 'rgba(16,21,28,0.34)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.ink,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.ink,
  },
});
