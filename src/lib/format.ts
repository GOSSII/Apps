/** '2h 35m' / '45m' / '0m' — for totals. */
export function humanDuration(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** '01:23:45' — for the running timer, where every second is visible. */
export function clockDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** '1.5' hours, trimmed — used in stats where hours read better than minutes. */
export function hours(seconds: number): string {
  const h = seconds / 3600;
  return (Math.round(h * 10) / 10).toString();
}
