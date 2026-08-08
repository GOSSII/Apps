import type { Lang } from '../i18n';

/* Everything is keyed on the user's local calendar day. A session that ends
   at 1am belongs to that 1am day — an aspirant studying past midnight has
   started a new day, and pretending otherwise makes streaks lie. */

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dayKey(date);
}

/** Whole days from `from` to `to`; negative if `to` is earlier. */
export function daysApart(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86400000);
}

/** Whole days from today until the given day; negative once it has passed. */
export function daysUntil(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = dayKey().split('-').map(Number);
  const today = new Date(ty, tm - 1, td).getTime();
  return Math.round((target - today) / 86400000);
}

/* Sunday first, matching the JS weekday index. The Hindi row is the ordinary
   spoken short form — र for रविवार, सो for सोमवार and so on — not a
   transliteration of the English letters, which would be no use to someone
   reading the app in Hindi. */
const WEEKDAYS: Record<Lang, string[]> = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  hi: ['र', 'सो', 'मं', 'बु', 'गु', 'शु', 'श']
};

export function weekdayLetter(key: string, lang: Lang = 'en'): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[lang][new Date(y, m - 1, d).getDay()];
}

/** '12 Aug 2026' — day-first, the way dates are read in India. */
export function prettyDate(key: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

/** What the date inputs are pre-filled with. Must be a format parseDateInput
 *  accepts — prettyDate ('1 Aug 2026') is for reading, not for editing. */
export function dateInputValue(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** Accepts what people actually type: 12/08/2026, 12-8-2026, 2026-08-12. */
export function parseDateInput(text: string): string | null {
  const parts = text.trim().split(/[\/\-.\s]+/).filter(Boolean).map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;

  let [d, m, y] = parts;
  if (parts[0] > 31) [y, m, d] = parts;          // ISO-ish, year first
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;                                  // e.g. 31 February
  }
  return dayKey(date);
}
