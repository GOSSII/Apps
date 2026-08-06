import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionTitle } from '../components/ui';
import { Confirm } from '../components/Modals';
import { colors, radius, space } from '../theme';
import { useApp } from '../store';
import { humanDuration } from '../lib/format';
import { daysUntil, parseDateInput, prettyDate } from '../lib/dates';

export default function SettingsScreen() {
  const { state, setDailyTarget, setExam, resetAll } = useApp();
  const { dailyTargetMinutes, exam } = state;

  const [examName, setExamName] = useState(exam?.name ?? '');
  const [examDate, setExamDate] = useState(exam ? prettyDate(exam.date) : '');
  const [dateError, setDateError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const saveExam = () => {
    const name = examName.trim();
    if (!name) {
      setDateError('Give the exam a name');
      return;
    }
    const parsed = parseDateInput(examDate);
    if (!parsed) {
      setDateError('Use a date like 24/05/2027');
      return;
    }
    setDateError(null);
    setExam({ name, date: parsed });
  };

  const clearExam = () => {
    setExam(null);
    setExamName('');
    setExamDate('');
    setDateError(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Settings</Text>

      <SectionTitle>Daily target</SectionTitle>
      <Card>
        <Text style={styles.target}>{humanDuration(dailyTargetMinutes * 60)}</Text>
        <Text style={styles.hint}>
          A day counts towards your streak once you cross this.
        </Text>
        <View style={styles.row}>
          <Button
            label="− 30m"
            variant="ghost"
            onPress={() => setDailyTarget(dailyTargetMinutes - 30)}
            style={styles.flex}
          />
          <Button
            label="+ 30m"
            variant="ghost"
            onPress={() => setDailyTarget(dailyTargetMinutes + 30)}
            style={styles.flex}
          />
        </View>
      </Card>

      <SectionTitle>Exam countdown</SectionTitle>
      <Card>
        {!!exam && (
          <Text style={styles.current}>
            {exam.name} · {prettyDate(exam.date)} · {daysUntil(exam.date)} days left
          </Text>
        )}
        <TextInput
          value={examName}
          onChangeText={setExamName}
          placeholder="Exam name (e.g. NEET 2027)"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <TextInput
          value={examDate}
          onChangeText={setExamDate}
          placeholder="Date — 24/05/2027"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {!!dateError && <Text style={styles.error}>{dateError}</Text>}
        <View style={styles.row}>
          {!!exam && (
            <Button label="Remove" variant="ghost" onPress={clearExam} style={styles.flex} />
          )}
          <Button label="Save" onPress={saveExam} style={styles.flex} />
        </View>
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card>
        <Text style={styles.hint}>
          Everything is stored on this phone only. No account, no upload, works
          fully offline.
        </Text>
        <Button
          label="Erase all data"
          variant="danger"
          onPress={() => setConfirmReset(true)}
          style={{ marginTop: space.md }}
        />
      </Card>

      <Text style={styles.footer}>Padhai Streak · v1.0</Text>

      <Confirm
        visible={confirmReset}
        title="Erase everything?"
        message="Subjects, sittings and streaks will all be deleted. This cannot be undone."
        confirmLabel="Erase"
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAll();
          setExamName('');
          setExamDate('');
          setConfirmReset(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: space.md },
  target: { color: colors.text, fontSize: 32, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 13, marginTop: space.xs, lineHeight: 19 },
  current: { color: colors.warn, fontWeight: '700', marginBottom: space.md },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  flex: { flex: 1 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    padding: space.md,
    minHeight: 46,
    marginBottom: space.sm
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: space.sm },
  footer: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: space.lg }
});
