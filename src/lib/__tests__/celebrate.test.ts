import { STREAK_MILESTONES, celebrationFor, milestoneFor } from '../celebrate';

/* The failure mode this guards against is not "no confetti" — it is confetti
   that fires twice, or fires for a day nobody earned. Both would make the one
   moment the app exists for feel cheap. */

const TARGET = 4 * 3600;

const ask = (over: Partial<Parameters<typeof celebrationFor>[0]> = {}) =>
  celebrationFor({
    today: '2026-08-07',
    totals: {},
    targetSeconds: TARGET,
    streak: 0,
    celebratedDay: null,
    ...over
  });

describe('milestoneFor', () => {
  it('names the lengths that get a headline', () => {
    expect(milestoneFor(7)).toBe(7);
    expect(milestoneFor(100)).toBe(100);
  });

  it('says nothing about an ordinary day', () => {
    expect(milestoneFor(6)).toBeNull();
    expect(milestoneFor(0)).toBeNull();
  });

  it('is dense early and sparse late — the habit is formed in the first month', () => {
    const early = STREAK_MILESTONES.filter(n => n <= 30);
    expect(early.length).toBeGreaterThanOrEqual(5);
    expect(STREAK_MILESTONES).toEqual([...STREAK_MILESTONES].sort((a, b) => a - b));
  });
});

describe('celebrationFor', () => {
  it('says nothing on a day that has not reached the target', () => {
    expect(ask({ totals: { '2026-08-07': TARGET - 1 } })).toBeNull();
  });

  it('fires the moment the target is crossed', () => {
    const out = ask({ totals: { '2026-08-07': TARGET }, streak: 1 });
    expect(out).not.toBeNull();
    expect(out!.day).toBe('2026-08-07');
    expect(out!.seconds).toBe(TARGET);
  });

  it('does not fire twice for the same day', () => {
    // Reopening the app that evening must not replay the morning's confetti.
    const totals = { '2026-08-07': TARGET + 600 };
    expect(ask({ totals, streak: 1 })).not.toBeNull();
    expect(ask({ totals, streak: 1, celebratedDay: '2026-08-07' })).toBeNull();
  });

  it('is owed again the next day', () => {
    expect(ask({
      today: '2026-08-08',
      totals: { '2026-08-07': TARGET, '2026-08-08': TARGET },
      streak: 2,
      celebratedDay: '2026-08-07'
    })).not.toBeNull();
  });

  it('never fires for yesterday, however good yesterday was', () => {
    // Hitting the target at 11pm and opening the app at 9am the next morning
    // should show today's empty dial, not last night's party.
    expect(ask({
      today: '2026-08-08',
      totals: { '2026-08-07': TARGET * 2 },
      streak: 1,
      celebratedDay: null
    })).toBeNull();
  });

  it('refuses a target of zero', () => {
    // Otherwise a day with nothing in it "meets" the target on app open.
    expect(ask({ targetSeconds: 0, totals: {} })).toBeNull();
    expect(ask({ targetSeconds: 0, totals: { '2026-08-07': 0 } })).toBeNull();
  });
});

describe('which celebration', () => {
  it('marks the very first target ever met as the first', () => {
    const out = ask({ totals: { '2026-08-07': TARGET }, streak: 1 });
    expect(out!.kind).toBe('first');
  });

  it('calls an ordinary good day exactly that', () => {
    const out = ask({
      totals: { '2026-08-05': TARGET, '2026-08-06': TARGET, '2026-08-07': TARGET },
      streak: 3 + 1
    });
    expect(out!.kind).toBe('target');
    expect(out!.milestone).toBeNull();
  });

  it('gives a milestone streak its own headline', () => {
    const totals: Record<string, number> = {};
    for (let d = 1; d <= 7; d++) totals[`2026-08-0${d}`] = TARGET;
    const out = celebrationFor({
      today: '2026-08-07', totals, targetSeconds: TARGET, streak: 7, celebratedDay: null
    });
    expect(out!.kind).toBe('streak');
    expect(out!.milestone).toBe(7);
  });

  it('lets the first one outrank a milestone', () => {
    /* Someone who backfills a week of past study in one sitting has a streak
       of 7 and has celebrated nothing. Handing them a 7-day trophy for an
       afternoon of data entry would be a lie; they have started, and that is
       what they get told. */
    const out = ask({ totals: { '2026-08-07': TARGET }, streak: 7 });
    expect(out!.kind).toBe('first');
  });

  it('carries the streak so the card can show it', () => {
    expect(ask({ totals: { '2026-08-07': TARGET }, streak: 12 })!.streak).toBe(12);
  });

  it('counts only days that met the target when deciding "first"', () => {
    // Four short days before today do not make today the second time.
    const out = ask({
      totals: {
        '2026-08-03': 60, '2026-08-04': 60, '2026-08-05': 60, '2026-08-06': 60,
        '2026-08-07': TARGET
      },
      streak: 1
    });
    expect(out!.kind).toBe('first');
  });
});
