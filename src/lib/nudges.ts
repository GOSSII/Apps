import type { Session, Subject } from '../types';
import { daysApart } from './dates';
import type { DayTotals } from './stats';

/* Two nudges beyond the nightly reminder, both worked out on the phone.

   The rule these follow is the same one the rest of the app follows: a
   notification must still be true when it arrives. A repeating notification
   cannot be, because its text is fixed when it is scheduled and the app cannot
   run in the background to refresh it — which is why there is no "2h done, 2h
   to go" nudge and never will be.

   These two can be true, for one specific reason: this app is the only thing
   that writes study data. Nothing changes "days since you touched Chemistry"
   or "today's total" except the user, inside the app, with it open. So a nudge
   recomputed on every state change is correct at the moment it fires. The one
   thing that does move on its own is the clock, and that is handled by
   counting the days as of the moment the notification will arrive rather than
   as of now. */

/** A subject untouched for a week is worth mentioning; a subject untouched for
 *  three days is just a timetable. */
export const NEGLECT_DAYS = 7;
/** Early evening, while there is still a day left to do something about it. */
export const NEGLECT_HOUR = 18;
export const NEGLECT_MINUTE = 0;
/** Late enough to be a last call, early enough to still be actionable. */
export const STREAK_RISK_HOUR = 21;
export const STREAK_RISK_MINUTE = 30;

export type NeglectNudge = {
  subjectName: string;
  /** The gap as it will read when the notification actually arrives, which is
   *  a day more than today's gap whenever it fires tomorrow. */
  daysAtFire: number;
  inSeconds: number;
};

export type StreakNudge = {
  streak: number;
  remainingSeconds: number;
  inSeconds: number;
};

/** Seconds from `now` until the next hh:mm, today if it is still ahead and
 *  tomorrow otherwise. */
export function secondsUntilNext(now: Date, hour: number, minute: number): number {
  const target = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0
  );
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 1000);
}

/** Seconds until hh:mm today, or null once it has passed. */
export function secondsUntilToday(now: Date, hour: number, minute: number): number | null {
  const target = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0
  );
  const delta = Math.round((target.getTime() - now.getTime()) / 1000);
  return delta > 0 ? delta : null;
}

/** True when the next hh:mm falls on the following calendar day. */
function fallsTomorrow(now: Date, hour: number, minute: number): boolean {
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

/** The subject that has been left alone longest, if any has been left alone
 *  long enough to be worth saying so.
 *
 *  Only subjects with a history count. A subject added ten minutes ago and
 *  never studied is indistinguishable, from the saved data, from one added
 *  three weeks ago and never studied — and telling someone they have neglected
 *  a subject they created this morning is the sort of thing that gets an app's
 *  notifications turned off for good. */
export function planNeglect(input: {
  now: Date;
  today: string;
  subjects: Subject[];
  sessions: Session[];
}): NeglectNudge | null {
  const { now, today, subjects, sessions } = input;

  let worst: { name: string; days: number } | null = null;
  for (const subject of subjects) {
    let last: string | null = null;
    for (const s of sessions) {
      if (s.subjectId !== subject.id) continue;
      if (last === null || s.day > last) last = s.day;
    }
    if (last === null) continue;
    const days = daysApart(last, today);
    if (days < NEGLECT_DAYS) continue;
    if (!worst || days > worst.days) worst = { name: subject.name, days };
  }
  if (!worst) return null;

  return {
    subjectName: worst.name,
    daysAtFire: worst.days + (fallsTomorrow(now, NEGLECT_HOUR, NEGLECT_MINUTE) ? 1 : 0),
    inSeconds: secondsUntilNext(now, NEGLECT_HOUR, NEGLECT_MINUTE)
  };
}

/** A live streak, a target not yet met, and enough of the evening left to do
 *  something about it. Deliberately not rescheduled to tomorrow once the hour
 *  has passed: by tomorrow evening the streak has either survived or it has
 *  not, and either way tonight's warning is no longer the truth. */
export function planStreakRisk(input: {
  now: Date;
  today: string;
  totals: DayTotals;
  targetSeconds: number;
  streak: number;
}): StreakNudge | null {
  const { now, today, totals, targetSeconds, streak } = input;
  if (streak < 1 || !(targetSeconds > 0)) return null;

  const doneToday = totals[today] || 0;
  if (doneToday >= targetSeconds) return null;

  const inSeconds = secondsUntilToday(now, STREAK_RISK_HOUR, STREAK_RISK_MINUTE);
  if (inSeconds === null) return null;

  return { streak, remainingSeconds: targetSeconds - doneToday, inSeconds };
}
