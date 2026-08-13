import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  Button, Card, Row, SCREEN_PAD, ScreenTitle, Segmented, SectionTitle
} from '../components/ui';
import { hairline, radius, space, themed, type, useColors } from '../theme';
import { useApp, useT, useDuration } from '../store';
import { LANGUAGES, type Key, type Lang } from '../i18n';
import { PRESETS, PRESET_ORDER } from '../lib/presets';
import type { PresetKey, ThemePref } from '../types';
import { dateInputValue, daysUntil, parseDateInput, prettyDate } from '../lib/dates';
import {
  cancelDailyReminder, formatTime, parseTimeInput, scheduleDailyReminder
} from '../lib/notifications';
import { backupFilename, parseBackup, serialiseBackup } from '../lib/backup';
import { canPickFiles, pickBackup, saveBackup } from '../lib/backupTransport';
import { Confirm, Sheet } from '../components/Modals';

/* A grouped list, not a stack of eleven cards each with its own heading and
   its own pair of buttons. Everything that is a choice between a few things is
   a segmented control; everything that is on or off is a switch; everything
   that needs typing opens a sheet. The screen is now readable end to end
   without scrolling past four buttons you will never press. */

const THEME_OPTIONS: { key: ThemePref; labelKey: Key }[] = [
  { key: 'system', labelKey: 'themeSystem' },
  { key: 'light', labelKey: 'themeLight' },
  { key: 'dark', labelKey: 'themeDark' }
];

const PRESET_LABEL: Record<PresetKey, Key> = {
  open: 'presetOpen',
  starter: 'presetStarter',
  standard: 'presetStandard',
  deep: 'presetDeep',
  custom: 'presetCustom'
};

