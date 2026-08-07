import React from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View
} from 'react-native';
import { cardShadow, colors, radius, space } from '../theme';
import { Button } from './ui';

/* Alert.alert is unreliable on web, and this app is previewed there — so
   confirmations are plain Modals that behave identically everywhere.

   The keyboard handling below has no visible effect in that preview, because
   a browser has no soft keyboard. On a phone it is the difference between a
   usable sheet and a trap: RN's Modal does not move for the keyboard, so a
   centred sheet with a text field ends up with its input and its Save button
   underneath it — and the only thing still tappable is the backdrop, which
   closes the sheet and throws the entry away. */

export function Sheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, cardShadow]} onPress={e => e.stopPropagation()}>
            <ScrollView
              /* So a tap on Save lands on Save rather than being eaten by the
                 keyboard dismissing. */
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>{title}</Text>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Confirm({
  visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, destructive
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  /** Passed in rather than hardcoded — this dialog appears in Hindi too. */
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  return (
    <Sheet visible={visible} title={title} onClose={onCancel}>
      {!!message && <Text style={styles.message}>{message}</Text>}
      <View style={styles.row}>
        <Button label={cancelLabel} variant="ghost" onPress={onCancel} style={styles.flex} />
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
  fill: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 32, 90, 0.32)',
    justifyContent: 'center',
    padding: space.lg
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
    maxWidth: 480,
    /* Room to shrink when the keyboard takes the bottom half of the screen. */
    maxHeight: '100%',
    alignSelf: 'center'
  },
  sheetBody: { padding: space.lg },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: space.md },
  message: { color: colors.muted, marginBottom: space.lg, lineHeight: 20 },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 }
});
