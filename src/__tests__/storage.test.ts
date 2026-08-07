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
