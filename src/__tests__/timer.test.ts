import { creditedSeconds, elapsedOf, isRoundDone, remainingOf } from '../store';
import type { ActiveTimer } from '../types';

const NOW = 1_800_000_000_000;

const timer = (patch: Partial<ActiveTimer> = {}): ActiveTimer => ({
  subjectId: 'a',
  runningSince: NOW,
  bankedSeconds: 0,
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
  it('credits everything on an open-ended sitting', () => {
    expect(creditedSeconds(timer(), NOW + 3_600_000)).toBe(3600);
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
