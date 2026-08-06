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
};

/** A timer that is running or paused. Kept as timestamps, never as a
 *  counter, so closing the app does not lose the sitting. */
export type ActiveTimer = {
  subjectId: string;
  /** ms epoch of the last resume; null while paused. */
  runningSince: number | null;
  /** Seconds banked before the current resume. */
  bankedSeconds: number;
};

export type Exam = {
  name: string;
  /** 'YYYY-MM-DD' */
  date: string;
};

export type AppState = {
  v: 1;
  subjects: Subject[];
  sessions: Session[];
  dailyTargetMinutes: number;
  exam: Exam | null;
  active: ActiveTimer | null;
};
