import { BACKUP_KIND, backupFilename, parseBackup, serialiseBackup } from '../backup';
import { emptyState } from '../storage';
import type { AppState } from '../../types';

const full = (): AppState => ({
  ...emptyState(),
  subjects: [
    { id: 's1', name: 'Physics', color: '#5B78E0' },
    { id: 's2', name: 'रसायन', color: '#1F8F84' }
  ],
  sessions: [
    { id: 'a', subjectId: 's1', day: '2026-08-01', seconds: 5400, endedAt: 10, planned: true },
    { id: 'b', subjectId: 's2', day: '2026-08-02', seconds: 3600, endedAt: 20, distractions: 2 }
  ],
  dailyTargetMinutes: 300,
  exam: { name: 'NEET 2027', date: '2027-05-03' },
  lang: 'hi',
  reminder: { enabled: true, hour: 6, minute: 30 },
  pomodoro: { preset: 'deep', focusMinutes: 50, breakMinutes: 10 }
});

describe('round trip', () => {
  it('brings everything back that matters', () => {
    const result = parseBackup(serialiseBackup(full()));
    if (!result.ok) throw new Error('expected a good parse, got ' + result.reason);
    expect(result.state.subjects).toEqual(full().subjects);
    expect(result.state.sessions).toEqual(full().sessions);
    expect(result.state.dailyTargetMinutes).toBe(300);
    expect(result.state.exam).toEqual({ name: 'NEET 2027', date: '2027-05-03' });
    expect(result.state.lang).toBe('hi');
    expect(result.state.reminder).toEqual({ enabled: true, hour: 6, minute: 30 });
    expect(result.state.pomodoro.focusMinutes).toBe(50);
    expect(result.sessions).toBe(2);
  });

  it('survives Devanagari subject names', () => {
    const result = parseBackup(serialiseBackup(full()));
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.subjects[1].name).toBe('रसायन');
  });

  it('never restores someone into a running round', () => {
    // Resuming a half-finished round on another phone, hours later, would
    // credit time nobody studied.
    const running = {
      ...full(),
      active: {
        subjectId: 's1', runningSince: 1, bankedSeconds: 0, pausedAt: null,
        plannedSeconds: 1500, kind: 'focus' as const, distractions: 0, round: 1
      }
    };
    const text = serialiseBackup(running);
    expect(text).not.toContain('runningSince');
    const result = parseBackup(text);
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.active).toBeNull();
  });

  it('records when it was taken', () => {
    const at = new Date('2026-08-07T04:30:00.000Z');
    const result = parseBackup(serialiseBackup(full(), at));
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.exportedAt).toBe('2026-08-07T04:30:00.000Z');
  });
});

describe('refusing bad input', () => {
  it('refuses text that is not JSON', () => {
    expect(parseBackup('not json at all')).toEqual({ ok: false, reason: 'unreadable' });
    expect(parseBackup('')).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('refuses JSON that is not one of our backups', () => {
    expect(parseBackup('{"hello":"world"}')).toEqual({ ok: false, reason: 'not-a-backup' });
    expect(parseBackup('[1,2,3]')).toEqual({ ok: false, reason: 'not-a-backup' });
    expect(parseBackup(JSON.stringify({ kind: 'some-other-app', state: {} })))
      .toEqual({ ok: false, reason: 'not-a-backup' });
  });

  it('refuses a backup missing the lists it claims to carry', () => {
    expect(parseBackup(JSON.stringify({ kind: BACKUP_KIND, version: 1, state: {} })))
      .toEqual({ ok: false, reason: 'not-a-backup' });
    expect(parseBackup(JSON.stringify({
      kind: BACKUP_KIND, version: 1, state: { subjects: [], sessions: 'lots' }
    }))).toEqual({ ok: false, reason: 'not-a-backup' });
  });

  it('refuses a file from a newer version rather than half-applying it', () => {
    expect(parseBackup(JSON.stringify({
      kind: BACKUP_KIND, version: 99, state: { subjects: [], sessions: [] }
    }))).toEqual({ ok: false, reason: 'too-new' });
  });
});

describe('older backups', () => {
  it('fills in fields the file predates', () => {
    const old = JSON.stringify({
      kind: BACKUP_KIND,
      version: 1,
      state: { subjects: [], sessions: [], dailyTargetMinutes: 180 }
    });
    const result = parseBackup(old);
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.dailyTargetMinutes).toBe(180);
    expect(result.state.lang).toBe('en');
    expect(result.state.pomodoro.preset).toBe('standard');
    expect(result.state.reminder).toEqual({ enabled: false, hour: 21, minute: 0 });
  });

  it('tolerates a partial reminder or pomodoro block', () => {
    const partial = JSON.stringify({
      kind: BACKUP_KIND,
      version: 1,
      state: { subjects: [], sessions: [], reminder: { hour: 5 }, pomodoro: { focusMinutes: 40 } }
    });
    const result = parseBackup(partial);
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.reminder).toEqual({ enabled: false, hour: 5, minute: 0 });
    expect(result.state.pomodoro.breakMinutes).toBe(5);
  });
});

describe('backupFilename', () => {
  it('is dated so several backups sit side by side', () => {
    expect(backupFilename(new Date(2026, 7, 7))).toBe('padhai-streak-2026-08-07.json');
  });
});

describe('a backup from before the app had a dark ground', () => {
  it('brings its subjects forward to colours that survive both', () => {
    // Restoring one untouched would leave the user with dots they cannot see
    // the moment they turn dark mode on.
    const old = JSON.stringify({
      kind: BACKUP_KIND,
      version: 1,
      state: {
        subjects: [{ id: 's1', name: 'Physics', color: '#3552CC' }],
        sessions: []
      }
    });
    const result = parseBackup(old);
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.subjects[0].color).toBe('#5B78E0');
  });

  it('lands on the system theme, since it cannot have expressed a preference', () => {
    const result = parseBackup(serialiseBackup({ ...full(), themePref: 'dark' }));
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.themePref).toBe('dark');

    const older = parseBackup(JSON.stringify({
      kind: BACKUP_KIND, version: 1, state: { subjects: [], sessions: [] }
    }));
    if (!older.ok) throw new Error('expected a good parse');
    expect(older.state.themePref).toBe('system');
  });
});

describe('restoring is never a first run', () => {
  it('a restored state is always onboarded', () => {
    // Whoever has a file to restore already set the app up on the phone it
    // came from; walking them through it again would be absurd.
    const result = parseBackup(JSON.stringify({
      kind: BACKUP_KIND, version: 1,
      state: { subjects: [], sessions: [], onboarded: false }
    }));
    if (!result.ok) throw new Error('expected a good parse');
    expect(result.state.onboarded).toBe(true);
  });
});
