import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions
} from 'react-native';
import { Button } from './ui';
import { Confetti } from './Confetti';
import { radius, space, themed } from '../theme';
import { useApp, useDuration, useT, useToday } from '../store';
import { currentStreak, dayTotals } from '../lib/stats';
import { celebrationFor, type Celebration as Earned } from '../lib/celebrate';

/* The one moment this app exists for: the day's target going green.

   It is marked once per day and then remembered, so the confetti does not
   replay every time the app is reopened that evening. The day is banked the
   instant the celebration is shown rather than when it is dismissed — someone
   who swipes the app away mid-confetti has still had their moment, and should
   not get it again at 10pm. */

const VISIBLE_MS = 5200;

export function Celebration() {
  const { state, ready, markCelebrated } = useApp();
  const t = useT();
  const dur = useDuration();
  const styles = useStyles();
  const today = useToday();
  const { height } = useWindowDimensions();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(on => { if (alive) setReduceMotion(on); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { alive = false; sub.remove(); };
  }, []);

  const targetSeconds = state.dailyTargetMinutes * 60;
  const totals = useMemo(() => dayTotals(state.sessions), [state.sessions]);
  const streak = useMemo(
    () => currentStreak(totals, targetSeconds),
    [totals, targetSeconds, today]
  );

  const owed = ready
    ? celebrationFor({
        today,
        totals,
        targetSeconds,
        streak,
        celebratedDay: state.celebratedDay
      })
    : null;

  const [showing, setShowing] = useState<Earned | null>(null);

  useEffect(() => {
    if (!owed || showing) return;
    setShowing(owed);
    markCelebrated(owed.day);
  }, [owed, showing, markCelebrated]);

  useEffect(() => {
    if (!showing) return;
    const id = setTimeout(() => setShowing(null), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [showing]);

  if (!showing) return null;

  const title = showing.kind === 'streak'
    ? t('celebrateStreakTitle', { n: showing.milestone ?? showing.streak })
    : showing.kind === 'first'
      ? t('celebrateFirstTitle')
      : t('celebrateTargetTitle');

  const note = showing.kind === 'streak'
    ? t('celebrateStreakNote', { n: showing.milestone ?? showing.streak })
    : showing.kind === 'first'
      ? t('celebrateFirstNote')
      : null;

  const dismiss = () => setShowing(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} testID="celebration">
        {/* Between the scrim and the card, deliberately. Behind the scrim it
            comes out washed grey; in front of the card it falls across the
            words. Motion is the whole point of confetti, so when the phone
            asks for less of it the honest thing is to drop it rather than
            slow it down — the message is the part that matters. */}
        {!reduceMotion && <Confetti height={height} />}
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.mark}>{showing.kind === 'streak' ? '🔥' : '🎉'}</Text>
          <Text style={styles.title} testID="celebration-title">{title}</Text>
          <Text style={styles.body}>
            {t('celebrateBody', { time: dur(showing.seconds) })}
          </Text>
          <View style={styles.streakPill}>
            <Text style={styles.streakText} testID="celebration-streak">
              {t(showing.streak === 1 ? 'streakDays' : 'streakDaysPlural', { n: showing.streak })}
            </Text>
          </View>
          {!!note && <Text style={styles.note}>{note}</Text>}
          <Button
            label={t('celebrateDismiss')}
            onPress={dismiss}
            testID="celebration-dismiss"
            style={styles.button}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const useStyles = themed((colors, shadow) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg
  },
  card: {
    ...shadow,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    paddingVertical: space.xl,
    paddingHorizontal: space.lg
  },
  mark: { fontSize: 44 },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: space.sm,
    textAlign: 'center'
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    marginTop: space.xs,
    textAlign: 'center'
  },
  streakPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginTop: space.lg
  },
  streakText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  note: {
    color: colors.muted,
    fontSize: 13,
    marginTop: space.md,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: space.sm
  },
  button: { marginTop: space.lg, alignSelf: 'stretch' }
}));
