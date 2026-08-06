import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import type { ActiveTimer, AppState, Exam, Session, Subject } from './types';
import { emptyState, loadState, saveState } from './lib/storage';
import { dayKey } from './lib/dates';
import { subjectPalette } from './theme';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Seconds on the clock right now, derived from timestamps rather than a
 *  ticking counter — so time spent with the app closed still counts. */
export function elapsedOf(active: ActiveTimer | null, now = Date.now()): number {
  if (!active) return 0;
  const live = active.runningSince ? (now - active.runningSince) / 1000 : 0;
  return Math.floor(active.bankedSeconds + live);
}

type Actions = {
  addSubject(name: string): void;
  renameSubject(id: string, name: string): void;
  deleteSubject(id: string): void;
  startTimer(subjectId: string): void;
  pauseTimer(): void;
  resumeTimer(): void;
  /** Banks the running time as a session. Returns seconds saved (0 if none). */
  stopTimer(): number;
  discardTimer(): void;
  logManual(subjectId: string, minutes: number): void;
  deleteSession(id: string): void;
  setDailyTarget(minutes: number): void;
  setExam(exam: Exam | null): void;
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

  /** Banks whatever is on the clock into a session. Pure, so both stopTimer
   *  and "switch subject mid-sitting" can reuse it. */
  const bank = (s: AppState): AppState => {
    const seconds = elapsedOf(s.active);
    if (!s.active || seconds < 1) return { ...s, active: null };
    const session: Session = {
      id: uid(),
      subjectId: s.active.subjectId,
      day: dayKey(),
      seconds,
      endedAt: Date.now()
    };
    return { ...s, sessions: [...s.sessions, session], active: null };
  };

  const startTimer = useCallback((subjectId: string) => {
    setState(s => {
      const banked = s.active ? bank(s) : s;
      return {
        ...banked,
        active: { subjectId, runningSince: Date.now(), bankedSeconds: 0 }
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
          bankedSeconds: elapsedOf(s.active),
          runningSince: null
        }
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setState(s => {
      if (!s.active || s.active.runningSince) return s;
      return { ...s, active: { ...s.active, runningSince: Date.now() } };
    });
  }, []);

  const stopTimer = useCallback((): number => {
    const seconds = elapsedOf(stateRef.current.active);
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

  const deleteSession = useCallback((id: string) => {
    setState(s => ({ ...s, sessions: s.sessions.filter(x => x.id !== id) }));
  }, []);

  const setDailyTarget = useCallback((minutes: number) => {
    setState(s => ({ ...s, dailyTargetMinutes: Math.max(15, Math.min(960, minutes)) }));
  }, []);

  const setExam = useCallback((exam: Exam | null) => {
    setState(s => ({ ...s, exam }));
  }, []);

  const resetAll = useCallback(() => setState(emptyState()), []);

  const value = useMemo<Ctx>(() => ({
    state, ready,
    addSubject, renameSubject, deleteSubject,
    startTimer, pauseTimer, resumeTimer, stopTimer, discardTimer,
    logManual, deleteSession, setDailyTarget, setExam, resetAll
  }), [state, ready, addSubject, renameSubject, deleteSubject, startTimer,
       pauseTimer, resumeTimer, stopTimer, discardTimer, logManual,
       deleteSession, setDailyTarget, setExam, resetAll]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
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
