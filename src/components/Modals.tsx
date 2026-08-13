import React from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View
} from 'react-native';
import { hairline, radius, space, themed, type } from '../theme';
import { Button } from './ui';

/* Alert.alert is unreliable on web, and this app is previewed there — so
   confirmations are plain Modals that behave identically everywhere.

   These are bottom sheets rather than centred dialogs. A centred dialog on a
   6.7" phone puts its Save button in the middle of the screen, which is the
   one place a thumb cannot reach; and the sheet that slides up from the bottom
   is the shape people already know means "this is a step, not a new place".

   The keyboard handling below has no visible effect in the browser preview,
   because a browser has no soft keyboard. On a phone it is the difference
   between a usable sheet and a trap: RN's Modal does not move for the keyboard,
   so a sheet with a text field ends up with its input and its Save button
   underneath it — and the only thing still tappable is the backdrop, which
   closes the sheet and throws the entry away. */

export function Sheet({ visible, title, onClose, children }: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            {/* Decorative: the affordance is the backdrop, which is tappable
                everywhere. It is here because a sheet without one reads as a
                screen that has gone wrong rather than one you can dismiss. */}
            <View style={styles.grabber} />
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
  const styles = useStyles();
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

const useStyles = themed((colors, shadow) => StyleSheet.create({
  fill: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end'
  },
  sheet: {
    ...shadow,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: hairline,
    borderColor: colors.line,
    width: '100%',
    maxWidth: 560,
    /* Room to shrink when the keyboard takes the bottom half of the screen. */
    maxHeight: '92%',
    alignSelf: 'center',
    paddingTop: space.sm
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: space.xs
  },
  sheetBody: { padding: space.lg, paddingBottom: space.xxl },
  title: { ...type.h2, color: colors.text, marginBottom: space.lg },
  message: { ...type.body, color: colors.muted, marginBottom: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 }
}));
