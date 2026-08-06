import type { Session } from '../types';
import { addDays, dayKey } from './dates';

export type DayTotals = Record<string, number>;

export function dayTotals(sessions: Session[]): DayTotals {
  const out: DayTotals = {};
  for (const s of sessions) out[s.day] = (out[s.day] || 0) + s.seconds;
  return out;
}

export function secondsOn(totals: DayTotals, day: string): number {
  return totals[day] || 0;
}

/** Consecutive days meeting the target, counting back from today.
 *  Today not being done *yet* must not break the streak — the day is still
 *  in progress — so an unmet today is skipped rather than treated as a miss. */
export function currentStreak(totals: DayTotals, targetSeconds: number): number {
  const today = dayKey();
  let cursor = secondsOn(totals, today) >= targetSeconds ? today : addDays(today, -1);
  let streak = 0;
  while (secondsOn(totals, cursor) >= targetSeconds) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(totals: DayTotals, targetSeconds: number): number {
  const met = Object.keys(totals)
    .filter(day => totals[day] >= targetSeconds)
    .sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;

  for (const day of met) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    prev = day;
    if (run > best) best = run;
  }
  return best;
}

/** The last `count` days, oldest first, ending today. */
export function recentDays(count: number): string[] {
  const today = dayKey();
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
}

export function totalsBySubject(sessions: Session[], since?: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    if (since && s.day < since) continue;
    out[s.subjectId] = (out[s.subjectId] || 0) + s.seconds;
  }
  return out;
}
