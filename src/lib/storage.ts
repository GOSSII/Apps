import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveTimer, AppState, Subject, ThemePref } from '../types';
import { defaultPomodoro } from './presets';
import { legacySubjectColours } from '../theme';

const KEY = 'padhai-streak:v1';
/* Unreadable data is kept, not thrown away — someone's whole study history
   is not worth losing to one bad write. */
const SALVAGE_KEY = 'padhai-streak:v1:unreadable';

export const emptyState = (): AppState => ({
  v: 1,
  subjects: [],
  sessions: [],
  dailyTargetMinutes: 240,
  exam: null,
  active: null,
  lang: 'en',
  reminder: { enabled: false, hour: 21, minute: 0 },
  pomodoro: defaultPomodoro(),
  themePref: 'system',
  celebratedDay: null
});

/** Subject colours were chosen when only the light ground existed. Left alone
 *  they become dots nobody can see once the app is dark, so a known old value
 *  is swapped for its two-ground replacement on load. Anything unrecognised is
 *  left exactly as it is — it may well be deliberate. */
export function migrateSubjectColours(subjects: Subject[]): Subject[] {
  return subjects.map(s => {
    const next = legacySubjectColours[s.color];
    return next ? { ...s, color: next } : s;
  });
}

const THEME_PREFS: ThemePref[] = ['system', 'light', 'dark'];

/** An active timer saved by an older version lacks the round fields; without
 *  defaults the focus screen renders "Round undefined" and cannot be left. */
function normaliseActive(active: unknown): ActiveTimer | null {
  if (!active || typeof active !== 'object') return null;
  const a = active as Partial<ActiveTimer>;
  if (typeof a.subjectId !== 'string') return null;
  return {
    subjectId: a.subjectId,
    runningSince: typeof a.runningSince === 'number' ? a.runningSince : null,
    bankedSeconds: typeof a.bankedSeconds === 'number' ? a.bankedSeconds : 0,
    pausedAt: typeof a.pausedAt === 'number' ? a.pausedAt : null,
    plannedSeconds: typeof a.plannedSeconds === 'number' ? a.plannedSeconds : null,
    kind: a.kind === 'break' ? 'break' : 'focus',
    distractions: typeof a.distractions === 'number' ? a.distractions : 0,
    round: typeof a.round === 'number' && a.round > 0 ? a.round : 1
  };
}

export async function loadState(): Promise<AppState> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      subjects: migrateSubjectColours(parsed.subjects ?? []),
      sessions: parsed.sessions ?? [],
      themePref: THEME_PREFS.includes(parsed.themePref as ThemePref)
        ? (parsed.themePref as ThemePref)
        : base.themePref,
      celebratedDay: typeof parsed.celebratedDay === 'string' ? parsed.celebratedDay : null,
      /* Older saves predate these fields — merge rather than replace, so an
         upgrade never lands the user on `undefined`. */
      reminder: { ...base.reminder, ...(parsed.reminder ?? {}) },
      pomodoro: { ...base.pomodoro, ...(parsed.pomodoro ?? {}) },
      active: normaliseActive(parsed.active)
    };
  } catch (err) {
    console.warn('Could not read saved data, starting fresh', err);
    if (raw) {
      // Keep the unreadable payload so nothing is destroyed by starting over.
      await AsyncStorage.setItem(SALVAGE_KEY, raw).catch(() => {});
    }
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
