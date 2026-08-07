import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Ring } from '../components/Ring';
import { Button } from '../components/ui';
import { colors, radius, space } from '../theme';
import {
  creditedSeconds, elapsedOf, isRoundDone, remainingOf, useApp, useDuration, useT, useTicker
} from '../store';
import { clockDuration } from '../lib/format';
import { breakSecondsOf } from '../lib/presets';

const KEEP_AWAKE_TAG = 'padhai-focus';

/* Full screen, no tab bar, nothing to tap by accident. The whole point of the
   mode is that the phone stops being interesting for the next 25 minutes. */
export default function FocusScreen() {
  const {
    state, pauseTimer, resumeTimer, stopTimer, discardTimer, startTimer, startBreak
  } = useApp();
  const t = useT();
  const dur = useDuration();
  const active = state.active;

  const running = !!active?.runningSince;
  useTicker(running);

  useEffect(() => {
    if (!running) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => { deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {}); };
  }, [running]);

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
        <Text style={[styles.kicker, { color: tint }]}>
          {isBreak ? t('breakLabel') : t('round', { n: active.round })}
        </Text>
        <Text style={styles.subject}>{subject?.name ?? t('focus')}</Text>
      </View>

      <Ring
        size={276}
        stroke={16}
        progress={done ? 1 : progress}
        color={tint}
        gradientTo={isBreak ? colors.good : colors.accent}
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

      <View style={styles.controls}>
        {done ? (
          isBreak ? (
            <>
              <Button
                label={t('backToStudy')}
                testID="focus-back"
                onPress={() => startTimer(active.subjectId)}
                style={styles.wide}
              />
              <Button
                label={t('doneForNow')}
                variant="ghost"
                onPress={discardTimer}
                style={styles.wide}
              />
            </>
          ) : (
            <>
              <Text style={styles.saved}>
                {t('roundSaved', {
                  time: dur(credited),
                  subject: subject?.name ?? ''
                })}
              </Text>
              <Button
                label={t('takeBreak', { time: dur(breakSeconds) })}
                testID="focus-break"
                onPress={() => { stopTimer(); startBreak(); }}
                style={styles.wide}
              />
              <Button
                label={t('anotherRound')}
                variant="ghost"
                testID="focus-again"
                onPress={() => { stopTimer(); startTimer(active.subjectId); }}
                style={styles.wide}
              />
              <Button
                label={t('doneForNow')}
                variant="ghost"
                testID="focus-done"
                onPress={() => { stopTimer(); }}
                style={styles.wide}
              />
            </>
          )
        ) : (
          <>
            <Button
              label={running ? t('pause') : t('resume')}
              testID="focus-pause"
              onPress={running ? pauseTimer : resumeTimer}
              style={styles.wide}
            />
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
        <Pressable onPress={discardTimer} style={styles.discard}>
          <Text style={styles.discardText}>{t('discardSitting')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl
  },
  head: { alignItems: 'center', marginBottom: space.xl },
  kicker: {
    fontFamily: undefined,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6
  },
  subject: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  clock: {
    color: colors.text,
    fontSize: 46,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center'
  },
  distractions: {
    color: colors.muted,
    fontSize: 13,
    marginTop: space.lg,
    textAlign: 'center'
  },
  saved: {
    color: colors.good,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: space.xs
  },
  controls: {
    width: '100%',
    maxWidth: 340,
    marginTop: space.xl,
    gap: space.md
  },
  wide: { width: '100%' },
  discard: { marginTop: space.lg, padding: space.sm },
  discardText: { color: colors.muted, fontSize: 13 },
  radiusRef: { borderRadius: radius.md }
});
