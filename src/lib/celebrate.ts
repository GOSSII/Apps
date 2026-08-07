import type { DayTotals } from './stats';

/* When the app should make a fuss, and when it should stay out of the way.

   The rule is one celebration per day, at the moment the daily target is
   crossed. Not per round — a Classic 25/5 day is nine rounds, and something
   that fires nine times before lunch is not a celebration, it is a
   notification you learn to dismiss. The target is the thing the whole app is
   built around, so it is the thing worth marking. */

/** Streak lengths that get their own headline. Dense early, where the habit
 *  is actually being formed, and sparse later where a run is its own reward. */
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];

export type Celebration = {
  /** 'first' the first target ever met, 'streak' a milestone, 'target' the
   *  ordinary good day — which is most of them, and still worth marking. */
  kind: 'first' | 'streak' | 'target';
  day: string;
  seconds: number;
  streak: number;
  /** The milestone reached, when `kind` is 'streak'. */
  milestone: number | null;
};

export const milestoneFor = (streak: number): number | null =>
  STREAK_MILESTONES.includes(streak) ? streak : null;

/** The celebration owed right now, or null. Pure, and given the day rather
 *  than reading a clock, so a test can sit it at any date it likes. */
export function celebrationFor(input: {
  today: string;
  totals: DayTotals;
  targetSeconds: number;
  streak: number;
  /** The last day already celebrated, so reopening the app at 9pm does not
   *  replay the confetti from lunchtime. */
  celebratedDay: string | null;
}): Celebration | null {
  const { today, totals, targetSeconds, streak, celebratedDay } = input;

  /* A target of zero would be "met" by a day with nothing in it, and would
     fire the moment the app opened. */
  if (!(targetSeconds > 0)) return null;

  const seconds = totals[today] || 0;
  if (seconds < targetSeconds) return null;
  if (celebratedDay === today) return null;

  const daysEverHit = Object.keys(totals).filter(day => totals[day] >= targetSeconds).length;
  const milestone = milestoneFor(streak);

  /* The first one outranks a milestone: someone who backfills a week of study
     should be told they have started, not handed a 7-day trophy. */
  const kind = daysEverHit <= 1 ? 'first' : milestone ? 'streak' : 'target';

  return { kind, day: today, seconds, streak, milestone };
}
