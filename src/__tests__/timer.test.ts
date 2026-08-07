import {
  MAX_OPEN_SECONDS, creditedSeconds, elapsedOf, isOverCap, isRoundDone, remainingOf, stopInstant
} from '../store';
import type { ActiveTimer } from '../types';

const NOW = 1_800_000_000_000;

const timer = (patch: Partial<ActiveTimer> = {}): ActiveTimer => ({
  subjectId: 'a',
  runningSince: NOW,
  bankedSeconds: 0,
  pausedAt: null,
  plannedSeconds: null,
  kind: 'focus',
  distractions: 0,
  round: 1,
  ...patch
});

describe('elapsedOf', () => {
  it('is zero with no timer', () => {
    expect(elapsedOf(null, NOW)).toBe(0);
  });

  it('counts wall-clock time since the last resume', () => {
    expect(elapsedOf(timer({ runningSince: NOW - 90_000 }), NOW)).toBe(90);
  });

  it('adds banked time from earlier stretches', () => {
    expect(elapsedOf(timer({ runningSince: NOW - 30_000, bankedSeconds: 120 }), NOW)).toBe(150);
  });

  it('freezes while paused', () => {
    const paused = timer({ runningSince: null, bankedSeconds: 300 });
    expect(elapsedOf(paused, NOW)).toBe(300);
    expect(elapsedOf(paused, NOW + 60_000)).toBe(300);
  });

  it('keeps counting while the app was closed', () => {
    // Timestamps, not a tick counter: an hour away from the phone still counts.
    expect(elapsedOf(timer(), NOW + 3_600_000)).toBe(3600);
  });
});

describe('creditedSeconds', () => {
  it('credits everything on an open-ended sitting, up to the cap', () => {
    expect(creditedSeconds(timer(), NOW + 3_600_000)).toBe(3600);
  });

  it('caps an open sitting that was left running overnight', () => {
    // A phone forgotten on the desk would otherwise credit eight hours of
    // study nobody did, and hand the user a target they never earned.
    expect(creditedSeconds(timer(), NOW + 9 * 3_600_000)).toBe(MAX_OPEN_SECONDS);
  });

  it('caps a fixed round at the length that was asked for', () => {
    // A 25-minute round left running for an hour is still 25 minutes of study.
    const round = timer({ plannedSeconds: 1500 });
    expect(creditedSeconds(round, NOW + 3_600_000)).toBe(1500);
  });

  it('credits only what was actually done when a round ends early', () => {
    const round = timer({ plannedSeconds: 1500 });
    expect(creditedSeconds(round, NOW + 600_000)).toBe(600);
  });
});

describe('remainingOf', () => {
  it('is null for an open-ended sitting', () => {
    expect(remainingOf(timer(), NOW)).toBeNull();
  });

  it('counts down and stops at zero', () => {
    const round = timer({ plannedSeconds: 1500 });
    expect(remainingOf(round, NOW + 500_000)).toBe(1000);
    expect(remainingOf(round, NOW + 1_500_000)).toBe(0);
    expect(remainingOf(round, NOW + 9_000_000)).toBe(0);
  });
});

describe('isRoundDone', () => {
  it('is false for open-ended sittings, however long they run', () => {
    expect(isRoundDone(timer(), NOW + 86_400_000)).toBe(false);
  });

  it('turns true exactly when the round is used up', () => {
    const round = timer({ plannedSeconds: 1500 });
    expect(isRoundDone(round, NOW + 1_499_000)).toBe(false);
    expect(isRoundDone(round, NOW + 1_500_000)).toBe(true);
  });
});

describe('stopInstant', () => {
  it('is now for a running open-ended sitting', () => {
    expect(stopInstant(timer(), NOW + 5_000)).toBe(NOW + 5_000);
  });

  it('is the moment a fixed round ran out, not the moment it is noticed', () => {
    // The bug: a round that finished at 23:20 and was saved the next morning
    // was dated to the next morning, so the night's study — and the streak it
    // earned — moved to the wrong day.
    const round = timer({ plannedSeconds: 1500 });
    const nextMorning = NOW + 9 * 3600 * 1000;
    expect(stopInstant(round, nextMorning)).toBe(NOW + 1_500_000);
  });

  it('is the pause instant once the clock is paused', () => {
    const paused = timer({ runningSince: null, bankedSeconds: 600, pausedAt: NOW + 600_000 });
    expect(stopInstant(paused, NOW + 86_400_000)).toBe(NOW + 600_000);
  });

  it('falls back to now for a paused timer with no recorded pause', () => {
    // Older saves have no pausedAt; dating them to now beats crashing.
    const legacy = timer({ runningSince: null, bankedSeconds: 600, pausedAt: null });
    expect(stopInstant(legacy, NOW + 1000)).toBe(NOW + 1000);
  });

  it('never reports a stop time in the future for a running round', () => {
    const round = timer({ plannedSeconds: 1500 });
    expect(stopInstant(round, NOW + 60_000)).toBe(NOW + 60_000);
  });
});

describe('the open-ended cap', () => {
  it('does not trigger for an ordinary long sitting', () => {
    expect(isOverCap(timer(), NOW + 3 * 3_600_000)).toBe(false);
  });

  it('reports once a sitting has run past what it can credit', () => {
    expect(isOverCap(timer(), NOW + 7 * 3_600_000)).toBe(true);
  });

  it('never applies to a fixed round, which has its own limit', () => {
    expect(isOverCap(timer({ plannedSeconds: 1500 }), NOW + 9 * 3_600_000)).toBe(false);
  });

  it('dates a capped sitting to when it stopped counting', () => {
    // Left running at 22:00 and found the next morning: the sitting ended six
    // hours in, at 04:00 — not whenever the app was next opened.
    expect(stopInstant(timer(), NOW + 20 * 3_600_000)).toBe(NOW + MAX_OPEN_SECONDS * 1000);
  });
});
