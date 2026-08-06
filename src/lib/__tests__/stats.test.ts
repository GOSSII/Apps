import { addDays, dayKey, daysUntil, parseDateInput } from '../dates';
import { bestStreak, currentStreak, dayTotals, recentDays } from '../stats';
import { clockDuration, humanDuration } from '../format';
import type { Session } from '../../types';

const HOUR = 3600;
const TARGET = 4 * HOUR;

const session = (day: string, seconds: number, subjectId = 's1'): Session => ({
  id: day + seconds + subjectId,
  subjectId,
  day,
  seconds,
  endedAt: 0
});

const today = dayKey();
const ago = (n: number) => addDays(today, -n);

describe('dates', () => {
  it('walks days across a month boundary', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('walks days across a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('counts whole days to a future date', () => {
    expect(daysUntil(addDays(today, 10))).toBe(10);
    expect(daysUntil(today)).toBe(0);
    expect(daysUntil(addDays(today, -3))).toBe(-3);
  });

  it('parses the date formats people actually type', () => {
    expect(parseDateInput('24/05/2027')).toBe('2027-05-24');
    expect(parseDateInput('24-5-2027')).toBe('2027-05-24');
    expect(parseDateInput('2027-05-24')).toBe('2027-05-24');
    expect(parseDateInput('24/05/27')).toBe('2027-05-24');
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(parseDateInput('31/02/2027')).toBeNull();
    expect(parseDateInput('24/13/2027')).toBeNull();
    expect(parseDateInput('hello')).toBeNull();
    expect(parseDateInput('24/05')).toBeNull();
  });
});

describe('day totals', () => {
  it('adds up several sittings on the same day', () => {
    const totals = dayTotals([
      session('2026-08-01', 1800),
      session('2026-08-01', 3600, 's2'),
      session('2026-08-02', 900)
    ]);
    expect(totals['2026-08-01']).toBe(5400);
    expect(totals['2026-08-02']).toBe(900);
  });
});

describe('currentStreak', () => {
  it('is zero with no sessions', () => {
    expect(currentStreak({}, TARGET)).toBe(0);
  });

  it('counts consecutive days that met the target', () => {
    const totals = dayTotals([
      session(today, TARGET),
      session(ago(1), TARGET + 600),
      session(ago(2), TARGET)
    ]);
    expect(currentStreak(totals, TARGET)).toBe(3);
  });

  it('does not break the streak just because today is still in progress', () => {
    const totals = dayTotals([
      session(today, 600),          // started, nowhere near the target yet
      session(ago(1), TARGET),
      session(ago(2), TARGET)
    ]);
    expect(currentStreak(totals, TARGET)).toBe(2);
  });

  it('breaks on a missed day', () => {
    const totals = dayTotals([
      session(today, TARGET),
      session(ago(1), TARGET),
      // ago(2) missed entirely
      session(ago(3), TARGET)
    ]);
    expect(currentStreak(totals, TARGET)).toBe(2);
  });

  it('ignores days that fell short of the target', () => {
    const totals = dayTotals([
      session(today, TARGET),
      session(ago(1), TARGET - 60)
    ]);
    expect(currentStreak(totals, TARGET)).toBe(1);
  });
});

describe('bestStreak', () => {
  it('finds the longest past run, not just the current one', () => {
    const totals = dayTotals([
      session('2026-01-01', TARGET),
      session('2026-01-02', TARGET),
      session('2026-01-03', TARGET),
      session('2026-01-04', TARGET),
      // gap
      session('2026-01-08', TARGET),
      session('2026-01-09', TARGET)
    ]);
    expect(bestStreak(totals, TARGET)).toBe(4);
  });

  it('is zero when no day ever hit the target', () => {
    expect(bestStreak(dayTotals([session('2026-01-01', 60)]), TARGET)).toBe(0);
  });
});

describe('recentDays', () => {
  it('returns seven days, oldest first, ending today', () => {
    const days = recentDays(7);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(today);
    expect(days[0]).toBe(ago(6));
    expect([...days].sort()).toEqual(days);
  });
});

describe('formatting', () => {
  it('renders durations the way a student would say them', () => {
    expect(humanDuration(0)).toBe('0m');
    expect(humanDuration(59)).toBe('0m');
    expect(humanDuration(3600)).toBe('1h');
    expect(humanDuration(5400)).toBe('1h 30m');
    expect(humanDuration(-10)).toBe('0m');
  });

  it('uses Hindi units when the app is in Hindi', () => {
    expect(humanDuration(5400, 'hi')).toBe('1घं 30मि');
    expect(humanDuration(3600, 'hi')).toBe('1घं');
    expect(humanDuration(600, 'hi')).toBe('10मि');
  });

  it('renders the running clock zero-padded', () => {
    expect(clockDuration(0)).toBe('00:00:00');
    expect(clockDuration(5)).toBe('00:00:05');
    expect(clockDuration(3725)).toBe('01:02:05');
  });
});
