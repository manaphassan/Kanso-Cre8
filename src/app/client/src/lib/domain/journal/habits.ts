/**
 * Daily habits: `habits:` in the daily note frontmatter, the Monday-Sunday
 * matrix and the streak history. Port of the habit part of JournalVaultService.js.
 */

import type { VaultFs } from '$lib/vault/types';
import { DAY_LABELS, JournalInputError, addDays, assertDate, dayOfMonth, shortWeekday, weekDates } from './dates';
import { getDailyNote, readDailyIndex, saveDailyNote, type DailyNote } from './daily';

export async function toggleDailyHabit(fs: VaultFs, date: string, habitId: string, now: Date): Promise<DailyNote> {
  if (!habitId) throw new JournalInputError('habitId is required.');
  const note = await getDailyNote(fs, date, now);
  const set = new Set(note.habits || []);
  if (set.has(habitId)) set.delete(habitId);
  else set.add(habitId);
  note.habits = [...set];
  return saveDailyNote(fs, note, now);
}

export interface HabitMatrixRow {
  date: string;
  dayName: string;
  habits: string[];
}

export async function getHabitWeeklyMatrix(fs: VaultFs, referenceDate: string, now: Date): Promise<HabitMatrixRow[]> {
  const index = await readDailyIndex(fs);
  const rows: HabitMatrixRow[] = [];
  const dates = weekDates(assertDate(referenceDate));
  for (let i = 0; i < dates.length; i++) {
    const daily = await getDailyNote(fs, dates[i], now, index);
    rows.push({ date: dates[i], dayName: DAY_LABELS[i], habits: daily.habits || [] });
  }
  return rows;
}

export interface HabitHistory {
  history: Array<{ date: string; dayName: string; dayNumber: number; habits: string[]; count: number }>;
  daysCount: number;
  stats: { totalCompletions: number; currentStreak: number; maxStreak: number; avgPerDay: number };
}

export async function getHabitHistory(fs: VaultFs, daysCount: number, referenceDate: string, now: Date): Promise<HabitHistory> {
  const count = Math.min(Math.max(daysCount || 30, 7), 90);
  const ref = assertDate(referenceDate);
  const index = await readDailyIndex(fs);
  const history: HabitHistory['history'] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(ref, -i);
    const habits = (await getDailyNote(fs, date, now, index)).habits || [];
    history.push({ date, dayName: shortWeekday(date), dayNumber: dayOfMonth(date), habits, count: habits.length });
  }

  let totalCompletions = 0;
  let maxStreak = 0;
  let run = 0;
  for (const item of history) {
    totalCompletions += item.count;
    run = item.count > 0 ? run + 1 : 0;
    if (run > maxStreak) maxStreak = run;
  }
  let currentStreak = 0;
  for (let i = history.length - 1; i >= 0 && history[i].count > 0; i--) currentStreak++;

  return {
    history,
    daysCount: count,
    stats: { totalCompletions, currentStreak, maxStreak, avgPerDay: count > 0 ? +(totalCompletions / count).toFixed(1) : 0 }
  };
}
