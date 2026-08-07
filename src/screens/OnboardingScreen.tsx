import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip } from '../components/ui';
import { radius, space, themed, useColors } from '../theme';
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
            <Text style={styles.mark}>⏱</Text>
            <Text style={styles.title} testID="ob-title">{t('obWelcomeTitle')}</Text>
            <Text style={styles.body1}>{t('obWelcomeBody')}</Text>
            <View style={styles.chips}>
              {LANGUAGES.map(option => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={state.lang === option.key}
                  onPress={() => setLang(option.key as Lang)}
                  testID={`ob-lang-${option.key}`}
                />
              ))}
            </View>
            {/* Last, not before the chips: sitting above them it reads as
                their label rather than as the closing reassurance it is. */}
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
            <View style={styles.chips}>
              {TARGETS.map(minutes => (
                <Chip
                  key={minutes}
                  label={dur(minutes * 60)}
                  selected={state.dailyTargetMinutes === minutes}
                  onPress={() => setDailyTarget(minutes)}
                  testID={`ob-target-${minutes}`}
                />
              ))}
            </View>
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
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md
  },
  step: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  skipText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, marginTop: space.sm, marginBottom: space.lg },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface2 },
  dotOn: { backgroundColor: colors.accent },
  body: { paddingBottom: space.xl },
  mark: { fontSize: 44, marginBottom: space.sm },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: space.sm
  },
  body1: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: space.lg },
  aside: { color: colors.muted, fontSize: 13, marginTop: space.md },
  big: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: space.md
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  flex: { flex: 1 },
  input: {
    backgroundColor: colors.surface,
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
  footer: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line
  }
}));
