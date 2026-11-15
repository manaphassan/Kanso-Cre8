/**
 * Universal `- [ ] #task` rollup and the on-disk toggle. The server only read
 * `_Notes/`; the rollup now also covers project folders and `_Journal/`.
 * A toggle rewrites exactly one line of the source file.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { parseRelative } from '$lib/vault/paths';
import { parseFrontmatter } from '../frontmatter';
import type { Project } from '../projects';
import type { AtomicNote } from './atomic';
import { entryText, extractTasks, isMarkdown, type NoteTask } from './model';

export const JOURNAL_ROOT = '_Journal';
export const TASK_ROOTS = ['_Notes/', '_Journal/', '_Projects/'];

type ProjectRef = Pick<Project, 'id' | 'title' | 'fullPath'>;

/** Notes first (newest first), then journal files, then project files. */
export async function collectTasks(
  fs: VaultFs,
  entries: VaultEntry[],
  notes: AtomicNote[],
  projects: ProjectRef[]
): Promise<NoteTask[]> {
  const tasks: NoteTask[] = notes.flatMap((n) => n.extractedTasks);

  for (const e of entries) {
    if (!isMarkdown(e) || !e.path.startsWith(`${JOURNAL_ROOT}/`)) continue;
    const text = await entryText(fs, e);
    if (text === null || !text.includes('#task')) continue;
    const fm = parseFrontmatter(text).frontmatter;
    const title = fm.title ? String(fm.title) : e.path.split('/').pop()!.replace(/\.md$/i, '');
    tasks.push(...extractTasks(text, { id: e.path, title, category: 'journal', path: e.path }));
  }

  for (const p of projects) {
    const prefix = `${p.fullPath}/`;
    for (const e of entries) {
      if (!isMarkdown(e) || !e.path.startsWith(prefix)) continue;
      const text = await entryText(fs, e);
      if (text === null || !text.includes('#task')) continue;
      tasks.push(...extractTasks(text, { id: e.path, title: p.title, category: 'project', path: e.path, projectId: p.id }));
    }
  }
  return tasks;
}

/** True when `path` is a Markdown file the rollup reads (not the archive). */
export function isTaskSourcePath(path: string): boolean {
  try {
    const norm = parseRelative(path).join('/');
    return /\.md$/i.test(norm) && TASK_ROOTS.some((r) => norm.startsWith(r));
  } catch {
    return false;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CHECKBOX = /- \[([ xX])\]/;

export interface ToggleTarget {
  path: string;
  /** 0-based line; preferred when it still holds the task. */
  lineIndex?: number;
  description?: string;
  /** Desired state; omitted = flip. */
  completed?: boolean;
}

export interface ToggleOutcome {
  path: string;
  lineIndex: number;
  completed: boolean;
  changed: boolean;
  line: string;
}

/** Sets one checkbox. Every other byte of the file is kept. */
export async function toggleTaskLine(fs: VaultFs, target: ToggleTarget): Promise<ToggleOutcome> {
  const text = await fs.readText(target.path);
  const lines = text.split('\n');
  const desc = target.description?.trim() ? target.description : '';
  const byDesc = desc ? new RegExp(`- \\[([ xX])\\](\\s*(?:#task)?\\s*${escapeRegExp(desc)})`, 'i') : null;
  const fits = (line: string) => (byDesc ? byDesc.test(line) : CHECKBOX.test(line));

  let index = -1;
  const at = target.lineIndex;
  if (Number.isInteger(at) && at >= 0 && at < lines.length && fits(lines[at])) index = at;
  if (index < 0 && byDesc) index = lines.findIndex((l) => byDesc.test(l));
  if (index < 0) {
    throw new Error(desc ? `Task description not found in note file: "${desc}"` : `No task on line ${at} of ${target.path}.`);
  }

  const line = lines[index];
  const m = (byDesc ?? CHECKBOX).exec(line)!;
  const current = m[1].toLowerCase() === 'x';
  const completed = typeof target.completed === 'boolean' ? target.completed : !current;
  if (completed === current) return { path: target.path, lineIndex: index, completed, changed: false, line };

  const next = `${line.slice(0, m.index)}${completed ? '- [x]' : '- [ ]'}${line.slice(m.index + 5)}`;
  lines[index] = next;
  await fs.writeText(target.path, lines.join('\n'));
  return { path: target.path, lineIndex: index, completed, changed: true, line: next };
}
