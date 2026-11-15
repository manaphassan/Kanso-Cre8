/**
 * Shared shapes and line-level parsing for the notes engine: categories,
 * [[WikiLinks]], `- [ ] #task` extraction and client references.
 * Port of the parsing half of server/services/NotesVaultService.js.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { parseFrontmatter } from '../frontmatter';

export type NoteCategory = 'fleeting' | 'literature' | 'permanent';

export const NOTES_ROOT = '_Notes';
export const CATEGORY_FOLDERS: Record<NoteCategory, string> = {
  fleeting: '01_Fleeting',
  literature: '02_Literature',
  permanent: '03_Permanent'
};
export const CATEGORIES = Object.keys(CATEGORY_FOLDERS) as NoteCategory[];

/** `fleeting`, `Fleeting` or `01_Fleeting` -> `fleeting`; anything else -> null. */
export function resolveCategory(value: unknown): NoteCategory | null {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return null;
  for (const cat of CATEGORIES) {
    if (cat === v || CATEGORY_FOLDERS[cat].toLowerCase() === v) return cat;
  }
  return null;
}

export function categoryDir(cat: NoteCategory): string {
  return `${NOTES_ROOT}/${CATEGORY_FOLDERS[cat]}`;
}

/** ISO `YYYY-MM-DD` from a YAML value (js-yaml turns bare dates into Date objects). */
export function isoDay(value: unknown): string {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '';
}

export function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Index of the first body line (after a `---` frontmatter block). */
export function bodyStartLine(lines: string[]): number {
  if (lines[0]?.trim() !== '---') return 0;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  return end === -1 ? 0 : end + 1;
}

/** Unique `[[...]]` targets in order of first appearance (without brackets). */
export function wikiLinks(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(/\[\[(.*?)\]\]/g), (m) => m[1]))];
}

/** `[[Note#Heading|alias]]` -> `Note`. */
export function linkTarget(raw: string): string {
  return raw.replace(/^\[\[|\]\]$/g, '').split('|')[0].split('#')[0].trim();
}

// Same grammar as the server; `normal` and `medium` added because the sample
// vault writes `due: YYYY-MM-DD <arrow> normal`.
const TASK_LINE =
  /- \[([ xX])\]\s*#task\s*(.*?)(?:\s*(?:\u{1F4C5}|due:)\s*(\d{4}-\d{2}-\d{2}))?(?:\s*(?:\u{23EB}|priority:)\s*(high|urgent|normal|medium|low))?$/u;

export interface TaskSource {
  /** Note id, or the vault path for project and journal files. */
  id: string;
  title: string;
  /** Note category, `project` or `journal`. */
  category: string;
  /** Vault-relative file path. */
  path: string;
  projectId?: string;
}

export interface NoteTask {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  sourceCategory: string;
  rawText: string;
  description: string;
  text: string;
  completed: boolean;
  dueDate: string | null;
  priority: string;
  /** Vault-relative path of the file that holds the task. */
  sourceFile: string;
  filepath: string;
  /** 0-based line in the whole file (frontmatter included). */
  lineIndex: number;
  rawLine: string;
  noteTitle: string;
  projectId?: string;
  linkedProject?: string;
}

/** Every `- [ ] #task` line in the body of a file. */
export function extractTasks(text: string, source: TaskSource): NoteTask[] {
  const lines = text.split('\n');
  const tasks: NoteTask[] = [];
  for (let i = bodyStartLine(lines); i < lines.length; i++) {
    const m = TASK_LINE.exec(lines[i]);
    const desc = m?.[2]?.trim();
    if (!m || !desc) continue;
    tasks.push({
      id: `${source.id}_task_${tasks.length + 1}`,
      sourceNoteId: source.id,
      sourceNoteTitle: source.title,
      sourceCategory: source.category,
      rawText: m[0],
      description: desc,
      text: desc,
      completed: m[1].toLowerCase() === 'x',
      dueDate: m[3] || null,
      priority: m[4] || 'normal',
      sourceFile: source.path,
      filepath: source.path,
      lineIndex: i,
      rawLine: lines[i],
      noteTitle: source.title,
      ...(source.projectId ? { projectId: source.projectId, linkedProject: source.projectId } : {})
    });
  }
  return tasks;
}

export interface ClientRef {
  code: string;
  name: string;
  folder: string;
  /** Lower-case names a WikiLink may use: code, name, folder, id. */
  keys: string[];
}

/** Clients from `_Clients/<folder>/client.md` in a scan. */
export function clientsFromScan(entries: VaultEntry[]): ClientRef[] {
  const out: ClientRef[] = [];
  for (const e of entries) {
    const m = /^_Clients\/([^/]+)\/client\.md$/i.exec(e.path);
    if (!m || e.isDir || e.text === undefined) continue;
    const fm = parseFrontmatter(e.text).frontmatter;
    const folder = m[1];
    const code = String(fm.code || folder.split('_')[0]).trim().toUpperCase();
    const name = fm.name ? String(fm.name).trim() : '';
    const keys = [code, name, folder, fm.id ? String(fm.id) : ''].filter(Boolean).map((k) => k.toLowerCase());
    out.push({ code, name, folder, keys: [...new Set(keys)] });
  }
  return out;
}

export function clientLookup(clients: ClientRef[]): Map<string, ClientRef> {
  const map = new Map<string, ClientRef>();
  for (const c of clients) for (const k of c.keys) if (!map.has(k)) map.set(k, c);
  return map;
}

/** Text of a scanned file; files too large for `scan` text are read directly. */
export async function entryText(fs: VaultFs, entry: VaultEntry): Promise<string | null> {
  if (entry.text !== undefined) return entry.text;
  try {
    return await fs.readText(entry.path);
  } catch {
    return null;
  }
}

export function isMarkdown(entry: VaultEntry): boolean {
  return !entry.isDir && entry.path.toLowerCase().endsWith('.md');
}
