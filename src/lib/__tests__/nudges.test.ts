import {
  NEGLECT_HOUR, STREAK_RISK_HOUR, STREAK_RISK_MINUTE,
  planNeglect, planStreakRisk, secondsUntilNext, secondsUntilToday
} from '../nudges';
import type { Session, Subject } from '../../types';

/* These two notifications are the only text this app ever shows when it is not
   on screen, so the thing worth testing is not that they fire — it is that
   what they say is still true when they arrive. Every case below is one where
   a plausible implementation says something false. */

const at = (iso: string) => new Date(iso);

const subjects: Subject[] = [
  { id: 's1', name: 'Physics', color: '#5A78DA' },
  { id: 's2', name: 'Chemistry', color: '#2B8A7E' },
  { id: 's3', name: 'Maths', color: '#C4553C' }
];

const session = (subjectId: string, day: string): Session =>
  ({ id: `${subjectId}-${day}`, subjectId, day, seconds: 3600, endedAt: 1 });

describe('secondsUntilNext', () => {
  it('lands on today when the hour is still ahead', () => {
    expect(secondsUntilNext(at('2026-08-13T09:00:00'), 18, 0)).toBe(9 * 3600);
  });

  it('rolls to tomorrow once it has passed', () => {
    expect(secondsUntilNext(at('2026-08-13T20:00:00'), 18, 0)).toBe(22 * 3600);
  });

  it('treats the exact minute as passed, so it never schedules zero seconds', () => {
    expect(secondsUntilNext(at('2026-08-13T18:00:00'), 18, 0)).toBe(24 * 3600);
  });
});

describe('secondsUntilToday', () => {
  it('counts down to the hour', () => {
    expect(secondsUntilToday(at('2026-08-13T21:00:00'), 21, 30)).toBe(30 * 60);
  });

  it('gives up rather than rolling to tomorrow', () => {
    expect(secondsUntilToday(at('2026-08-13T22:00:00'), 21, 30)).toBeNull();
  });
});

describe('planNeglect', () => {
  const base = { now: at('2026-08-13T09:00:00'), today: '2026-08-13', subjects };

  it('says nothing while every subject is inside the week', () => {
    const sessions = subjects.map(s => session(s.id, '2026-08-10'));
    expect(planNeglect({ ...base, sessions })).toBeNull();
  });

  it('picks the subject left alone longest, not the first one over the line', () => {
    const sessions = [
      session('s1', '2026-08-13'),
      session('s2', '2026-08-05'),   // 8 days
      session('s3', '2026-07-20')    // 24 days
    ];
    expect(planNeglect({ ...base, sessions })?.subjectName).toBe('Maths');
  });

  it('ignores a subject that has never been studied at all', () => {
    /* Nothing in the save distinguishes a subject added this morning from one
       added in March, so telling someone they have neglected a subject they
       created ten minutes ago is a real possibility — and the fastest way to
       have every notification from this app turned off. */
    expect(planNeglect({ ...base, sessions: [session('s1', '2026-08-13')] })).toBeNull();
  });

  it('counts the days as of when the notification arrives, not as of now', () => {
    // 20:00 is past the nudge hour, so this one lands tomorrow evening — by
    // which point the gap the user reads has grown by a day.
    const sessions = [session('s2', '2026-08-05')];
    const today = planNeglect({ ...base, sessions });
    const tonight = planNeglect({
      ...base, now: at('2026-08-13T20:00:00'), sessions
    });
    expect(today?.daysAtFire).toBe(8);
    expect(tonight?.daysAtFire).toBe(9);
  });

  it('schedules for the nudge hour', () => {
    const plan = planNeglect({ ...base, sessions: [session('s2', '2026-08-01')] });
    expect(plan?.inSeconds).toBe((NEGLECT_HOUR - 9) * 3600);
  });

  it('says nothing at all when there are no subjects', () => {
    expect(planNeglect({ ...base, subjects: [], sessions: [] })).toBeNull();
  });
});

describe('planStreakRisk', () => {
  const base = {
    now: at('2026-08-13T19:00:00'),
    today: '2026-08-13',
    targetSeconds: 4 * 3600,
    streak: 6
  };

  it('warns when the day is unfinished and a streak is on the line', () => {
    const plan = planStreakRisk({ ...base, totals: { '2026-08-13': 3600 } });
    expect(plan?.streak).toBe(6);
    expect(plan?.remainingSeconds).toBe(3 * 3600);
    expect(plan?.inSeconds).toBe(
      (STREAK_RISK_HOUR - 19) * 3600 + STREAK_RISK_MINUTE * 60
    );
  });

  it('stays quiet once the target is met', () => {
    expect(planStreakRisk({ ...base, totals: { '2026-08-13': 4 * 3600 } })).toBeNull();
  });

  it('stays quiet when there is no streak to lose', () => {
    // Nothing is at risk, and "your 0-day streak ends at midnight" is nonsense.
    expect(planStreakRisk({ ...base, streak: 0, totals: {} })).toBeNull();
  });

  it('does not roll over to tomorrow night once the hour has passed', () => {
    /* Tomorrow evening the streak has either survived or it has not, and
       either way tonight's warning is no longer the truth. */
    expect(planStreakRisk({
      ...base, now: at('2026-08-13T23:00:00'), totals: {}
    })).toBeNull();
  });

  it('counts only today towards the target, not the week', () => {
    const plan = planStreakRisk({
      ...base,
      totals: { '2026-08-12': 8 * 3600, '2026-08-13': 1800 }
    });
    expect(plan?.remainingSeconds).toBe(4 * 3600 - 1800);
  });

  it('refuses a target of zero rather than dividing the day by nothing', () => {
    expect(planStreakRisk({ ...base, targetSeconds: 0, totals: {} })).toBeNull();
  });
});
