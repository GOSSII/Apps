import { elapsedOf } from '../store';
import type { ActiveTimer } from '../types';

const NOW = 1_800_000_000_000;

describe('elapsedOf', () => {
  it('is zero with no timer', () => {
    expect(elapsedOf(null, NOW)).toBe(0);
  });

  it('counts wall-clock time since the last resume', () => {
    const active: ActiveTimer = { subjectId: 'a', runningSince: NOW - 90_000, bankedSeconds: 0 };
    expect(elapsedOf(active, NOW)).toBe(90);
  });

  it('adds banked time from earlier stretches', () => {
    const active: ActiveTimer = { subjectId: 'a', runningSince: NOW - 30_000, bankedSeconds: 120 };
    expect(elapsedOf(active, NOW)).toBe(150);
  });

  it('freezes while paused', () => {
    const active: ActiveTimer = { subjectId: 'a', runningSince: null, bankedSeconds: 300 };
    expect(elapsedOf(active, NOW)).toBe(300);
    expect(elapsedOf(active, NOW + 60_000)).toBe(300);
  });

  it('keeps counting while the app was closed', () => {
    // Timestamps, not a tick counter: an hour away from the phone still counts.
    const active: ActiveTimer = { subjectId: 'a', runningSince: NOW, bankedSeconds: 0 };
    expect(elapsedOf(active, NOW + 3_600_000)).toBe(3600);
  });
});
