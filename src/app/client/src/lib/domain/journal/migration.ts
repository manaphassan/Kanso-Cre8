/**
 * BuJo task rollover: find the latest earlier day with open tasks and migrate
 * them (`\u2022 [>]` on the source day, appended as open tasks on the target day).
 * Port of getPendingRollover / migrateTasks in JournalVaultService.js.
 */

import type { VaultFs } from '$lib/vault/types';
import { JournalInputError, assertDate } from './dates';
import { dailyNoteExists, getDailyNote, listDailyNotes, readDailyIndex, saveDailyNote, type BujoEntry, type DailyNote } from './daily';

const B = '\u2022';

const isOpenTask = (e: BujoEntry) => (e.type === 'task' || e.type === 'priority') && !e.completed;

export interface PendingRollover {
  hasTasks: boolean;
  fromDate: string;
  count: number;
  tasks: BujoEntry[];
}

export async function getPendingRollover(fs: VaultFs, today: string, now: Date): Promise<PendingRollover> {
  const index = await readDailyIndex(fs);
  const earlier = (await listDailyNotes(fs, index)).filter((n) => n.date < today);
  for (const meta of earlier) {
    try {
      const note = await getDailyNote(fs, meta.date, now, index);
      const tasks = note.entries.filter(isOpenTask);
      if (tasks.length > 0) return { hasTasks: true, fromDate: meta.date, count: tasks.length, tasks };
    } catch {
      // Not a dated note (e.g. "2026-09-14 copy.md"): skip, as the server did.
    }
  }
  return { hasTasks: false, fromDate: '', count: 0, tasks: [] };
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  message: string;
  migratedTasks: BujoEntry[];
  fromNote?: DailyNote;
  toNote?: DailyNote;
}

export async function migrateTasks(
  fs: VaultFs,
  fromDate: string,
  toDate: string,
  selectedTaskIds: string[] | null,
  now: Date
): Promise<MigrationResult> {
  if (!fromDate || !toDate) throw new JournalInputError('Both fromDate and toDate are required for task rollover migration.');
  const from = assertDate(fromDate);
  const to = assertDate(toDate);

  const index = await readDailyIndex(fs);
  if (!(await dailyNoteExists(fs, from, index))) {
    return { success: false, migratedCount: 0, message: `No source daily note found on disk for ${from}.`, migratedTasks: [] };
  }

  const fromNote = await getDailyNote(fs, from, now, index);
  const toNote = await getDailyNote(fs, to, now, index);

  let open = fromNote.entries.filter(isOpenTask);
  if (Array.isArray(selectedTaskIds) && selectedTaskIds.length > 0) {
    const ids = new Set(selectedTaskIds);
    open = open.filter((e) => ids.has(e.id));
  }

  if (open.length === 0) {
    return {
      success: true,
      migratedCount: 0,
      message: `All tasks for ${from} are already completed or migrated.`,
      migratedTasks: [],
      fromNote,
      toNote
    };
  }

  const openIds = new Set(open.map((t) => t.id));
  fromNote.entries = fromNote.entries.map((e) =>
    openIds.has(e.id) ? { ...e, type: 'migrated', raw: `${B} [>] ${e.text}`, completed: false } : e
  );

  const key = (text: unknown) => String(text ?? '').trim().toLowerCase();
  const existing = new Set(toNote.entries.map((e) => key(e.text)));
  const appended: BujoEntry[] = [];
  let nextId = toNote.entries.length + 1;
  for (const task of open) {
    if (existing.has(key(task.text))) continue;
    const priority = task.type === 'priority';
    const added: BujoEntry = {
      id: `entry_${to}_migrated_${nextId++}`,
      type: priority ? 'priority' : 'task',
      text: task.text,
      raw: priority ? `* Priority: ${task.text}` : `${B} [ ] ${task.text}`,
      completed: false
    };
    toNote.entries.push(added);
    appended.push(added);
    existing.add(key(task.text));
  }

  await saveDailyNote(fs, fromNote, now);
  await saveDailyNote(fs, toNote, now);

  return {
    success: true,
    migratedCount: appended.length,
    migratedTasks: appended,
    fromNote,
    toNote,
    message: `Successfully migrated ${appended.length} task(s) from ${from} to ${to}.`
  };
}
