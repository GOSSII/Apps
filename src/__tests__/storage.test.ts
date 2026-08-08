import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadState } from '../lib/storage';

const KEY = 'padhai-streak:v1';
const SALVAGE = 'padhai-streak:v1:unreadable';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('loadState', () => {
  it('starts empty on a fresh install', async () => {
    const state = await loadState();
    expect(state.subjects).toEqual([]);
    expect(state.pomodoro.preset).toBe('standard');
  });

  it('keeps unreadable data instead of destroying it', async () => {
    // The bug: a corrupt payload became an empty state that was immediately
    // written back over the original, losing the user's whole history.
    await AsyncStorage.setItem(KEY, '{"subjects": [oh no');
    const state = await loadState();
    expect(state.subjects).toEqual([]);
    expect(await AsyncStorage.getItem(SALVAGE)).toBe('{"subjects": [oh no');
  });

  it('fills in fields that an older save predates', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1, subjects: [], sessions: [], dailyTargetMinutes: 300
    }));
    const state = await loadState();
    expect(state.dailyTargetMinutes).toBe(300);
    expect(state.lang).toBe('en');
    expect(state.reminder).toEqual({ enabled: false, hour: 21, minute: 0 });
    expect(state.pomodoro.focusMinutes).toBe(25);
  });

  it('normalises an active timer saved before rounds existed', async () => {
    // Without defaults the focus screen renders "Round undefined" and the
    // user cannot get out of it.
    await AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1, subjects: [{ id: 's1', name: 'Physics', color: '#7c5cff' }], sessions: [],
      active: { subjectId: 's1', runningSince: 1_800_000_000_000, bankedSeconds: 42 }
    }));
    const state = await loadState();
    expect(state.active).toEqual({
      subjectId: 's1',
      runningSince: 1_800_000_000_000,
      bankedSeconds: 42,
      pausedAt: null,
      plannedSeconds: null,
      kind: 'focus',
      distractions: 0,
      round: 1
    });
  });

  it('drops an active timer that is not usable at all', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1, subjects: [], sessions: [], active: { bankedSeconds: 10 }
    }));
    expect((await loadState()).active).toBeNull();
  });
});

describe('onboarding', () => {
  it('a genuinely fresh install has not been onboarded', async () => {
    const state = await loadState();
    expect(state.onboarded).toBe(false);
  });

  it('an existing save counts as onboarded, even without the flag', async () => {
    /* The alternative greets someone who has been using the app for weeks
       with a first-run wizard, on an upgrade they did not ask for. */
    await AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1,
      subjects: [{ id: 's1', name: 'Physics', color: '#5B78E0' }],
      sessions: [{ id: 'a', subjectId: 's1', day: '2026-08-01', seconds: 3600, endedAt: 1 }]
    }));
    const state = await loadState();
    expect(state.onboarded).toBe(true);
  });

  it('an empty-but-present save also counts — they opened it before', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ v: 1, subjects: [], sessions: [] }));
    expect((await loadState()).onboarded).toBe(true);
  });

  it('respects the flag once it is written', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1, subjects: [], sessions: [], onboarded: false
    }));
    expect((await loadState()).onboarded).toBe(false);
  });
});
