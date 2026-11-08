import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useApp, useDuration, useT, useToday } from '../store';
import { currentStreak, dayTotals } from '../lib/stats';
import { planNeglect, planStreakRisk } from '../lib/nudges';
import {
  cancelNeglectNudge, cancelStreakRisk, notificationsAllowed,
  scheduleDailyReminder, scheduleNeglectNudge, scheduleStreakRisk
} from '../lib/notifications';

/* Renders nothing; keeps the two background nudges in step with the data.

   It runs on every change to anything either nudge depends on, and rebuilds
   both from scratch each time — cancel then reschedule, never patch. That is
   what makes the copy honest: the app is the only thing that writes study
   data, so any change to "days since Chemistry" or "today's total" happens
   right here, with the app open, and a pending notification that has stopped
   being true is replaced in the same breath.

   It never asks for permission. If notifications have not already been allowed
   for something the user did ask for — the nightly reminder, or a round-end
   alarm — this quietly does nothing. */
export function NudgeScheduler() {
  const { state, ready } = useApp();
  const t = useT();
  const dur = useDuration();
  const today = useToday();

  const { subjects, sessions, dailyTargetMinutes, nudges, lang, reminder } = state;

  /* Counts returns to the foreground. Android only lets an alarm ring on time
     if it was set after the user allowed "Alarms & reminders", and that switch
     lives in phone settings, so set the reminder again on every return. */
  const [resumes, setResumes] = useState(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') setResumes(n => n + 1);
    });
    return () => sub.remove();
  }, []);

  /* The daily reminder's copy is fixed when it is scheduled, so it is also
     set again when the language or the target changes. Only once already
     allowed: switching the reminder on is what asks. */
  useEffect(() => {
    if (!ready || !reminder.enabled) return;
    void (async () => {
      if (!(await notificationsAllowed())) return;
      await scheduleDailyReminder(
        reminder.hour,
        reminder.minute,
        t('reminderTitle'),
        t('reminderBody', { target: dur(dailyTargetMinutes * 60) })
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, resumes, lang, dailyTargetMinutes, reminder.enabled, reminder.hour, reminder.minute]);
  const targetSeconds = dailyTargetMinutes * 60;

  const totals = useMemo(() => dayTotals(sessions), [sessions]);
  const streak = useMemo(() => currentStreak(totals, targetSeconds), [totals, targetSeconds]);

  useEffect(() => {
    if (!ready) return;
    let dropped = false;

    void (async () => {
      if (!(await notificationsAllowed()) || dropped) {
        return;
      }
      const now = new Date();

      if (nudges.neglect) {
        const plan = planNeglect({ now, today, subjects, sessions });
        if (plan) {
          await scheduleNeglectNudge(
            plan.inSeconds,
            t('nudgeNeglectTitle', { subject: plan.subjectName }),
            t('nudgeNeglectBody', { subject: plan.subjectName, n: plan.daysAtFire })
          );
        } else {
          await cancelNeglectNudge();
        }
      } else {
        await cancelNeglectNudge();
      }
      if (dropped) return;

      if (nudges.streakRisk) {
        const plan = planStreakRisk({ now, today, totals, targetSeconds, streak });
        if (plan) {
          await scheduleStreakRisk(
            plan.inSeconds,
            t('nudgeStreakTitle', { n: plan.streak }),
            t('nudgeStreakBody', { time: dur(plan.remainingSeconds) })
          );
        } else {
          await cancelStreakRisk();
        }
      } else {
        await cancelStreakRisk();
      }
    })();

    return () => { dropped = true; };
    /* `lang` is in here because the copy is baked into the notification when
       it is scheduled: switching the app to Hindi has to rewrite anything
       already pending, or the next nudge arrives in the wrong language.
       eslint cannot see that, hence the exception. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready, today, lang, subjects, sessions, totals, streak, targetSeconds,
    nudges.neglect, nudges.streakRisk
  ]);

  return null;
}
