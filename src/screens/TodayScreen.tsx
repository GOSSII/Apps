import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Button, Card, Chip, Dot, Empty, ProgressBar, SectionTitle } from '../components/ui';
import { Sheet } from '../components/Modals';
import { colors, radius, space } from '../theme';
import { elapsedOf, useApp, useT, useTicker, useDuration } from '../store';
import { clockDuration } from '../lib/format';
import { dayKey, daysUntil } from '../lib/dates';
import { currentStreak, dayTotals, totalsBySubject } from '../lib/stats';

const KEEP_AWAKE_TAG = 'padhai-timer';

export default function TodayScreen({ onManageSubjects }: { onManageSubjects: () => void }) {
  const {
    state, startTimer, pauseTimer, resumeTimer, stopTimer, discardTimer, logManual
  } = useApp();
  const t = useT();
  const dur = useDuration();
  const { active, subjects, sessions, dailyTargetMinutes, exam } = state;

  const running = !!active?.runningSince;
  useTicker(running);

  /* The screen must not sleep mid-sitting — the phone is usually propped up
     next to the books. */
  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => { deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {}); };
  }, [running]);

  const today = dayKey();
  const targetSeconds = dailyTargetMinutes * 60;

  const totals = useMemo(() => dayTotals(sessions), [sessions]);
  const savedToday = totals[today] || 0;
  const live = elapsedOf(active);
  const todaySeconds = savedToday + live;

  const streak = useMemo(
    () => currentStreak(totals, targetSeconds),
    [totals, targetSeconds]
  );

  const perSubjectToday = useMemo(
    () => totalsBySubject(sessions.filter(s => s.day === today)),
    [sessions, today]
  );

  const activeSubject = subjects.find(s => s.id === active?.subjectId) || null;
  const remaining = Math.max(0, targetSeconds - todaySeconds);
  const done = remaining === 0;

  const [logFor, setLogFor] = useState<string | null>(null);
  const [logMinutes, setLogMinutes] = useState('');

  const submitManual = () => {
    const minutes = Number(logMinutes.replace(/[^\d.]/g, ''));
    if (logFor && minutes > 0) logManual(logFor, minutes);
    setLogFor(null);
    setLogMinutes('');
  };

  const streakLabel = streak === 0
    ? t('noStreak')
    : t(streak === 1 ? 'streakDays' : 'streakDaysPlural', { n: streak });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t('today')}</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>{streakLabel}</Text>
        </View>
      </View>

      <Card>
        <Text style={styles.bigTime}>{dur(todaySeconds)}</Text>
        <Text style={styles.subtle}>{t('ofTarget', { target: dur(targetSeconds) })}</Text>
        <View style={{ marginTop: space.md }}>
          <ProgressBar
            value={todaySeconds / targetSeconds}
            color={done ? colors.good : colors.accent}
            height={12}
          />
        </View>
        <Text style={[styles.subtle, { marginTop: space.sm }]}>
          {done
            ? t('targetDone', { time: dur(todaySeconds - targetSeconds) })
            : t('toGo', { time: dur(remaining) })}
        </Text>

        {!!exam && (
          <View style={styles.examRow}>
            <Text style={styles.examText}>{examLine(t, exam.name, daysUntil(exam.date))}</Text>
          </View>
        )}
      </Card>

      {!!active && (
        <Card style={{ borderColor: activeSubject?.color ?? colors.accent }}>
          <View style={styles.rowCenter}>
            <Dot color={activeSubject?.color ?? colors.accent} />
            <Text style={styles.runningName}>{activeSubject?.name ?? t('subject')}</Text>
          </View>
          <Text style={styles.clock}>{clockDuration(live)}</Text>
          <View style={styles.row}>
            <Button
              label={running ? t('pause') : t('resume')}
              variant="ghost"
              onPress={running ? pauseTimer : resumeTimer}
              style={styles.flex}
            />
            <Button label={t('saveSession')} onPress={() => stopTimer()} style={styles.flex} />
          </View>
          <Pressable onPress={discardTimer} style={styles.discard}>
            <Text style={styles.discardText}>{t('discardSitting')}</Text>
          </Pressable>
        </Card>
      )}

      <SectionTitle>{t('subjects')}</SectionTitle>

      {subjects.length === 0 ? (
        <Card>
          <Empty title={t('noSubjectsTitle')} hint={t('noSubjectsHint')} />
          <Button label={t('addSubjects')} onPress={onManageSubjects} />
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {subjects.map((subject, i) => {
            const isActive = active?.subjectId === subject.id;
            const secs = (perSubjectToday[subject.id] || 0) + (isActive ? live : 0);
            return (
              <View key={subject.id} style={[styles.subjectRow, i > 0 && styles.divider]}>
                <Dot color={subject.color} />
                <View style={styles.flex}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectTime}>
                    {secs > 0
                      ? t('todaySuffix', { time: dur(secs) })
                      : t('notStartedToday')}
                  </Text>
                </View>
                <Button
                  label={isActive ? t('running') : t('start')}
                  size="sm"
                  variant={isActive ? 'ghost' : 'primary'}
                  disabled={isActive}
                  onPress={() => startTimer(subject.id)}
                  testID={`start-${subject.id}`}
                />
              </View>
            );
          })}
        </Card>
      )}

      {subjects.length > 0 && (
        <Button
          label={t('logManually')}
          variant="ghost"
          testID="log-manually"
          onPress={() => setLogFor(subjects[0].id)}
        />
      )}

      <Sheet visible={logFor !== null} title={t('logTime')} onClose={() => setLogFor(null)}>
        <Text style={styles.label}>{t('subject')}</Text>
        <View style={styles.chipWrap}>
          {subjects.map(s => (
            <Chip
              key={s.id}
              label={s.name}
              selected={logFor === s.id}
              onPress={() => setLogFor(s.id)}
            />
          ))}
        </View>
        <Text style={styles.label}>{t('minutesStudied')}</Text>
        <TextInput
          value={logMinutes}
          onChangeText={setLogMinutes}
          keyboardType="number-pad"
          placeholder={t('minutesPlaceholder')}
          placeholderTextColor={colors.muted}
          testID="manual-minutes"
          style={styles.input}
        />
        <View style={styles.row}>
          <Button
            label={t('cancel')}
            variant="ghost"
            onPress={() => setLogFor(null)}
            style={styles.flex}
          />
          <Button label={t('add')} onPress={submitManual} style={styles.flex} testID="manual-add" />
        </View>
      </Sheet>
    </ScrollView>
  );
}

function examLine(
  t: (key: 'examIn' | 'examTomorrow' | 'examToday' | 'examPast', p?: Record<string, string | number>) => string,
  name: string,
  days: number
): string {
  if (days > 1) return t('examIn', { name, n: days });
  if (days === 1) return t('examTomorrow', { name });
  if (days === 0) return t('examToday', { name });
  return t('examPast', { name, n: Math.abs(days) });
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md
  },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  streakPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6
  },
  streakText: { color: colors.text, fontWeight: '700' },
  bigTime: { color: colors.text, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  subtle: { color: colors.muted },
  examRow: {
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line
  },
  examText: { color: colors.warn, fontWeight: '700' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  runningName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  clock: {
    color: colors.text,
    fontSize: 46,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginVertical: space.md,
    textAlign: 'center'
  },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  discard: { alignSelf: 'center', padding: space.md },
  discardText: { color: colors.muted, fontSize: 13 },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  subjectName: { color: colors.text, fontWeight: '700', fontSize: 16 },
  subjectTime: { color: colors.muted, fontSize: 13, marginTop: 2 },
  label: { color: colors.muted, marginBottom: space.sm, fontSize: 13 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 18,
    padding: space.md,
    marginBottom: space.lg
  }
});
