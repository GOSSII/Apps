import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import {
  Card, Chip, Dot, Empty, Row, SCREEN_PAD, ScreenTitle, SectionTitle
} from '../components/ui';
import { hairline, radius, space, themed, type, useColors } from '../theme';
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
  const { state, addSubject } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
  const { subjects, sessions } = state;

  const [name, setName] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const allTime = totalsBySubject(sessions);
  const existing = new Set(subjects.map(s => s.name.toLowerCase()));
  const suggestions = QUICK_ADD.filter(s => !existing.has(s.toLowerCase()));

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
      <ScreenTitle>{t('subjects')}</ScreenTitle>

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
          <Pressable
            onPress={submit}
            testID="add-subject"
            accessibilityRole="button"
            accessibilityLabel={t('add')}
            style={({ pressed }) => [styles.addBtn, pressed && styles.dim]}
          >
            <Icon name="plus" size={20} color="#FFFFFF" />
          </Pressable>
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
        <Card flush>
          {/* One tap target per row now. Rename and delete used to sit here as
              two more text buttons on every line; they live on the subject's
              own screen, which is where you are already looking when you
              decide a subject needs either. */}
          {subjects.map((subject, i) => (
            <Row
              key={subject.id}
              first={i === 0}
              title={subject.name}
              subtitle={`${t('allTimeSuffix', { time: dur(allTime[subject.id] || 0) })} · ${gapLine(subject.id)}`}
              onPress={() => setOpen(subject.id)}
              testID={`open-${subject.id}`}
              accessibilityLabel={t('subjectOpen', { name: subject.name })}
              left={<Dot color={subject.color} size={9} />}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PAD, paddingTop: space.sm, paddingBottom: 120 },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: space.md,
    minHeight: 50
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dim: { opacity: 0.6 },
  hint: { ...type.kicker, color: colors.muted, marginTop: space.lg, marginBottom: space.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }
}));
