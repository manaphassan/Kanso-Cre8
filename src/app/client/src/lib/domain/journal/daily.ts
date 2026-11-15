/**
 * Bullet Journal daily notes: `_Journal/Daily/YYYY-MM-DD.md`.
 * Port of the daily-note part of server/services/JournalVaultService.js.
 * Rapid log symbols: `\u2022 [ ]` task, `\u2022 [x]` done, `\u2022 [>]` migrated,
 * `o` event, `- Note:` note, `* Priority:` priority.
 */

import yaml from 'js-yaml';
import { validateFrontmatter } from '../frontmatter';
import type { VaultFs } from '$lib/vault/types';
import { JournalInputError, assertDate, longDate } from './dates';

export const DAILY_DIR = '_Journal/Daily';
export const WEEKLY_DIR = '_Journal/Weekly';
export const MONTHLY_DIR = '_Journal/Monthly';
export const YEARLY_DIR = '_Journal/Yearly';

export const dailyPath = (date: string) => `${DAILY_DIR}/${date}.md`;

export type BujoType = 'task' | 'done' | 'migrated' | 'event' | 'note' | 'priority';

export interface BujoEntry {
  id: string;
  type: BujoType | string;
  text: string;
  raw: string;
  completed: boolean;
}

export interface DailyNote {
  date: string;
  title: string;
  focusIntentions: string[];
  habits: string[];
  entries: BujoEntry[];
  rawMarkdown: string;
  updatedAt: string;
}

/** What callers may send to `saveDailyNote` (the client posts a whole DailyNote). */
export interface DailyNoteInput {
  date: string;
  title?: string;
  focusIntentions?: string[];
  habits?: string[];
  entries?: Array<Partial<BujoEntry>>;
}

const DEFAULT_INTENTIONS = ['Deep visual craft', 'Zero distraction sprint', 'On-time proof delivery'];
const DAILY_TAGS = ['journal', 'bujo', 'daily'];

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Splits `---` frontmatter the way the server did. `data` is null when the
 * YAML block exists but does not parse.
 */
export function splitFrontmatter(raw: string): { matched: boolean; data: Record<string, any> | null; body: string } {
  const text = (raw || '').replace(/^\uFEFF/, '');
  const m = text.match(FRONTMATTER);
  if (!m) return { matched: false, data: {}, body: text };
  try {
    const loaded = yaml.load(m[1]);
    return { matched: true, data: loaded && typeof loaded === 'object' && !Array.isArray(loaded) ? (loaded as Record<string, any>) : {}, body: m[2] };
  } catch {
    return { matched: true, data: null, body: m[2] };
  }
}

const B = '\u2022';
const RULES: Array<{ test: RegExp; strip: RegExp; type: BujoType; completed: boolean; prefix?: RegExp }> = [
  { test: new RegExp(`^${B}\\s*\\[[xX]\\]`), strip: new RegExp(`^${B}\\s*\\[[xX]\\]\\s*`), type: 'done', completed: true },
  { test: new RegExp(`^${B}\\s*\\[>\\]`), strip: new RegExp(`^${B}\\s*\\[>\\]\\s*`), type: 'migrated', completed: false },
  { test: new RegExp(`^${B}\\s*\\[\\s*\\]`), strip: new RegExp(`^${B}\\s*\\[\\s*\\]\\s*`), type: 'task', completed: false },
  { test: /^-\s*\[[xX]\]/, strip: /^-\s*\[[xX]\]\s*/, type: 'done', completed: true },
  { test: /^-\s*\[\s*\]/, strip: /^-\s*\[\s*\]\s*/, type: 'task', completed: false },
  { test: /^o\s+/i, strip: /^o\s+/i, type: 'event', completed: false },
  { test: /^\*\s+/, strip: /^\*\s+/, type: 'priority', completed: false, prefix: /^Priority:\s*/i },
  { test: /^-\s+/, strip: /^-\s+/, type: 'note', completed: false, prefix: /^Note:\s*/i }
];

const INTENTIONS_HEADING = /^##\s*(?:\u{1F3AF}\u{FE0F}?\s*)?(Focus\s+Intentions|Daily\s+Intentions)/iu;
const RAPID_LOG_HEADING = /^##\s*(?:\u{26A1}\u{FE0F}?\s*)?(Rapid\s+Log|Tasks)/iu;

export function parseDailyNote(rawContent: string, date: string, now: Date): DailyNote {
  const split = splitFrontmatter(rawContent);
  const frontmatter: Record<string, any> = { date, title: 'Daily Creative Log', tags: DAILY_TAGS, ...(split.data || {}) };
  const habits = Array.isArray(frontmatter.habits) ? frontmatter.habits.map((h: unknown) => String(h).trim()).filter(Boolean) : [];

  let title = frontmatter.title || 'Daily Creative Log';
  const focusIntentions: string[] = [];
  const entries: BujoEntry[] = [];
  let section: 'body' | 'intentions' | 'rapid_log' | 'other' = 'body';
  let counter = 1;

  for (const rawLine of split.body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').replace(/^\u{1F4D4}\s*/u, '').trim();
      continue;
    }
    if (INTENTIONS_HEADING.test(line)) {
      section = 'intentions';
      continue;
    }
    if (RAPID_LOG_HEADING.test(line)) {
      section = 'rapid_log';
      continue;
    }
    if (line.startsWith('## ')) {
      section = 'other';
      continue;
    }
    if (section === 'intentions') {
      const item = line.replace(/^-\s*(\[[ xX]\]\s*)?/, '').trim();
      if (item) focusIntentions.push(item);
    } else if (section === 'rapid_log' || section === 'body') {
      const rule = RULES.find((r) => r.test.test(line));
      if (!rule) continue;
      let text = line.replace(rule.strip, '');
      if (rule.prefix) text = text.replace(rule.prefix, '');
      entries.push({ id: `entry_${date}_${counter++}`, type: rule.type, text: text.trim(), raw: line, completed: rule.completed });
    }
  }

  return {
    date,
    title,
    focusIntentions: focusIntentions.length ? focusIntentions : [...DEFAULT_INTENTIONS],
    habits,
    entries,
    rawMarkdown: rawContent,
    updatedAt: now.toISOString()
  };
}