export default function SettingsScreen() {
  const {
    state, setDailyTarget, setExam, setLang, setReminder, setNudges, setPomodoro,
    setThemePref, replaceAll, resetAll
  } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
  const { dailyTargetMinutes, exam, lang, reminder, nudges, pomodoro, themePref } = state;

  const [examOpen, setExamOpen] = useState(false);
  const [examName, setExamName] = useState(exam?.name ?? '');
  const [examDate, setExamDate] = useState(exam ? dateInputValue(exam.date) : '');
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeText, setTimeText] = useState(formatTime(reminder.hour, reminder.minute));
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ text: string; sessions: number } | null>(null);

  const saveNow = async () => {
    const result = await saveBackup(backupFilename(), serialiseBackup(state));
    setBackupNote(
      result === 'shared' ? t('backupShared')
        : result === 'downloaded' ? t('backupDownloaded')
        : t('backupFailed')
    );
  };

  /* Parsing happens before the confirmation, so the user is told how much is
     in the file before being asked to overwrite what they have. */
  const examine = (text: string) => {
    const result = parseBackup(text);
    if (!result.ok) {
      setPending(null);
      setRestoreError(
        result.reason === 'unreadable' ? t('restoreUnreadable')
          : result.reason === 'too-new' ? t('restoreTooNew')
          : t('restoreNotBackup')
      );
      return;
    }
    setRestoreError(null);
    setPending({ text, sessions: result.sessions });
  };

  const chooseFile = async () => {
    const text = await pickBackup();
    if (text === null) return;
    setPasted(text);
    examine(text);
  };

  const doRestore = () => {
    if (!pending) return;
    const result = parseBackup(pending.text);
    if (!result.ok) return;
    replaceAll(result.state);
    setPending(null);
    setRestoreOpen(false);
    setPasted('');
    setBackupNote(t('restored', { n: result.sessions }));
  };

  const saveExam = () => {
    const name = examName.trim();
    if (!name) { setDateError(t('examNeedsName')); return; }
    const parsed = parseDateInput(examDate);
    if (!parsed) { setDateError(t('examBadDate')); return; }
    setDateError(null);
    setExam({ name, date: parsed });
    setExamOpen(false);
  };

  const clearExam = () => {
    setExam(null);
    setExamName('');
    setExamDate('');
    setDateError(null);
    setExamOpen(false);
  };

  /* Notification copy is fixed at schedule time, so a reminder set in English
     at a 4h target would keep saying that after the user switches to Hindi or
     moves their target. Re-schedule whenever either changes. */
  useEffect(() => {
    if (!reminder.enabled) return;
    void scheduleDailyReminder(
      reminder.hour,
      reminder.minute,
      t('reminderTitle'),
      t('reminderBody', { target: dur(dailyTargetMinutes * 60) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, dailyTargetMinutes, reminder.enabled, reminder.hour, reminder.minute]);

  const applyReminder = async (hour: number, minute: number) => {
    const result = await scheduleDailyReminder(
      hour, minute, t('reminderTitle'),
      t('reminderBody', { target: dur(dailyTargetMinutes * 60) })
    );
    if (result === 'ok') {
      setReminder({ enabled: true, hour, minute });
      setReminderError(null);
      return;
    }
    /* The preference is still worth keeping — it applies on a real install
       even when this preview cannot schedule anything. */
    setReminder({ enabled: false, hour, minute });
    setReminderError(result === 'denied' ? t('reminderDenied') : t('reminderUnsupported'));
  };

  const toggleReminder = async (on: boolean) => {
    if (!on) {
      await cancelDailyReminder();
      setReminder({ ...reminder, enabled: false });
      setReminderError(null);
      return;
    }
    await applyReminder(reminder.hour, reminder.minute);
  };

  const saveTime = async () => {
    const time = parseTimeInput(timeText);
    if (!time) { setReminderError(t('reminderBadTime')); return; }
    setTimeOpen(false);
    if (reminder.enabled) {
      await applyReminder(time.hour, time.minute);
    } else {
      setReminder({ ...reminder, hour: time.hour, minute: time.minute });
      setReminderError(null);
    }
  };

  const switchColors = {
    trackColor: { false: colors.surface2, true: colors.accent },
    thumbColor: colors.surface,
    ios_backgroundColor: colors.surface2
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenTitle>{t('tabSettings')}</ScreenTitle>

      <SectionTitle>{t('appearance')}</SectionTitle>
      <Card>
        <Text style={styles.fieldLabel}>{t('language')}</Text>
        <Segmented
          value={lang}
          onChange={(key: Lang) => setLang(key)}
          options={LANGUAGES.map(o => ({
            value: o.key, label: o.label, testID: `lang-${o.key}`
          }))}
          style={styles.gap}
        />
        <Text style={styles.fieldLabel}>{t('themeLabel')}</Text>
        <Segmented
          value={themePref}
          onChange={setThemePref}
          options={THEME_OPTIONS.map(o => ({
            value: o.key, label: t(o.labelKey), testID: `theme-${o.key}`
          }))}
        />
        <Text style={styles.hint}>{t('appearanceHint')}</Text>
      </Card>

      <SectionTitle>{t('studyGroup')}</SectionTitle>
      <Card>
        <View style={styles.targetRow}>
          <View style={styles.flex}>
            <Text style={styles.fieldLabel}>{t('dailyTarget')}</Text>
            <Text style={styles.target}>{dur(dailyTargetMinutes * 60)}</Text>
          </View>
          <View style={styles.stepper}>
            <Button
              label={t('minus30')}
              variant="ghost"
              size="sm"
              onPress={() => setDailyTarget(dailyTargetMinutes - 30)}
            />
            <Button
              label={t('plus30')}
              variant="ghost"
              size="sm"
              onPress={() => setDailyTarget(dailyTargetMinutes + 30)}
              testID="target-plus"
            />
          </View>
        </View>
        <Text style={styles.hint}>{t('dailyTargetHint')}</Text>
      </Card>

      <Card>
        <Text style={styles.fieldLabel}>{t('roundSettings')}</Text>
        <Segmented
          value={pomodoro.preset === 'custom' ? 'custom' : pomodoro.preset}
          onChange={(key: PresetKey) => {
            if (key === 'custom') return;
            setPomodoro(PRESETS[key as Exclude<PresetKey, 'custom'>]);
          }}
          options={PRESET_ORDER.filter(k => k !== 'custom').map(key => ({
            value: key, label: t(PRESET_LABEL[key]), testID: `settings-preset-${key}`
          }))}
        />
        <Text style={styles.hint}>{t('roundSettingsHint')}</Text>
      </Card>

      <SectionTitle>{t('notificationsGroup')}</SectionTitle>
      <Card flush>
        <Row
          first
          title={t('reminder')}
          subtitle={t('reminderHint')}
          right={
            <Switch
              value={reminder.enabled}
              onValueChange={toggleReminder}
              accessibilityLabel={t('reminder')}
              testID="reminder-switch"
              {...switchColors}
            />
          }
        />
        <Row
          title={t('reminderTime')}
          value={formatTime(reminder.hour, reminder.minute)}
          onPress={() => { setTimeText(formatTime(reminder.hour, reminder.minute)); setTimeOpen(true); }}
          testID="reminder-time-row"
        />
        <Row
          title={t('nudgeNeglect')}
          subtitle={t('nudgeNeglectHint')}
          right={
            <Switch
              value={nudges.neglect}
              onValueChange={neglect => setNudges({ ...nudges, neglect })}
              accessibilityLabel={t('nudgeNeglect')}
              testID="nudge-neglect"
              {...switchColors}
            />
          }
        />
        <Row
          title={t('nudgeStreak')}
          subtitle={t('nudgeStreakHint')}
          right={
            <Switch
              value={nudges.streakRisk}
              onValueChange={streakRisk => setNudges({ ...nudges, streakRisk })}
              accessibilityLabel={t('nudgeStreak')}
              testID="nudge-streak"
              {...switchColors}
            />
          }
        />
      </Card>
      {!!reminderError && <Text style={styles.errorLoose}>{reminderError}</Text>}
      <Text style={styles.hintLoose}>{t('nudgesHint')}</Text>

      <SectionTitle>{t('examCountdown')}</SectionTitle>
      <Card flush>
        <Row
          first
          title={exam ? exam.name : t('examNone')}
          subtitle={exam
            ? t('examCurrent', { date: prettyDate(exam.date), n: daysUntil(exam.date) })
            : t('examNoneHint')}
          onPress={() => {
            setExamName(exam?.name ?? '');
            setExamDate(exam ? dateInputValue(exam.date) : '');
            setDateError(null);
            setExamOpen(true);
          }}
          testID="exam-open"
        />
      </Card>

      <SectionTitle>{t('backupTitle')}</SectionTitle>
      <Card flush>
        <Row first title={t('backupSave')} onPress={saveNow} testID="backup-save" />
        <Row
          title={t('backupRestore')}
          onPress={() => { setRestoreOpen(true); setRestoreError(null); }}
          testID="backup-restore"
        />
      </Card>
      {!!backupNote && <Text style={styles.noteLoose}>{backupNote}</Text>}
      <Text style={styles.hintLoose}>{t('backupHint')}</Text>

      <SectionTitle>{t('data')}</SectionTitle>
      <Card>
        <Text style={styles.hint}>{t('privacy')}</Text>
        <Button
          label={t('eraseAll')}
          variant="danger"
          icon="trash"
          onPress={() => setConfirmReset(true)}
          style={styles.gapTop}
          testID="erase-all"
        />
      </Card>

      <Text style={styles.footer}>Padhai Streak · v1.0</Text>

      <Sheet visible={timeOpen} title={t('reminderTime')} onClose={() => setTimeOpen(false)}>
        <Text style={styles.fieldLabel}>{t('reminderTimePlaceholder')}</Text>
        <TextInput
          value={timeText}
          onChangeText={setTimeText}
          placeholder="21:00"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
          testID="reminder-time"
        />
        {!!reminderError && <Text style={styles.error}>{reminderError}</Text>}
        <View style={styles.sheetRow}>
          <Button
            label={t('cancel')}
            variant="ghost"
            onPress={() => setTimeOpen(false)}
            style={styles.flex}
          />
          <Button label={t('save')} onPress={saveTime} style={styles.flex} testID="reminder-save" />
        </View>
      </Sheet>

      <Sheet visible={examOpen} title={t('examCountdown')} onClose={() => setExamOpen(false)}>
        <TextInput
          value={examName}
          onChangeText={setExamName}
          placeholder={t('examNamePlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID="exam-name"
        />
        <TextInput
          value={examDate}
          onChangeText={setExamDate}
          placeholder={t('examDatePlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID="exam-date"
        />
        {!!dateError && <Text style={styles.error}>{dateError}</Text>}
        <View style={styles.sheetRow}>
          {!!exam && (
            <Button label={t('remove')} variant="ghost" onPress={clearExam} style={styles.flex} />
          )}
          <Button label={t('save')} onPress={saveExam} style={styles.flex} testID="exam-save" />
        </View>
      </Sheet>

      <Sheet
        visible={restoreOpen}
        title={t('restoreTitle')}
        onClose={() => { setRestoreOpen(false); setPending(null); setRestoreError(null); }}
      >
        {canPickFiles() && (
          <Button
            label={t('restorePick')}
            onPress={chooseFile}
            style={styles.gapBottom}
            testID="restore-pick"
          />
        )}
        <Text style={styles.fieldLabel}>{t('restorePasteLabel')}</Text>
        <TextInput
          value={pasted}
          onChangeText={text => { setPasted(text); if (text.trim()) examine(text); }}
          placeholder={t('restorePastePlaceholder')}
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.paste]}
          testID="restore-paste"
        />
        {!!restoreError && <Text style={styles.error}>{restoreError}</Text>}
        {!!pending && (
          <Text style={styles.note}>{t('restoreConfirmBody', { n: pending.sessions })}</Text>
        )}
        <View style={styles.sheetRow}>
          <Button
            label={t('cancel')}
            variant="ghost"
            onPress={() => { setRestoreOpen(false); setPending(null); }}
            style={styles.flex}
          />
          <Button
            label={t('restoreDo')}
            onPress={doRestore}
            disabled={!pending}
            style={styles.flex}
            testID="restore-do"
          />
        </View>
      </Sheet>

      <Confirm
        visible={confirmReset}
        title={t('eraseTitle')}
        message={t('eraseMsg')}
        confirmLabel={t('erase')}
        cancelLabel={t('cancel')}
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          void cancelDailyReminder();
          resetAll();
          setExamName('');
          setExamDate('');
          setConfirmReset(false);
        }}
      />
    </ScrollView>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  content: { paddingHorizontal: SCREEN_PAD, paddingTop: space.sm, paddingBottom: 120 },
  flex: { flex: 1 },
  gap: { marginBottom: space.lg },
  gapTop: { marginTop: space.lg },
  gapBottom: { marginBottom: space.md },
  fieldLabel: { ...type.kicker, color: colors.muted, marginBottom: space.sm },
  hint: { ...type.caption, color: colors.muted, marginTop: space.md },
  hintLoose: {
    ...type.caption,
    color: colors.muted,
    marginTop: -space.xs,
    marginBottom: space.md,
    paddingHorizontal: space.xs
  },
  noteLoose: { ...type.label, color: colors.good, marginTop: -space.xs, marginBottom: space.sm },
  errorLoose: { ...type.label, color: colors.danger, marginTop: -space.xs, marginBottom: space.sm },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  target: { ...type.h1, fontSize: 30, color: colors.text },
  stepper: { flexDirection: 'row', gap: space.sm },
  footer: { ...type.caption, color: colors.muted, textAlign: 'center', marginTop: space.lg },

  input: {
    backgroundColor: colors.bg,
    borderWidth: hairline,
    borderColor: colors.line,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    padding: space.md,
    minHeight: 50,
    marginBottom: space.md
  },
  paste: { minHeight: 96, textAlignVertical: 'top' },
  error: { ...type.label, color: colors.danger, marginBottom: space.sm },
  note: { ...type.label, color: colors.good, marginBottom: space.sm },
  sheetRow: { flexDirection: 'row', gap: space.md, marginTop: space.sm }
}));
