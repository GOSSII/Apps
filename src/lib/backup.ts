import type { AppState } from '../types';
import { emptyState } from './storage';
import { dayKey } from './dates';

/* A backup is the whole state plus a small header. Everything here is pure:
   building the text, and validating text back into state. The transport —
   a file, a share sheet, a paste — lives in the screen, so the risky half
   can be tested without a device. */

export const BACKUP_KIND = 'padhai-streak-backup';
export const BACKUP_VERSION = 1;

export type BackupHeader = {
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string;
};

export type ParseResult =
  | { ok: true; state: AppState; sessions: number; exportedAt: string | null }
  | { ok: false; reason: 'unreadable' | 'not-a-backup' | 'too-new' };

/** `at` is passed in rather than read from the clock so this stays pure. */
export function serialiseBackup(state: AppState, at: Date = new Date()): string {
  const header: BackupHeader = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: at.toISOString()
  };
  /* The active timer is deliberately dropped: restoring someone into a
     half-finished round from another phone, hours later, would credit time
     they did not study. */
  const { active, ...rest } = state;
  return JSON.stringify({ ...header, state: { ...rest, active: null } }, null, 2);
}

export function backupFilename(at: Date = new Date()): string {
  return `padhai-streak-${dayKey(at)}.json`;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Rebuilds a full state from a backup, filling anything the file predates.
 *  Deliberately forgiving about extra fields and strict about the shape it
 *  needs, so a file from a newer app is refused rather than half-applied. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  if (!isObject(raw) || raw.kind !== BACKUP_KIND || !isObject(raw.state)) {
    return { ok: false, reason: 'not-a-backup' };
  }
  if (typeof raw.version === 'number' && raw.version > BACKUP_VERSION) {
    return { ok: false, reason: 'too-new' };
  }

  const incoming = raw.state;
  if (!Array.isArray(incoming.subjects) || !Array.isArray(incoming.sessions)) {
    return { ok: false, reason: 'not-a-backup' };
  }

  const base = emptyState();
  const state: AppState = {
    ...base,
    ...(incoming as Partial<AppState>),
    subjects: incoming.subjects as AppState['subjects'],
    sessions: incoming.sessions as AppState['sessions'],
    reminder: { ...base.reminder, ...(isObject(incoming.reminder) ? incoming.reminder : {}) },
    pomodoro: { ...base.pomodoro, ...(isObject(incoming.pomodoro) ? incoming.pomodoro : {}) },
    active: null
  };

  return {
    ok: true,
    state,
    sessions: state.sessions.length,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : null
  };
}
