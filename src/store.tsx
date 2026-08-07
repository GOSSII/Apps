import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import { AppState as RNAppState } from 'react-native';
import type {
  ActiveTimer, AppState, Exam, Pomodoro, Reminder, Session, Subject
} from './types';
import { emptyState, loadState, saveState } from './lib/storage';
import { dayKey } from './lib/dates';
import { humanDuration } from './lib/format';
import { breakSecondsOf, focusSecondsOf } from './lib/presets';
import { translate, type Key, type Lang, type Params } from './i18n';
import { subjectPalette } from './theme';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Seconds on the clock right now, derived from timestamps rather than a
 *  ticking counter — so time spent with the app closed still counts. */
export function elapsedOf(active: ActiveTimer | null, now = Date.now()): number {
  if (!active) return 0;
  const live = active.runningSince ? (now - active.runningSince) / 1000 : 0;
  return Math.floor(active.bankedSeconds + live);
}

/** What a fixed round should credit. A round you asked to be 25 minutes
 *  credits 25 minutes, even if the phone sat on the timer for an hour. */
export function creditedSeconds(active: ActiveTimer | null, now = Date.now()): number {
  const elapsed = elapsedOf(active, now);
  if (!active?.plannedSeconds) return elapsed;
  return Math.min(elapsed, active.plannedSeconds);
}

export function remainingOf(active: ActiveTimer | null, now = Date.now()): number | null {
  if (!active?.plannedSeconds) return null;
  return Math.max(0, active.plannedSeconds - elapsedOf(active, now));
}

export const isRoundDone = (active: ActiveTimer | null, now = Date.now()): boolean =>
  remainingOf(active, now) === 0;

/** The instant the clock really stopped — which is what the session must be
 *  dated by. A round that ran out at 23:20 belongs to that night even if the
 *  app is not reopened until the next morning, and a fixed round stops when
 *  its time is up, not when the phone is finally picked up. */
export function stopInstant(active: ActiveTimer | null, now = Date.now()): number {
  if (!active) return now;
  if (active.runningSince === null) return active.pausedAt ?? now;
  const wouldEnd = active.plannedSeconds
    ? active.runningSince + (active.plannedSeconds - active.bankedSeconds) * 1000
    : Infinity;
  return Math.min(now, wouldEnd);
}

type Actions = {
  addSubject(name: string): void;
  renameSubject(id: string, name: string): void;
  deleteSubject(id: string): void;
  /** Starts a focus sitting. Length comes from the current preset. */
  startTimer(subjectId: string): void;
  startBreak(): void;
  pauseTimer(): void;
  resumeTimer(): void;
  /** Banks the sitting as a session. Returns seconds credited (0 for a break). */
  stopTimer(): number;
  discardTimer(): void;
  logManual(subjectId: string, minutes: number): void;
  editSession(id: string, patch: { minutes?: number; day?: string; subjectId?: string }): void;
  deleteSession(id: string): void;
  setDailyTarget(minutes: number): void;
  setExam(exam: Exam | null): void;
  setLang(lang: Lang): void;
  setReminder(reminder: Reminder): void;
  setPomodoro(pomodoro: Pomodoro): void;
  /** Swaps in a restored backup wholesale. */
  replaceAll(next: AppState): void;
  resetAll(): void;
};

