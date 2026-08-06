import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Dot, Empty, SectionTitle } from '../components/ui';
import { Confirm, Sheet } from '../components/Modals';
import { colors, radius, space } from '../theme';
import { useApp } from '../store';
import { humanDuration } from '../lib/format';
import { totalsBySubject } from '../lib/stats';

/* Covers the common exam tracks without making the user type on a phone
   keyboard on day one. */
const QUICK_ADD = [
  'Physics', 'Chemistry', 'Maths', 'Biology',
  'Polity', 'History', 'Geography', 'Economy',
  'Current Affairs', 'CSAT', 'Optional', 'English',
  'Reasoning', 'Revision', 'Mock Test'
];

export default function SubjectsScreen() {
  const { state, addSubject, renameSubject, deleteSubject } = useApp();
  const { subjects, sessions } = state;

  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const allTime = totalsBySubject(sessions);
  const existing = new Set(subjects.map(s => s.name.toLowerCase()));
  const suggestions = QUICK_ADD.filter(s => !existing.has(s.toLowerCase()));
  const deletingSubject = subjects.find(s => s.id === deleting) || null;
  const deletingSessions = deleting
    ? sessions.filter(s => s.subjectId === deleting).length
    : 0;

  const submit = () => {
    addSubject(name);
    setName('');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Subjects</Text>

      <Card>
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder="Add a subject"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Button label="Add" onPress={submit} size="sm" />
        </View>

        {suggestions.length > 0 && (
          <>
            <Text style={styles.hint}>Tap to add</Text>
            <View style={styles.chipWrap}>
              {suggestions.slice(0, 8).map(s => (
                <Chip key={s} label={s} onPress={() => addSubject(s)} />
              ))}
            </View>
          </>
        )}
      </Card>

      <SectionTitle>Your subjects</SectionTitle>

      {subjects.length === 0 ? (
        <Card><Empty title="Nothing added yet" hint="Add a few subjects above to start tracking." /></Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {subjects.map((subject, i) => (
            <View key={subject.id} style={[styles.row, i > 0 && styles.divider]}>
              <Dot color={subject.color} />
              <View style={styles.flex}>
                <Text style={styles.name}>{subject.name}</Text>
                <Text style={styles.meta}>
                  {humanDuration(allTime[subject.id] || 0)} all time
                </Text>
              </View>
              <Pressable
                onPress={() => setEditing({ id: subject.id, name: subject.name })}
                style={styles.action}
              >
                <Text style={styles.actionText}>Rename</Text>
              </Pressable>
              <Pressable onPress={() => setDeleting(subject.id)} style={styles.action}>
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Sheet
        visible={editing !== null}
        title="Rename subject"
        onClose={() => setEditing(null)}
      >
        <TextInput
          value={editing?.name ?? ''}
          onChangeText={text => setEditing(e => (e ? { ...e, name: text } : e))}
          style={[styles.input, styles.sheetInput]}
          placeholderTextColor={colors.muted}
        />
        <View style={styles.sheetRow}>
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setEditing(null)}
            style={styles.flex}
          />
          <Button
            label="Save"
            onPress={() => {
              if (editing) renameSubject(editing.id, editing.name);
              setEditing(null);
            }}
            style={styles.flex}
          />
        </View>
      </Sheet>

      <Confirm
        visible={deleting !== null}
        title={`Delete ${deletingSubject?.name ?? 'subject'}?`}
        message={
          deletingSessions > 0
            ? `${deletingSessions} logged sitting${deletingSessions === 1 ? '' : 's'} will be deleted too. This cannot be undone.`
            : 'This cannot be undone.'
        }
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteSubject(deleting);
          setDeleting(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: space.md },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    padding: space.md,
    minHeight: 46
  },
  sheetInput: { flex: 0, marginBottom: space.lg },
  hint: { color: colors.muted, fontSize: 12, marginTop: space.lg, marginBottom: space.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  flex: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  action: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  actionText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  sheetRow: { flexDirection: 'row', gap: space.md }
});
