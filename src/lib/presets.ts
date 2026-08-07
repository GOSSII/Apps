import type { PresetKey, Pomodoro } from '../types';

/* Round lengths, in the shape aspirants already talk about them: a short
   starter round, the classic 25, and the long "deep work" block that most
   test-prep timetables are actually built from. */
export const PRESETS: Record<Exclude<PresetKey, 'custom'>, Pomodoro> = {
  open: { preset: 'open', focusMinutes: 0, breakMinutes: 0 },
  starter: { preset: 'starter', focusMinutes: 15, breakMinutes: 5 },
  standard: { preset: 'standard', focusMinutes: 25, breakMinutes: 5 },
  deep: { preset: 'deep', focusMinutes: 50, breakMinutes: 10 }
};

export const PRESET_ORDER: PresetKey[] = ['open', 'starter', 'standard', 'deep', 'custom'];

export const defaultPomodoro = (): Pomodoro => PRESETS.standard;

/** Minutes a round of this setting runs for; 0 means open-ended. */
export function focusSecondsOf(p: Pomodoro): number | null {
  return p.preset === 'open' || p.focusMinutes <= 0 ? null : p.focusMinutes * 60;
}

export function breakSecondsOf(p: Pomodoro): number | null {
  return p.breakMinutes <= 0 ? null : p.breakMinutes * 60;
}

export function clampMinutes(value: number, max = 240): number {
  if (!isFinite(value)) return 1;
  return Math.max(1, Math.min(max, Math.round(value)));
}