type Ctx = { state: AppState; ready: boolean } & Actions;

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let alive = true;
    loadState().then(loaded => {
      if (!alive) return;
      setState(loaded);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (ready) void saveState(state);
  }, [state, ready]);

  /* Leaving the app mid-sitting is the thing this app is trying to help with,
     so it is counted rather than punished — the number goes in the session. */
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', next => {
      if (next !== 'background') return;
      setState(s => {
        if (!s.active || s.active.kind !== 'focus' || !s.active.runningSince) return s;
        return { ...s, active: { ...s.active, distractions: s.active.distractions + 1 } };
      });
    });
    return () => sub.remove();
  }, []);

  const addSubject = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState(s => {
      const exists = s.subjects.some(x => x.name.toLowerCase() === clean.toLowerCase());
      if (exists) return s;
      const subject: Subject = {
        id: uid(),
        name: clean,
        color: subjectPalette[s.subjects.length % subjectPalette.length]
      };
      return { ...s, subjects: [...s.subjects, subject] };
    });
  }, []);

  const renameSubject = useCallback((id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState(s => ({
      ...s,
      subjects: s.subjects.map(x => (x.id === id ? { ...x, name: clean } : x))
    }));
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setState(s => ({
      ...s,
      subjects: s.subjects.filter(x => x.id !== id),
      sessions: s.sessions.filter(x => x.subjectId !== id),
      active: s.active?.subjectId === id ? null : s.active
    }));
  }, []);

  /** Banks whatever is on the clock into a session. Breaks are dropped. */
  const bank = (s: AppState): AppState => {
    const seconds = creditedSeconds(s.active);
    if (!s.active || s.active.kind === 'break' || seconds < 1) {
      return { ...s, active: null };
    }
    const endedAt = stopInstant(s.active);
    const session: Session = {
      id: uid(),
      subjectId: s.active.subjectId,
      day: dayKey(new Date(endedAt)),
      seconds,
      endedAt,
      distractions: s.active.distractions || undefined,
      planned: s.active.plannedSeconds ? true : undefined
    };
    return { ...s, sessions: [...s.sessions, session], active: null };
  };

  const startTimer = useCallback((subjectId: string) => {
    setState(s => {
      const banked = s.active ? bank(s) : s;
      /* Every sitting started while another is on screen continues the
         cycle — whether it follows a break or another round. */
      const round = s.active ? s.active.round + 1 : 1;
      return {
        ...banked,
        active: {
          subjectId,
          runningSince: Date.now(),
          bankedSeconds: 0,
          pausedAt: null,
          plannedSeconds: focusSecondsOf(s.pomodoro),
          kind: 'focus',
          distractions: 0,
          round
        }
      };
    });
  }, []);

  const startBreak = useCallback(() => {
    setState(s => {
      const banked = s.active ? bank(s) : s;
      const subjectId = s.active?.subjectId ?? s.subjects[0]?.id;
      if (!subjectId) return banked;
      return {
        ...banked,
        active: {
          subjectId,
          runningSince: Date.now(),
          bankedSeconds: 0,
          pausedAt: null,
          plannedSeconds: breakSecondsOf(s.pomodoro) ?? 5 * 60,
          kind: 'break',
          distractions: 0,
          round: s.active?.round ?? 1
        }
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setState(s => {
      if (!s.active?.runningSince) return s;
      return {
        ...s,
        active: {
          ...s.active,
          /* Cap at the planned length so a round that overran while the phone
             was in a pocket does not resume with a negative remainder. */
          bankedSeconds: creditedSeconds(s.active),
          pausedAt: stopInstant(s.active),
          runningSince: null
        }
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setState(s => {
      if (!s.active || s.active.runningSince) return s;
      return { ...s, active: { ...s.active, runningSince: Date.now(), pausedAt: null } };
    });
  }, []);

  const stopTimer = useCallback((): number => {
    const active = stateRef.current.active;
    const seconds = active?.kind === 'break' ? 0 : creditedSeconds(active);
    setState(bank);
    return seconds;
  }, []);

  const discardTimer = useCallback(() => {
    setState(s => ({ ...s, active: null }));
  }, []);

  const logManual = useCallback((subjectId: string, minutes: number) => {
    if (!(minutes > 0)) return;
    setState(s => ({
      ...s,
      sessions: [...s.sessions, {
        id: uid(),
        subjectId,
        day: dayKey(),
        seconds: Math.round(minutes * 60),
        endedAt: Date.now(),
        manual: true
      }]
    }));
  }, []);

  const editSession = useCallback(
    (id: string, patch: { minutes?: number; day?: string; subjectId?: string }) => {
      setState(s => ({
        ...s,
        sessions: s.sessions.map(x => {
          if (x.id !== id) return x;
          const next = { ...x };
          if (patch.minutes !== undefined && patch.minutes > 0) {
            next.seconds = Math.round(patch.minutes * 60);
          }
          if (patch.day) next.day = patch.day;
          /* Moving a sitting to a subject that no longer exists would orphan
             it, so an unknown id is ignored rather than written. */
          if (patch.subjectId && s.subjects.some(sub => sub.id === patch.subjectId)) {
            next.subjectId = patch.subjectId;
          }
          return next;
        })
      }));
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setState(s => ({ ...s, sessions: s.sessions.filter(x => x.id !== id) }));
  }, []);

  const setDailyTarget = useCallback((minutes: number) => {
    setState(s => ({ ...s, dailyTargetMinutes: Math.max(15, Math.min(960, minutes)) }));
  }, []);

  const setExam = useCallback((exam: Exam | null) => {
    setState(s => ({ ...s, exam }));
  }, []);

  const setLang = useCallback((lang: Lang) => {
    setState(s => ({ ...s, lang }));
  }, []);

  const setReminder = useCallback((reminder: Reminder) => {
    setState(s => ({ ...s, reminder }));
  }, []);

  const setPomodoro = useCallback((pomodoro: Pomodoro) => {
    setState(s => ({ ...s, pomodoro }));
  }, []);

  const replaceAll = useCallback((next: AppState) => {
    /* A restore never carries a running timer across — see serialiseBackup. */
    setState({ ...next, active: null });
  }, []);

  const resetAll = useCallback(() => setState(emptyState()), []);

  const value = useMemo<Ctx>(() => ({
    state, ready,
    addSubject, renameSubject, deleteSubject,
    startTimer, startBreak, pauseTimer, resumeTimer, stopTimer, discardTimer,
    logManual, editSession, deleteSession, setDailyTarget, setExam,
    setLang, setReminder, setPomodoro, replaceAll, resetAll
  }), [state, ready, addSubject, renameSubject, deleteSubject, startTimer,
       startBreak, pauseTimer, resumeTimer, stopTimer, discardTimer, logManual,
       editSession, deleteSession, setDailyTarget, setExam, setLang, setReminder,
       setPomodoro, replaceAll, resetAll]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Translator bound to the language currently in state. */
export function useT(): (key: Key, params?: Params) => string {
  const { state } = useApp();
  return useCallback(
    (key: Key, params?: Params) => translate(state.lang, key, params),
    [state.lang]
  );
}

/** Duration formatter bound to the current language. */
export function useDuration(): (seconds: number) => string {
  const { state } = useApp();
  return useCallback((seconds: number) => humanDuration(seconds, state.lang), [state.lang]);
}

/** The current local day, re-rendering the caller when it rolls over.
 *  This app is used past midnight more than most, and a dial still showing
 *  yesterday's total at 00:05 would be telling the user a lie about a streak
 *  they are in the middle of earning. Polling beats scheduling a timeout to
 *  midnight: it also survives the device sleeping, or the clock/timezone
 *  moving under us. */
export function useToday(): string {
  const [day, setDay] = useState(dayKey);
  useEffect(() => {
    const id = setInterval(() => {
      const now = dayKey();
      setDay(current => (current === now ? current : now));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return day;
}

/** Re-renders once a second, but only while a timer is actually running. */
export function useTicker(active: boolean): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Date.now();
}
