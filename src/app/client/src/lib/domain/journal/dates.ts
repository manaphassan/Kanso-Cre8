/**
 * Calendar helpers for the journal. Dates are local-calendar `YYYY-MM-DD`
 * strings; arithmetic runs on UTC midnights so the result never depends on
 * the machine time zone (the server mixed UTC parsing with local getters).
 */

/** Invalid input from the caller (bad date, missing field). Routes map it to HTTP 400. */
export class JournalInputError extends Error {}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;
const WEEK_RE = /^\d{4}-W\d{2}$/;
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's local calendar date for `now`. */
export function localDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function localMonth(now: Date): string {
  return localDate(now).slice(0, 7);
}

export function localYear(now: Date): string {
  return String(now.getFullYear());
}

function toUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Validates a vault key used in a filename. Throws `JournalInputError`. */
function check(value: unknown, re: RegExp, message: string): string {
  const s = typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '';
  if (!re.test(s)) throw new JournalInputError(message);
  if (re === DATE_RE && fromUtc(toUtc(s)) !== s) throw new JournalInputError(message);
  return s;
}

export const assertDate = (v: unknown, message = `Invalid date "${v}". Expected YYYY-MM-DD.`) => check(v, DATE_RE, message);
export const assertMonth = (v: unknown, message = `Invalid month "${v}". Expected YYYY-MM.`) => check(v, MONTH_RE, message);
export const assertYear = (v: unknown, message = `Invalid year "${v}". Expected YYYY.`) => check(v, YEAR_RE, message);
export const assertWeek = (v: unknown, message = `Invalid week "${v}". Expected YYYY-Www.`) => check(v, WEEK_RE, message);

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(date: string): number {
  return toUtc(date).getUTCDay();
}

export function shortWeekday(date: string): string {
  return SHORT_WEEKDAYS[weekday(date)];
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** The Monday of the week containing `date` (weeks run Monday to Sunday). */
export function mondayOf(date: string): string {
  const day = weekday(date);
  return addDays(date, day === 0 ? -6 : 1 - day);
}

/** Monday..Sunday dates of the week containing `date`. */
export function weekDates(date: string): string[] {
  const monday = mondayOf(date);
  return DAY_LABELS.map((_, i) => addDays(monday, i));
}

/** ISO 8601 week key, e.g. `2026-W38` (same algorithm as the server). */
export function isoWeek(date: string): string {
  const d = toUtc(date);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(weekNo)}`;
}

/** Monday of an ISO week key (`YYYY-Www`). */
export function isoWeekMonday(week: string): string {
  const year = Number(week.slice(0, 4));
  const num = Number(week.slice(6));
  const jan4 = `${year}-01-04`;
  return addDays(mondayOf(jan4), (num - 1) * 7);
}

/** "Tuesday, September 15, 2026" for a calendar date. */
export function longDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(toUtc(date));
}
