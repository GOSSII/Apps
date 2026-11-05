import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Button, Chip, SCREEN_PAD, Segmented } from '../components/ui';
import { hairline, radius, space, themed, type, useColors } from '../theme';
import { useApp, useDuration, useT } from '../store';
import { LANGUAGES, type Lang } from '../i18n';
import { parseDateInput } from '../lib/dates';

/* First run, and only first run.

   Four questions, three of them skippable, none of them a form the user has to
   fight. They exist because the alternative is what the app did before: drop a
   new user on an empty dial with a four-hour target nobody chose, in English
   whether or not they read English, and no countdown — with the settings that
   would fix all three buried two taps away in a screen they have no reason to
   open yet.

   Language is asked first and applied immediately, so every screen after it is
   in the language the user just picked. */

const STEPS = 4;

/* The tracks this app is actually used for. Proper nouns, so they are not
   translated — an aspirant searching for "UPSC" wants to see "UPSC". */
const EXAMS = [
  'JEE Mains', 'JEE Advanced', 'NEET', 'UPSC CSE',
  'SSC CGL', 'CAT', 'GATE', 'CLAT', 'Board Exams'
];

const TARGETS = [120, 180, 240, 360, 480];

/** "JEE Mains" and "JEE Advanced" are different exams; slugging on the first
 *  word alone gave them the same testID, which is ambiguous to a test and to
 *  anything else driving the app. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const SUBJECTS = [
  'Physics', 'Chemistry', 'Maths', 'Biology',
  'Polity', 'History', 'Geography', 'Economy',
  'Current Affairs', 'CSAT', 'Optional', 'English',
  'Reasoning', 'Revision', 'Mock Test'
];

export default function OnboardingScreen() {
  const {
    state, setLang, setExam, setDailyTarget, addSubject, finishOnboarding
  } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();

  const [step, setStep] = useState(0);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const chosen = useMemo(
    () => new Set(state.subjects.map(s => s.name.toLowerCase())),
    [state.subjects]
  );

  /* Saved on the way out of the step rather than on every keystroke, so a
     half-typed date never lands in state. An unparseable date is a reason to
     stay put; an empty one just means no countdown, which is allowed. */
  const commitExam = (): boolean => {
    const name = examName.trim();
    if (!name && !examDate.trim()) {
      setExam(null);
      setDateError(null);
      return true;
    }
    if (!name) { setDateError(t('examNeedsName')); return false; }
    const parsed = parseDateInput(examDate);
    if (!parsed) { setDateError(t('examBadDate')); return false; }
    setExam({ name, date: parsed });
    setDateError(null);
    return true;
  };

  const next = () => {
    if (step === 1 && !commitExam()) return;
    if (step === STEPS - 1) { finishOnboarding(); return; }
    setStep(s => s + 1);
  };

  const back = () => {
    setDateError(null);
    setStep(s => Math.max(0, s - 1));
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.step}>{t('obStep', { n: step + 1, total: STEPS })}</Text>
        <Pressable onPress={finishOnboarding} testID="ob-skip" style={styles.skip}>
          <Text style={styles.skipText}>{t('obSkip')}</Text>
        </Pressable>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <View style={styles.mark}>
              <Icon name="timer" size={28} color={colors.accentText} strokeWidth={1.9} />
            </View>
            <Text style={styles.title} testID="ob-title">{t('obWelcomeTitle')}</Text>
            <Text style={styles.body1}>{t('obWelcomeBody')}</Text>
            <Segmented
              value={state.lang}
              onChange={(key: Lang) => setLang(key)}
              options={LANGUAGES.map(o => ({
                value: o.key, label: o.label, testID: `ob-lang-${o.key}`
              }))}
            />
            {/* Last, not before the control: sitting above it this reads as its
                label rather than as the closing reassurance it is. */}
            <Text style={styles.aside}>{t('obWelcomeOffline')}</Text>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title} testID="ob-title">{t('obExamTitle')}</Text>
            <Text style={styles.body1}>{t('obExamBody')}</Text>
            <View style={styles.chips}>
              {EXAMS.map(name => (
                <Chip
                  key={name}
                  label={name}
                  selected={examName === name}
                  onPress={() => { setExamName(name); setDateError(null); }}
                  testID={`ob-exam-${slug(name)}`}
                />
              ))}
            </View>
            <TextInput
              value={examName}
              onChangeText={setExamName}
              placeholder={t('examNamePlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="ob-exam-name"
            />
            <TextInput
              value={examDate}
              onChangeText={setExamDate}
              placeholder={t('examDatePlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="ob-exam-date"
            />
            {!!dateError && <Text style={styles.error} testID="ob-error">{dateError}</Text>}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title} testID="ob-title">{t('obTargetTitle')}</Text>
            <Text style={styles.body1}>{t('obTargetBody')}</Text>
            <Text style={styles.big} testID="ob-target">
              {dur(state.dailyTargetMinutes * 60)}
            </Text>
            <Segmented
              value={TARGETS.includes(state.dailyTargetMinutes) ? state.dailyTargetMinutes : -1}
              onChange={(minutes: number) => setDailyTarget(minutes)}
              options={TARGETS.map(minutes => ({
                value: minutes, label: dur(minutes * 60), testID: `ob-target-${minutes}`
              }))}
            />
            <View style={styles.row}>
              <Button
                label={t('minus30')}
                variant="ghost"
                onPress={() => setDailyTarget(state.dailyTargetMinutes - 30)}
                style={styles.flex}
              />
              <Button
                label={t('plus30')}
                variant="ghost"
                onPress={() => setDailyTarget(state.dailyTargetMinutes + 30)}
                style={styles.flex}
              />
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title} testID="ob-title">{t('obSubjectsTitle')}</Text>
            <Text style={styles.body1}>{t('obSubjectsBody')}</Text>
            <View style={styles.chips}>
              {SUBJECTS.map(name => (
                <Chip
                  key={name}
                  label={name}
                  selected={chosen.has(name.toLowerCase())}
                  onPress={() => addSubject(name)}
                  testID={`ob-subject-${slug(name)}`}
                />
              ))}
            </View>
            {state.subjects.length > 0 && (
              <Text style={styles.aside} testID="ob-added">
                {t('obSubjectsAdded', { n: state.subjects.length })}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <Button label={t('obBack')} variant="ghost" onPress={back} style={styles.flex} testID="ob-back" />
        )}
        <Button
          label={step === STEPS - 1 ? t('obFinish') : t('obNext')}
          onPress={next}
          style={styles.flex}
          testID="ob-next"
        />
      </View>
    </View>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: SCREEN_PAD },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.sm
  },
  step: { ...type.kicker, color: colors.muted },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm, marginRight: -space.sm },
  skipText: { ...type.label, color: colors.accentText },
  dots: { flexDirection: 'row', gap: 6, marginTop: space.sm, marginBottom: space.xl },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surface2 },
  dotOn: { backgroundColor: colors.accent },
  body: { paddingBottom: space.xl },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg
  },
  title: { ...type.h1, color: colors.text, marginBottom: space.sm },
  body1: { ...type.body, color: colors.muted, marginBottom: space.xl },
  aside: { ...type.caption, color: colors.muted, marginTop: space.lg },
  big: { ...type.display, fontSize: 44, color: colors.text, marginBottom: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  flex: { flex: 1 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    padding: space.md,
    minHeight: 50,
    marginBottom: space.sm
  },
  error: { ...type.label, color: colors.danger, marginBottom: space.sm },
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.lg,
    borderTopWidth: hairline,
    borderTopColor: colors.line
  }
}));
