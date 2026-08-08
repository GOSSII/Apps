import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Dot, Empty, SectionTitle } from '../components/ui';
import { Confirm, Sheet } from '../components/Modals';
import { radius, space, themed, useColors } from '../theme';
import { useApp, useT, useDuration } from '../store';
import { lastStudied, totalsBySubject } from '../lib/stats';
import { dayKey, daysApart } from '../lib/dates';
import SubjectDetailScreen from './SubjectDetailScreen';

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
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
  const { subjects, sessions } = state;

  const [name, setName] = useState('');
  const [open, setOpen] = useState<string | null>(null);
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

  /* A subject can be deleted from the list while its own screen is open in
     another render; falling back to the list beats rendering a ghost. */
  const opened = subjects.find(s => s.id === open) ?? null;
  if (opened) {
    return <SubjectDetailScreen subject={opened} onBack={() => setOpen(null)} />;
  }

  const today = dayKey();
  /* The number that changes behaviour is not the total — it is how long a
     subject has been left alone. */
  const gapLine = (id: string): string => {
    const last = lastStudied(sessions, id);
    if (!last) return t('subjectNeverStudied');
    const n = daysApart(last, today);
    if (n === 0) return t('subjectStudiedToday');
    return n === 1 ? t('subjectStudiedYesterday') : t('subjectStudiedDaysAgo', { n });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{t('subjects')}</Text>

      <Card>
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder={t('addSubjectPlaceholder')}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Button label={t('add')} onPress={submit} size="sm" testID="add-subject" />
        </View>

        {suggestions.length > 0 && (
          <>
            <Text style={styles.hint}>{t('tapToAdd')}</Text>
            <View style={styles.chipWrap}>
              {suggestions.slice(0, 8).map(s => (
                <Chip key={s} label={s} onPress={() => addSubject(s)} />
              ))}
            </View>
          </>
        )}
      </Card>

      <SectionTitle>{t('yourSubjects')}</SectionTitle>

      {subjects.length === 0 ? (
        <Card><Empty title={t('nothingAdded')} hint={t('nothingAddedHint')} /></Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {subjects.map((subject, i) => (
            <View key={subject.id} style={[styles.row, i > 0 && styles.divider]}>
              <Dot color={subject.color} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('subjectOpen', { name: subject.name })}
                onPress={() => setOpen(subject.id)}
                testID={`open-${subject.id}`}
                style={styles.flex}
              >
                <Text style={styles.name}>{subject.name}</Text>
                <Text style={styles.meta}>
                  {t('allTimeSuffix', { time: dur(allTime[subject.id] || 0) })}
                  {' · '}
                  {gapLine(subject.id)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('rename')} — ${subject.name}`}
                onPress={() => setEditing({ id: subject.id, name: subject.name })}
                style={styles.action}
              >
                <Text style={styles.actionText}>{t('rename')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('delete')} — ${subject.name}`}
                onPress={() => setDeleting(subject.id)}
                style={styles.action}
              >
                <Text style={[styles.actionText, styles.destructive]}>{t('delete')}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Sheet
        visible={editing !== null}
        title={t('renameSubject')}
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
            label={t('cancel')}
            variant="ghost"
            onPress={() => setEditing(null)}
            style={styles.flex}
          />
          <Button
            label={t('save')}
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
        title={t('deleteSubjectTitle', { name: deletingSubject?.name ?? '' })}
        message={
          deletingSessions > 0
            ? t('deleteSubjectWithSessions', { n: deletingSessions })
            : t('cannotUndo')
        }
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
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

const useStyles = themed((colors) => StyleSheet.create({
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
  action: { paddingHorizontal: space.sm, paddingVertical: space.sm, minHeight: 44, justifyContent: 'center' },
  actionText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  destructive: { color: colors.danger },
  sheetRow: { flexDirection: 'row', gap: space.md }
}));
