import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ring } from '../components/Ring';
import { Button, Card, Chip, Dot, Empty, SectionTitle } from '../components/ui';
import { Sheet } from '../components/Modals';
import { colors, radius, space } from '../theme';
import { useApp, useDuration, useT, useToday } from '../store';
import { daysUntil } from '../lib/dates';
import { currentStreak, dayTotals, totalsBySubject } from '../lib/stats';
import { PRESETS, PRESET_ORDER, clampMinutes } from '../lib/presets';
import type { Key } from '../i18n';
import type { PresetKey } from '../types';

const PRESET_LABEL: Record<PresetKey, Key> = {
  open: 'presetOpen',
  starter: 'presetStarter',
  standard: 'presetStandard',
  deep: 'presetDeep',
  custom: 'presetCustom'
};

/* The dashboard: one dial, one row of round lengths, one row of subjects,
   one button. Everything else on this screen is a read-out. */
export default function TodayScreen({ onManageSubjects }: { onManageSubjects: () => void }) {
  const { state, startTimer, logManual, setPomodoro } = useApp();
  const t = useT();
  const dur = useDuration();
  const { subjects, sessions, dailyTargetMinutes, exam, pomodoro } = state;

  const today = useToday();
  const targetSeconds = dailyTargetMinutes * 60;

  const totals = useMemo(() => dayTotals(sessions), [sessions]);
  const todaySeconds = totals[today] || 0;
  const streak = useMemo(() => currentStreak(totals, targetSeconds), [totals, targetSeconds]);
  const perSubjectToday = useMemo(
    () => totalsBySubject(sessions.filter(s => s.day === today)),
    [sessions, today]
  );

  const remaining = Math.max(0, targetSeconds - todaySeconds);
  const done = remaining === 0;

  const [picked, setPicked] = useState<string | null>(null);
  const subject = subjects.find(s => s.id === picked) ?? subjects[0] ?? null;

  const [customOpen, setCustomOpen] = useState(false);
  const [customFocus, setCustomFocus] = useState(String(pomodoro.focusMinutes || 30));
  const [customBreak, setCustomBreak] = useState(String(pomodoro.breakMinutes || 5));

  const [logFor, setLogFor] = useState<string | null>(null);
  const [logMinutes, setLogMinutes] = useState('');

  const choosePreset = (key: PresetKey) => {
    if (key === 'custom') { setCustomOpen(true); return; }
    setPomodoro(PRESETS[key]);
  };

  const saveCustom = () => {
    setPomodoro({
      preset: 'custom',
      focusMinutes: clampMinutes(Number(customFocus)),
      breakMinutes: clampMinutes(Number(customBreak), 60)
    });
    setCustomOpen(false);
  };

  const submitManual = () => {
    const minutes = Number(logMinutes.replace(/[^\d.]/g, ''));
    if (logFor && minutes > 0) logManual(logFor, minutes);
    setLogFor(null);
    setLogMinutes('');
  };

  const streakLabel = streak === 0
    ? t('noStreak')
    : t(streak === 1 ? 'streakDays' : 'streakDaysPlural', { n: streak });

  const roundCaption = pomodoro.preset === 'open'
    ? t('openSession')
    : `${pomodoro.focusMinutes} / ${pomodoro.breakMinutes}`;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.h1}>{t('today')}</Text>
        <View style={styles.streakPill}>
          <Text style={styles.streakText}>{streakLabel}</Text>
        </View>
      </View>

      <View style={styles.dialWrap}>
        <Ring
          size={252}
          stroke={16}
          progress={todaySeconds / targetSeconds}
          color={done ? colors.good : colors.accent}
          gradientTo={done ? colors.good : '#b49bff'}
        >
          <Text style={styles.bigTime} testID="dial-total">{dur(todaySeconds)}</Text>
          <Text style={styles.dialCaption}>
            {t('ofTarget', { target: dur(targetSeconds) })}
          </Text>
          <Text style={[styles.dialSub, done && { color: colors.good }]} testID="dial-remaining">
            {done
              ? t('targetDone', { time: dur(todaySeconds - targetSeconds) })
              : t('toGo', { time: dur(remaining) })}
          </Text>
        </Ring>
      </View>

      {!!exam && (
        <Text style={styles.examText}>{examLine(t, exam.name, daysUntil(exam.date))}</Text>
      )}

      {subjects.length === 0 ? (
        <Card>
          <Empty title={t('noSubjectsTitle')} hint={t('noSubjectsHint')} />
          <Button label={t('addSubjects')} onPress={onManageSubjects} testID="add-subjects" />
        </Card>
      ) : (
        <>
          <SectionTitle>{t('roundLength')}</SectionTitle>
          <View style={styles.chipWrap}>
            {PRESET_ORDER.map(key => (
              <Chip
                key={key}
                label={t(PRESET_LABEL[key])}
                selected={pomodoro.preset === key}
                onPress={() => choosePreset(key)}
                testID={`preset-${key}`}
              />
            ))}
          </View>

          <SectionTitle>{t('whatStudying')}</SectionTitle>
          <View style={styles.chipWrap}>
            {subjects.map(s => {
              const secs = perSubjectToday[s.id] || 0;
              const on = subject?.id === s.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on, checked: on }}
                  aria-checked={on}
                  accessibilityLabel={secs > 0
                    ? `${s.name}, ${t('todaySuffix', { time: dur(secs) })}`
                    : s.name}
                  onPress={() => setPicked(s.id)}
                  testID={`pick-${s.id}`}
                  style={({ pressed }) => [
                    styles.subjectChip,
                    on && { borderColor: s.color, backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Dot color={s.color} />
                  <Text style={[styles.subjectName, on && { color: colors.text }]}>{s.name}</Text>
                  {secs > 0 && <Text style={styles.subjectSecs}>{dur(secs)}</Text>}
                </Pressable>
              );
            })}
          </View>

          <Button
            label={t('startFocus')}
            testID="start-focus"
            onPress={() => subject && startTimer(subject.id)}
            style={styles.start}
          />
          <Text style={styles.roundNote}>{roundCaption}</Text>

          <Pressable onPress={() => setLogFor(subjects[0].id)} testID="log-manually">
            <Text style={styles.manual}>{t('logManually')}</Text>
          </Pressable>
        </>
      )}

      <Sheet visible={customOpen} title={t('presetCustom')} onClose={() => setCustomOpen(false)}>
        <Text style={styles.label}>{t('customFocusMinutes')}</Text>
        <TextInput
          value={customFocus}
          onChangeText={setCustomFocus}
          keyboardType="number-pad"
          style={styles.input}
          testID="custom-focus"
          placeholderTextColor={colors.muted}
        />
        <Text style={styles.label}>{t('customBreakMinutes')}</Text>
        <TextInput
          value={customBreak}
          onChangeText={setCustomBreak}
          keyboardType="number-pad"
          style={styles.input}
          testID="custom-break"
          placeholderTextColor={colors.muted}
        />
        <View style={styles.row}>
          <Button
            label={t('cancel')}
            variant="ghost"
            onPress={() => setCustomOpen(false)}
            style={styles.flex}
          />
          <Button label={t('save')} onPress={saveCustom} style={styles.flex} testID="custom-save" />
        </View>
      </Sheet>

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
  t: (key: Key, p?: Record<string, string | number>) => string,
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
    justifyContent: 'space-between'
  },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  streakPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6
  },
  streakText: { color: colors.text, fontWeight: '700' },
  dialWrap: { alignItems: 'center', marginVertical: space.lg },
  bigTime: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  dialCaption: { color: colors.muted, fontSize: 13, marginTop: 2 },
  dialSub: { color: colors.muted, fontSize: 13, marginTop: 10, textAlign: 'center' },
  examText: {
    color: colors.warn,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: space.lg
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    marginRight: space.sm,
    marginBottom: space.sm,
    gap: 2
  },
  subjectName: { color: colors.muted, fontWeight: '700' },
  subjectSecs: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: space.sm,
    fontVariant: ['tabular-nums']
  },
  start: { marginTop: space.md },
  roundNote: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: space.sm,
    fontVariant: ['tabular-nums']
  },
  manual: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: space.xl,
    fontSize: 14,
    fontWeight: '600'
  },
  label: { color: colors.muted, marginBottom: space.sm, fontSize: 13 },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
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
