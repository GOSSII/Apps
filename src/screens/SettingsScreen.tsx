import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionTitle } from '../components/ui';
import { Confirm } from '../components/Modals';
import { colors, radius, space } from '../theme';
import { useApp, useT, useDuration } from '../store';
import { LANGUAGES, type Key, type Lang } from '../i18n';
import { PRESETS, PRESET_ORDER } from '../lib/presets';
import type { PresetKey } from '../types';
import { dateInputValue, daysUntil, parseDateInput, prettyDate } from '../lib/dates';
import {
  cancelDailyReminder, formatTime, parseTimeInput, scheduleDailyReminder
} from '../lib/notifications';

const PRESET_LABEL: Record<PresetKey, Key> = {
  open: 'presetOpen',
  starter: 'presetStarter',
  standard: 'presetStandard',
  deep: 'presetDeep',
  custom: 'presetCustom'
};

export default function SettingsScreen() {
  const {
    state, setDailyTarget, setExam, setLang, setReminder, setPomodoro, resetAll
  } = useApp();
  const t = useT();
  const dur = useDuration();
  const { dailyTargetMinutes, exam, lang, reminder, pomodoro } = state;

  const [examName, setExamName] = useState(exam?.name ?? '');
  const [examDate, setExamDate] = useState(exam ? dateInputValue(exam.date) : '');
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeText, setTimeText] = useState(formatTime(reminder.hour, reminder.minute));
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const saveExam = () => {
    const name = examName.trim();
    if (!name) {
      setDateError(t('examNeedsName'));
      return;
    }
    const parsed = parseDateInput(examDate);
    if (!parsed) {
      setDateError(t('examBadDate'));
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

  const turnReminderOn = async () => {
    const time = parseTimeInput(timeText);
    if (!time) {
      setReminderError(t('reminderBadTime'));
      return;
    }
    setReminderError(null);
    const result = await scheduleDailyReminder(
      time.hour,
      time.minute,
      t('reminderTitle'),
      t('reminderBody', { target: dur(dailyTargetMinutes * 60) })
    );
    if (result === 'ok') {
      setReminder({ enabled: true, hour: time.hour, minute: time.minute });
      return;
    }
    /* The preference is still worth keeping — it applies on a real install
       even when this preview cannot schedule anything. */
    setReminder({ enabled: false, hour: time.hour, minute: time.minute });
    setReminderError(result === 'denied' ? t('reminderDenied') : t('reminderUnsupported'));
  };

  const turnReminderOff = async () => {
    await cancelDailyReminder();
    setReminder({ ...reminder, enabled: false });
    setReminderError(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{t('tabSettings')}</Text>

      <SectionTitle>{t('language')}</SectionTitle>
      <Card>
        <View style={styles.chipWrap}>
          {LANGUAGES.map(option => (
            <Chip
              key={option.key}
              label={option.label}
              selected={lang === option.key}
              onPress={() => setLang(option.key as Lang)}
              testID={`lang-${option.key}`}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>{t('dailyTarget')}</SectionTitle>
      <Card>
        <Text style={styles.target}>{dur(dailyTargetMinutes * 60)}</Text>
        <Text style={styles.hint}>{t('dailyTargetHint')}</Text>
        <View style={styles.row}>
          <Button
            label={t('minus30')}
            variant="ghost"
            onPress={() => setDailyTarget(dailyTargetMinutes - 30)}
            style={styles.flex}
          />
          <Button
            label={t('plus30')}
            variant="ghost"
            onPress={() => setDailyTarget(dailyTargetMinutes + 30)}
            style={styles.flex}
            testID="target-plus"
          />
        </View>
      </Card>

      <SectionTitle>{t('roundSettings')}</SectionTitle>
      <Card>
        <Text style={styles.target}>
          {pomodoro.preset === 'open'
            ? t('presetOpen')
            : `${pomodoro.focusMinutes} / ${pomodoro.breakMinutes}`}
        </Text>
        <Text style={styles.hint}>{t('roundSettingsHint')}</Text>
        <View style={styles.chipWrap}>
          {PRESET_ORDER.filter(k => k !== 'custom').map(key => (
            <Chip
              key={key}
              label={t(PRESET_LABEL[key])}
              selected={pomodoro.preset === key}
              onPress={() => setPomodoro(PRESETS[key as Exclude<PresetKey, 'custom'>])}
              testID={`settings-preset-${key}`}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>{t('reminder')}</SectionTitle>
      <Card>
        <Text style={[styles.current, !reminder.enabled && styles.currentOff]}>
          {reminder.enabled
            ? t('reminderOn', { time: formatTime(reminder.hour, reminder.minute) })
            : t('reminderOff')}
        </Text>
        <Text style={styles.hint}>{t('reminderHint')}</Text>
        <TextInput
          value={timeText}
          onChangeText={setTimeText}
          placeholder={t('reminderTimePlaceholder')}
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          style={[styles.input, { marginTop: space.md }]}
          testID="reminder-time"
        />
        {!!reminderError && <Text style={styles.error}>{reminderError}</Text>}
        <View style={styles.row}>
          {reminder.enabled ? (
            <Button
              label={t('turnOff')}
              variant="ghost"
              onPress={turnReminderOff}
              style={styles.flex}
            />
          ) : (
            <Button
              label={t('turnOn')}
              onPress={turnReminderOn}
              style={styles.flex}
              testID="reminder-on"
            />
          )}
        </View>
      </Card>

      <SectionTitle>{t('examCountdown')}</SectionTitle>
      <Card>
        {!!exam && (
          <Text style={styles.current}>
            {t('examCurrent', {
              name: exam.name,
              date: prettyDate(exam.date),
              n: daysUntil(exam.date)
            })}
          </Text>
        )}
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
        <View style={styles.row}>
          {!!exam && (
            <Button label={t('remove')} variant="ghost" onPress={clearExam} style={styles.flex} />
          )}
          <Button label={t('save')} onPress={saveExam} style={styles.flex} testID="exam-save" />
        </View>
      </Card>

      <SectionTitle>{t('data')}</SectionTitle>
      <Card>
        <Text style={styles.hint}>{t('privacy')}</Text>
        <Button
          label={t('eraseAll')}
          variant="danger"
          onPress={() => setConfirmReset(true)}
          style={{ marginTop: space.md }}
        />
      </Card>

      <Text style={styles.footer}>Padhai Streak · v1.0</Text>

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

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: space.md },
  target: { color: colors.text, fontSize: 32, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 13, marginTop: space.xs, lineHeight: 19 },
  current: { color: colors.warn, fontWeight: '700', marginBottom: space.xs },
  currentOff: { color: colors.muted },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  flex: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: -space.sm },
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
