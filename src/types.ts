import type { Lang } from './i18n';

export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type Session = {
  id: string;
  subjectId: string;
  /** Local calendar day the session was credited to, 'YYYY-MM-DD'. */
  day: string;
  seconds: number;
  endedAt: number;
  /** True when the user typed the minutes in instead of running the timer. */
  manual?: boolean;
  /** How many times the app went to the background mid-sitting. */
  distractions?: number;
  /** Set when the sitting ran as a fixed-length round rather than open-ended. */
  planned?: boolean;
};

/** A timer that is running or paused. Kept as timestamps, never as a
 *  counter, so closing the app does not lose the sitting. */
export type ActiveTimer = {
  subjectId: string;
  /** ms epoch of the last resume; null while paused. */
  runningSince: number | null;
  /** Seconds banked before the current resume. */
  bankedSeconds: number;
  /** When the clock actually stopped, for a paused timer. Not the moment the
   *  user got round to tapping save — that can be the next morning. */
  pausedAt: number | null;
  /** Target length for a fixed round; null for an open-ended sitting. */
  plannedSeconds: number | null;
  /** A break does not count as study time and is never saved as a session. */
  kind: 'focus' | 'break';
  /** Times the app was backgrounded during this sitting. */
  distractions: number;
  /** Which round of the current Pomodoro cycle this is. */
  round: number;
};

export type Exam = {
  name: string;
  /** 'YYYY-MM-DD' */
  date: string;
};

/** A single repeating local notification, in the phone's own timezone. */
export type Reminder = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type PresetKey = 'open' | 'starter' | 'standard' | 'deep' | 'custom';

/** Focus/break lengths in minutes. `open` has no fixed length. */
export type Pomodoro = {
  preset: PresetKey;
  focusMinutes: number;
  breakMinutes: number;
};

/** 'system' follows the phone. The other two override it, because plenty of
 *  people keep the phone light and still want a dark app at 1am. */
export type ThemePref = 'system' | 'light' | 'dark';

export type AppState = {
  v: 1;
  subjects: Subject[];
  sessions: Session[];
  dailyTargetMinutes: number;
  exam: Exam | null;
  active: ActiveTimer | null;
  lang: Lang;
  reminder: Reminder;
  pomodoro: Pomodoro;
  themePref: ThemePref;
  /** The last day whose target-hit was celebrated, so reopening the app that
   *  evening does not replay it. */
  celebratedDay: string | null;
};
