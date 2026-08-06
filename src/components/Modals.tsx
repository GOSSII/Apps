import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { Button } from './ui';

/* Alert.alert is unreliable on web, and this app is previewed there — so
   confirmations are plain Modals that behave identically everywhere. */

export function Sheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Confirm({
  visible, title, message, confirmLabel, onConfirm, onCancel, destructive
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <Sheet visible={visible} title={title} onClose={onCancel}>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <View style={styles.row}>
        <Button label="Cancel" variant="ghost" onPress={onCancel} style={styles.flex} />
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          style={styles.flex}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: space.lg
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center'
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: space.md },
  message: { color: colors.muted, marginBottom: space.lg, lineHeight: 20 },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 }
});