function entryLine(e: Partial<BujoEntry>): string {
  const text = e.text ?? '';
  if (e.type === 'done' || (e.type === 'task' && e.completed)) return `${B} [x] ${text}`;
  if (e.type === 'migrated') return `${B} [>] ${text}`;
  if (e.type === 'task') return `${B} [ ] ${text}`;
  if (e.type === 'event') return `o ${text}`;
  if (e.type === 'priority') return `* Priority: ${text}`;
  if (e.type === 'note') return `- Note: ${text}`;
  return `${B} ${text}`;
}

export function serializeDailyNote(note: DailyNoteInput): string {
  const fm: Record<string, any> = { date: note.date, title: note.title || 'Daily Creative Log', tags: [...DAILY_TAGS] };
  if (Array.isArray(note.habits) && note.habits.length > 0) fm.habits = note.habits;
  Object.assign(fm, validateFrontmatter('journal_day', fm).data);

  let md = `---\n${yaml.dump(fm).trim()}\n---\n\n`;
  md += `# ${note.title || 'Daily Creative Log'}\n\n`;
  if (note.focusIntentions && note.focusIntentions.length) {
    md += '## Focus Intentions\n';
    for (const item of note.focusIntentions) md += `- [ ] ${item}\n`;
    md += '\n';
  }
  md += '## Rapid Log\n';
  for (const e of note.entries || []) md += `${entryLine(e)}\n`;
  return md;
}

export function defaultDailyNote(date: string, now: Date): DailyNote {
  const note: DailyNote = {
    date,
    title: longDate(date),
    focusIntentions: [...DEFAULT_INTENTIONS],
    habits: [],
    entries: [
      { id: `entry_${date}_1`, type: 'priority', text: 'Define top creative sprint priorities', raw: '* Priority: Define top creative sprint priorities', completed: false },
      { id: `entry_${date}_2`, type: 'task', text: 'Review visual proofs and client feedback', raw: `${B} [ ] Review visual proofs and client feedback`, completed: false }
    ],
    rawMarkdown: '',
    updatedAt: now.toISOString()
  };
  note.rawMarkdown = serializeDailyNote(note);
  return note;
}

export interface DailyFile {
  date: string;
  filename: string;
  modified: number | null;
  text?: string;
}

/** Every `.md` file directly in `_Journal/Daily/`, from one scan, keyed by date. */
export async function readDailyIndex(fs: VaultFs): Promise<Map<string, DailyFile>> {
  const index = new Map<string, DailyFile>();
  let entries: Awaited<ReturnType<VaultFs['scan']>> = [];
  try {
    entries = await fs.scan(DAILY_DIR);
  } catch {
    return index;
  }
  for (const e of entries) {
    const filename = e.path.slice(DAILY_DIR.length + 1);
    if (e.isDir || filename.includes('/') || !filename.endsWith('.md')) continue;
    const date = filename.slice(0, -3);
    index.set(date, { date, filename, modified: e.modifiedMs, text: e.text });
  }
  return index;
}

/** Newest first, like the server's `listDailyNotes`. */
export async function listDailyNotes(fs: VaultFs, index?: Map<string, DailyFile>) {
  const files = [...(index ?? (await readDailyIndex(fs))).values()];
  return files.map(({ date, filename, modified }) => ({ date, filename, modified })).sort((a, b) => b.date.localeCompare(a.date));
}

async function dailyText(fs: VaultFs, date: string, index?: Map<string, DailyFile>): Promise<string | null> {
  if (index) {
    const file = index.get(date);
    if (!file) return null;
    if (file.text !== undefined) return file.text;
  }
  try {
    return await fs.readText(dailyPath(date));
  } catch {
    return null;
  }
}

export async function dailyNoteExists(fs: VaultFs, date: string, index?: Map<string, DailyFile>): Promise<boolean> {
  return (await dailyText(fs, date, index)) !== null;
}

/** The note on disk, or the default template (not written) when there is none. */
export async function getDailyNote(fs: VaultFs, date: string, now: Date, index?: Map<string, DailyFile>): Promise<DailyNote> {
  const target = assertDate(date);
  const raw = await dailyText(fs, target, index);
  return raw === null ? defaultDailyNote(target, now) : parseDailyNote(raw, target, now);
}

export async function saveDailyNote(fs: VaultFs, note: DailyNoteInput, now: Date): Promise<DailyNote> {
  if (!note || !note.date) throw new JournalInputError('Valid date is required to save a daily note.');
  const date = assertDate(note.date, 'Valid date is required to save a daily note.');
  const serialized = serializeDailyNote({ ...note, date });
  await fs.writeText(dailyPath(date), serialized);
  return parseDailyNote(serialized, date, now);
}
