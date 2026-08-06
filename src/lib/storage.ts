import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from '../types';

const KEY = 'padhai-streak:v1';

export const emptyState = (): AppState => ({
  v: 1,
  subjects: [],
  sessions: [],
  dailyTargetMinutes: 240,
  exam: null,
  active: null
});

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...emptyState(),
      ...parsed,
      subjects: parsed.subjects ?? [],
      sessions: parsed.sessions ?? []
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
