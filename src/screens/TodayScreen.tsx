import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ring } from '../components/Ring';
import { Icon } from '../components/Icon';
import {
  Button, Card, Chip, Dot, Empty, SCREEN_PAD, Segmented, SectionTitle
} from '../components/ui';
import { Sheet } from '../components/Modals';
import { hairline, radius, space, themed, type, useColors } from '../theme';
import { useApp, useDuration, useT, useToday } from '../store';
import { daysUntil, prettyDate } from '../lib/dates';
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

/* The dashboard: one dial, one row of round lengths, one row of subjects, one
   button. Everything else on this screen is a read-out.

   The subjects used to be pills in a wrapped row, which meant a five-subject
   timetable reflowed every time one of them gained a time. They are cards on a
   rail now: fixed width, fixed order, and each one carries its own colour and
   what it has had today, so "which have I not touched" is answerable without
   opening anything. */

export default function TodayScreen({ onManageSubjects }: { onManageSubjects: () => void }) {
  const { state, startTimer, logManual, setPomodoro } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
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

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.greeting}>{t(greetingKey())}</Text>
          <Text style={styles.date}>{prettyDate(today)}</Text>
        </View>
        <View style={[styles.streak, streak > 0 && styles.streakOn]} testID="streak-pill">
          <Icon
            name="flame"
            size={15}
            color={streak > 0 ? colors.accentText : colors.muted}
            strokeWidth={2}
          />
          <Text style={[styles.streakText, streak > 0 && styles.streakTextOn]}>
            {streak === 0
              ? t('noStreak')
              : t(streak === 1 ? 'streakDays' : 'streakDaysPlural', { n: streak })}
          </Text>
        </View>
      </View>

      <View style={styles.dialWrap}>
        <Ring
          size={244}
          stroke={14}
          progress={todaySeconds / targetSeconds}
          color={done ? colors.good : colors.accent}
          gradientTo={done ? colors.good : colors.accentGlow}
        >
          <Text style={styles.bigTime} testID="dial-total">{dur(todaySeconds)}</Text>
          <Text style={styles.dialCaption}>
            {t('ofTarget', { target: dur(targetSeconds) })}
          </Text>
          <View style={[styles.dialPill, done && styles.dialPillDone]}>
            <Text style={[styles.dialSub, done && styles.dialSubDone]} testID="dial-remaining">
              {done
                ? t('targetDone', { time: dur(todaySeconds - targetSeconds) })
                : t('toGo', { time: dur(remaining) })}
            </Text>
          </View>
        </Ring>
      </View>

      {!!exam && (
        <View style={styles.exam}>
          <Icon name="target" size={15} color={colors.muted} />
          <Text style={styles.examText}>{examLine(t, exam.name, daysUntil(exam.date))}</Text>
        </View>
      )}

      {subjects.length === 0 ? (
        <Card>
          <Empty title={t('noSubjectsTitle')} hint={t('noSubjectsHint')} />
          <Button
            label={t('addSubjects')}
            icon="plus"
            onPress={onManageSubjects}
            testID="add-subjects"
            style={styles.topGap}
          />
        </Card>
      ) : (
        <>
          <SectionTitle>{t('roundLength')}</SectionTitle>
          <Segmented
            value={pomodoro.preset}
            onChange={choosePreset}
            options={PRESET_ORDER.map(key => ({
              value: key,
              label: t(PRESET_LABEL[key]),
              testID: `preset-${key}`
            }))}
          />

          <SectionTitle style={styles.railTitle}>{t('pickSubject')}</SectionTitle>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            /* Bled to the screen edge so the last card is visibly cut off —
               that overhang is the only thing telling anyone the rail scrolls. */
            style={styles.railBleed}
            contentContainerStyle={styles.rail}
          >
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
                    styles.subjectCard,
                    on && { borderColor: s.color, backgroundColor: colors.surface },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <View style={styles.subjectTop}>
                    <Dot color={s.color} size={8} />
                    {on && <Icon name="check" size={13} color={s.color} strokeWidth={2.8} />}
                  </View>
                  <Text style={[styles.subjectName, on && styles.subjectNameOn]} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={styles.subjectSecs}>
                    {secs > 0 ? dur(secs) : t('subjectNoneToday')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button
            label={subject ? t('startOn', { subject: subject.name }) : t('startFocus')}
            icon="play"
            testID="start-focus"
            onPress={() => subject && startTimer(subject.id)}
            style={styles.start}
          />
          <Text style={styles.roundNote}>
            {pomodoro.preset === 'open'
              ? t('openSession')
              : t('roundNote', {
                  focus: pomodoro.focusMinutes,
                  brk: pomodoro.breakMinutes
                })}
          </Text>

          <Pressable
            onPress={() => setLogFor(subjects[0].id)}
            testID="log-manually"
            style={styles.manual}
          >
            <Text style={styles.manualText}>{t('logManually')}</Text>
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

/** Reads the phone's clock rather than the app's day key: this is a greeting,
 *  and at 00:30 "good evening" is wrong even though the day has rolled. */
function greetingKey(): Key {
  const hour = new Date().getHours();
  if (hour < 5) return 'greetNight';
  if (hour < 12) return 'greetMorning';
  if (hour < 17) return 'greetAfternoon';
  return 'greetEvening';
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

const useStyles = themed((colors) => StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PAD, paddingTop: space.sm, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flex: { flex: 1 },
  greeting: { ...type.h1, color: colors.text },
  date: { ...type.caption, color: colors.muted, marginTop: 2 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    marginTop: 4
  },
  streakOn: { backgroundColor: colors.accentSoft },
  streakText: { ...type.label, color: colors.muted },
  streakTextOn: { color: colors.accentText, fontWeight: '700' },

  dialWrap: { alignItems: 'center', marginTop: space.lg, marginBottom: space.md },
  bigTime: { ...type.display, color: colors.text },
  dialCaption: { ...type.caption, color: colors.muted, marginTop: 2 },
  dialPill: {
    marginTop: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    paddingHorizontal: space.md,
    paddingVertical: 5
  },
  dialPillDone: { backgroundColor: colors.accentSoft },
  dialSub: { ...type.caption, color: colors.muted, textAlign: 'center' },
  dialSubDone: { color: colors.good, fontWeight: '700' },

  exam: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: space.lg
  },
  examText: { ...type.label, color: colors.muted },

  railTitle: { marginTop: space.lg },
  /* Negative margin cancels the screen padding so the rail runs edge to edge;
     the padding is put back on the content so the first card still lines up. */
  railBleed: { marginHorizontal: -SCREEN_PAD },
  rail: { paddingHorizontal: SCREEN_PAD, gap: space.sm, paddingVertical: 2 },
  subjectCard: {
    width: 124,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    gap: space.xs,
    minHeight: 96,
    justifyContent: 'space-between'
  },
  subjectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 14 },
  subjectName: { ...type.title, color: colors.muted },
  subjectNameOn: { color: colors.text, fontWeight: '700' },
  subjectSecs: { ...type.caption, color: colors.muted, ...type.numeric },

  start: { marginTop: space.lg },
  topGap: { marginTop: space.md },
  roundNote: { ...type.caption, color: colors.muted, textAlign: 'center', marginTop: space.sm },
  manual: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: space.sm },
  manualText: { ...type.label, color: colors.accentText },

  label: { ...type.label, color: colors.muted, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  input: {
    backgroundColor: colors.bg,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    padding: space.md,
    minHeight: 50,
    marginBottom: space.lg
  }
}));
