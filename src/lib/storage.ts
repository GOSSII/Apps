import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from '../types';

const KEY = 'padhai-streak:v1';

export const emptyState = (): AppState => ({
  v: 1,
  subjects: [],
  sessions: [],
  dailyTargetMinutes: 240,
  exam: null,
  active: null,
  lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 }
});

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      subjects: parsed.subjects ?? [],
      sessions: parsed.sessions ?? [],
      /* Older saves predate these fields — merge rather than replace, so an
         upgrade never lands the user on `undefined`. */
      reminder: { ...base.reminder, ...(parsed.reminder ?? {}) }
    };
  } catch (err) {
    console.warn('Could not read saved data, starting fresh', err);
    return emptyState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save data', err);
  }
}
