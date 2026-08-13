import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Ring } from '../components/Ring';
import { Icon } from '../components/Icon';
import { Button, Dot } from '../components/ui';
import { hairline, radius, space, themed, type, useColors } from '../theme';
import {
  MAX_OPEN_SECONDS, creditedSeconds, elapsedOf, isOverCap, isRoundDone, remainingOf,
  useApp, useDuration, useT, useTicker
} from '../store';
import { clockDuration } from '../lib/format';
import { breakSecondsOf } from '../lib/presets';
import { cancelRoundEnd, installNotificationHandler, scheduleRoundEnd } from '../lib/notifications';

const KEEP_AWAKE_TAG = 'padhai-focus';

/* Full screen, no tab bar, nothing to tap by accident. The whole point of the
   mode is that the phone stops being interesting for the next 25 minutes.

   Which is why the running state now has exactly one large control. Four
   equally-weighted pills stacked under the dial is four things to think about;
   a single pause button, with the way out kept deliberately small underneath
   it, is one. */
export default function FocusScreen() {
  const {
    state, pauseTimer, resumeTimer, stopTimer, discardTimer, startTimer, startBreak
  } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const colors = useColors();
  const active = state.active;

  const running = !!active?.runningSince;
  useTicker(running);

  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => { deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {}); };
  }, [running]);

  /* The alarm mirrors the clock: scheduled on start and on every resume,
     cancelled on pause and when the round ends. Without it a fixed round is
     silent, which defeats the point of putting the phone down. */
  const runningSince = active?.runningSince ?? null;
  const plannedSeconds = active?.plannedSeconds ?? null;
  const kind = active?.kind;

  useEffect(() => { void installNotificationHandler(); }, []);

  useEffect(() => {
    if (!runningSince || !plannedSeconds) {
      void cancelRoundEnd();
      return;
    }
    /* Time already banked from earlier stretches counts too, or the alarm
       fires late by however long the round was paused. */
    void scheduleRoundEnd(
      remainingOf(active) ?? 0,
      kind === 'break' ? t('breakOver') : t('roundComplete'),
      /* Not t('roundSaved'): at the moment this fires nothing is saved, and
         the whole app rests on its numbers being true. */
      kind === 'break' ? t('backToStudy') : t('roundEndBody')
    );
    return () => { void cancelRoundEnd(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningSince, plannedSeconds, kind]);

  const [finished, setFinished] = useState(false);
  const done = isRoundDone(active);

  /* When a fixed round runs out the clock freezes rather than being saved
     behind the user's back — they still choose break, another round, or stop,
     and the credited time is capped at what they asked for. */
  useEffect(() => {
    if (done && !finished) {
      setFinished(true);
      if (active?.runningSince) pauseTimer();
    }
    if (!done && finished) setFinished(false);
  }, [done, finished, active?.runningSince, pauseTimer]);

  if (!active) return null;

  const subject = state.subjects.find(s => s.id === active.subjectId);
  const tint = active.kind === 'break' ? colors.good : subject?.color ?? colors.accent;
  const elapsed = elapsedOf(active);
  const credited = creditedSeconds(active);
  const remaining = remainingOf(active);
  const planned = active.plannedSeconds;

  /* Open sittings have no end, so the ring tracks the daily target instead. */
  const progress = planned
    ? Math.min(1, elapsed / planned)
    : Math.min(1, elapsed / (state.dailyTargetMinutes * 60));

  const breakSeconds = breakSecondsOf(state.pomodoro) ?? 5 * 60;
  const isBreak = active.kind === 'break';

  const distractionLine = active.distractions === 0
    ? t('stayedFocused')
    : active.distractions === 1
      ? t('leftAppOnce')
      : t('leftAppTimes', { n: active.distractions });

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        {/* Not the subject's tint: at 11px uppercase this is text, and a colour
            chosen to work as a 10px dot sits at 3.5:1 on the light ground —
            below the bar for anything you are meant to read. The ring below
            carries the subject's colour instead. */}
        <Text style={[styles.kicker, isBreak && styles.kickerBreak]}>
          {isBreak ? t('breakLabel') : t('round', { n: active.round })}
        </Text>
        <View style={styles.subjectRow}>
          {!isBreak && !!subject && <Dot color={subject.color} size={9} />}
          <Text style={styles.subject}>{subject?.name ?? t('focus')}</Text>
        </View>
      </View>

      <Ring
        size={286}
        stroke={14}
        progress={done ? 1 : progress}
        color={tint}
        gradientTo={isBreak ? colors.good : colors.accentGlow}
        trackColor={colors.surface2}
      >
        <Text style={styles.clock}>
          {clockDuration(remaining !== null && !done ? remaining : elapsed)}
        </Text>
        <Text style={styles.caption}>
          {done
            ? isBreak ? t('breakOver') : t('roundComplete')
            : planned
              ? t('leftMinutes', { time: dur(remaining ?? 0) })
              : t('openSession')}
        </Text>
      </Ring>

      {!isBreak && <Text style={styles.distractions}>{distractionLine}</Text>}

      {isOverCap(active) && (
        <Text style={styles.capped}>
          {t('openCapped', { time: dur(MAX_OPEN_SECONDS) })}
        </Text>
      )}

      <View style={styles.controls}>
        {done ? (
          isBreak ? (
            <>
              <Button
                label={t('backToStudy')}
                icon="play"
                testID="focus-back"
                onPress={() => startTimer(active.subjectId)}
                style={styles.wide}
              />
              <Button
                label={t('doneForNow')}
                variant="quiet"
                onPress={discardTimer}
                style={styles.wide}
              />
            </>
          ) : (
            <>
              <View style={styles.savedRow}>
                <Icon name="check" size={16} color={colors.good} strokeWidth={2.6} />
                <Text style={styles.saved}>
                  {t('roundSaved', {
                    time: dur(credited),
                    subject: subject?.name ?? ''
                  })}
                </Text>
              </View>
              <Button
                label={t('takeBreak', { time: dur(breakSeconds) })}
                testID="focus-break"
                /* startBreak banks the finished round itself — calling
                   stopTimer first would clear `active` and the break would
                   fall back to the first subject in the list. */
                onPress={startBreak}
                style={styles.wide}
              />
              <Button
                label={t('anotherRound')}
                variant="ghost"
                testID="focus-again"
                onPress={() => startTimer(active.subjectId)}
                style={styles.wide}
              />
              <Button
                label={t('doneForNow')}
                variant="quiet"
                testID="focus-done"
                onPress={() => { stopTimer(); }}
                style={styles.wide}
              />
            </>
          )
        ) : (
          <>
            {/* One control, sized so it can be found without looking. */}
            <Pressable
              onPress={running ? pauseTimer : resumeTimer}
              testID="focus-pause"
              accessibilityRole="button"
              accessibilityLabel={running ? t('pause') : t('resume')}
              style={({ pressed }) => [styles.bigBtn, pressed && styles.dim]}
            >
              <Icon name={running ? 'pause' : 'play'} size={30} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.bigBtnLabel}>{running ? t('pause') : t('resume')}</Text>

            {isBreak ? (
              <Button
                label={t('skipBreak')}
                variant="ghost"
                testID="focus-skip"
                onPress={discardTimer}
                style={styles.wide}
              />
            ) : (
              <Button
                label={planned ? t('endEarly') : t('saveAndFinish')}
                variant="ghost"
                testID="focus-stop"
                onPress={() => { stopTimer(); }}
                style={styles.wide}
              />
            )}
          </>
        )}
      </View>

      {!done && !isBreak && (
        <Pressable onPress={discardTimer} style={styles.discard} testID="focus-discard">
          <Text style={styles.discardText}>{t('discardSitting')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = themed((colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl
  },
  head: { alignItems: 'center', marginBottom: space.xl, gap: 6 },
  kicker: { ...type.kicker, color: colors.muted },
  kickerBreak: { color: colors.good },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  subject: { ...type.h1, fontSize: 26, color: colors.text },
  clock: { ...type.display, fontSize: 46, color: colors.text },
  caption: { ...type.caption, color: colors.muted, marginTop: 6, textAlign: 'center' },
  capped: { ...type.caption, color: colors.warn, marginTop: space.sm, textAlign: 'center' },
  distractions: { ...type.caption, color: colors.muted, marginTop: space.lg, textAlign: 'center' },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: space.xs
  },
  saved: { ...type.label, color: colors.good },

  controls: { width: '100%', maxWidth: 340, marginTop: space.xl, gap: space.md, alignItems: 'center' },
  wide: { width: '100%' },
  bigBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bigBtnLabel: { ...type.kicker, color: colors.muted, marginTop: -space.xs },
  dim: { opacity: 0.6 },

  discard: { marginTop: space.lg, minHeight: 44, justifyContent: 'center' },
  discardText: { ...type.caption, color: colors.muted },
  hairlineRef: { borderWidth: hairline, borderRadius: radius.sm }
}));
