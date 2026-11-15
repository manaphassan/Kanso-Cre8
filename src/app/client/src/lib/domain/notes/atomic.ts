/**
 * Atomic notes in `_Notes/01_Fleeting`, `02_Literature`, `03_Permanent` and
 * `_Notes/Scratchpad.md`. Port of NotesVaultService parseRawNote,
 * serializeNote, listNotes, getNote, saveNote, deleteNote and the scratchpad.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { SCRATCHPAD } from '../vaultLayout';
import { parseFrontmatter, serializeFrontmatter, validateFrontmatter } from '../frontmatter';
import {
  CATEGORIES,
  CATEGORY_FOLDERS,
  categoryDir,
  clientLookup,
  clientsFromScan,
  entryText,
  extractTasks,
  isMarkdown,
  isoDay,
  linkTarget,
  resolveCategory,
  today,
  wikiLinks,
  type ClientRef,
  type NoteCategory,
  type NoteTask
} from './model';

export interface Backlink {
  id: string;
  title: string;
  type: string;
}

export interface AtomicNote {
  id: string;
  title: string;
  type: string;
  category: string;
  tags: string[];
  created: string;
  updated: string;
  content: string;
  links: string[];
  relatedLinks: string[];
  linkedClients: string[];
  linkedProjects: string[];
  extractedTasks: NoteTask[];
  filename: string;
  categoryFolder: string;
  /** Vault-relative path of the note file. */
  filepath: string;
  backlinks?: Backlink[];
}

/** Frontmatter keys the app writes; every other key in an existing file is kept. */
const MANAGED_KEYS = ['id', 'title', 'type', 'category', 'tags', 'created', 'updated'];

export function parseNote(
  text: string,
  path: string,
  defaultCategory: NoteCategory,
  now: Date,
  clients: ClientRef[] = []
): AtomicNote {
  const { frontmatter: fm, body } = parseFrontmatter(text);
  const filename = baseName(path);
  const defaultId = filename.replace(/\.md$/i, '');
  const title = fm.title ? String(fm.title) : (body.match(/^#\s+(.+)$/m)?.[1].trim() ?? (defaultId || 'Untitled Note'));
  const type = String(fm.type || fm.category || defaultCategory || 'permanent');
  const id = String(fm.id !== undefined && fm.id !== null && fm.id !== '' ? fm.id : defaultId || `zettel_${now.getTime()}`);

  const links = wikiLinks(body);
  const bracketed = links.map((l) => `[[${l}]]`);
  const clientKeys = clientLookup(clients);
  return {
    id,
    title,
    type,
    category: type,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    created: isoDay(fm.created) || today(now),
    updated: isoDay(fm.updated) || today(now),
    content: body.trim(),
    links,
    relatedLinks: bracketed.filter((l) => !l.startsWith('[[client_') && !l.startsWith('[[2026')),
    linkedClients: bracketed.filter((l) => clientKeys.has(linkTarget(l).toLowerCase())),
    linkedProjects: bracketed.filter((l) => /^\[\[\d{6}_/.test(l)),
    extractedTasks: extractTasks(text, { id, title, category: type, path }),
    filename,
    categoryFolder: CATEGORY_FOLDERS[defaultCategory],
    filepath: path
  };
}

/** Markdown with YAML frontmatter, as the server wrote it, keeping unknown keys. */
export function serializeNote(
  data: Record<string, any>,
  id: string,
  type: NoteCategory,
  now: Date,
  existing: Record<string, any> = {}
): string {
  const title = data.title ? String(data.title) : 'Untitled Note';
  const fm: Record<string, any> = {
    id,
    title,
    type,
    category: type,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    created: isoDay(data.created) || isoDay(existing.created) || today(now),
    updated: today(now)
  };
  for (const [k, v] of Object.entries(existing)) if (!MANAGED_KEYS.includes(k)) fm[k] = v;
  let content = typeof data.content === 'string' ? data.content : String(data.content ?? '');
  if (!content.trim().startsWith('# ')) content = `# ${title}\n\n${content.trim()}`;
  return serializeFrontmatter(fm, `${content.trim()}\n`);
}

/** Notes found in one vault scan, newest `updated` first, with backlinks. */
export async function listNotes(
  fs: VaultFs,
  entries: VaultEntry[],
  now: Date,
  clients: ClientRef[] = []
): Promise<AtomicNote[]> {
  const notes: AtomicNote[] = [];
  for (const cat of CATEGORIES) {
    const prefix = `${categoryDir(cat)}/`;
    for (const e of entries) {
      if (!isMarkdown(e) || !e.path.startsWith(prefix) || e.path.slice(prefix.length).includes('/')) continue;
      const text = await entryText(fs, e);
      if (text !== null) notes.push(parseNote(text, e.path, cat, now, clients));
    }
  }
  for (const note of notes) {
    const ref = `[[${note.title}]]`;
    note.backlinks = notes
      .filter((other) => other.id !== note.id && other.content.includes(ref))
      .map((other) => ({ id: other.id, title: other.title, type: other.type }));
  }
  return notes.sort((a, b) => b.updated.localeCompare(a.updated));
}

/**
 * Finds a note by file stem or frontmatter id inside one category (or all
 * when `category` is null). `loose` also accepts a filename prefix, as the
 * server's getNote did.
 */
export function findNote(
  notes: AtomicNote[],
  category: NoteCategory | null,
  id: string,
  loose = false
): AtomicNote | null {
  const want = String(id);
  const pool = category ? notes.filter((n) => n.categoryFolder === CATEGORY_FOLDERS[category]) : notes;
  return (
    pool.find((n) => n.filename === `${want}.md`) ??
    pool.find((n) => n.id === want) ??
    (loose ? pool.find((n) => n.filename.startsWith(want)) : undefined) ??
    null
  );
}

const FORBIDDEN_NAME = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;

function slugTitle(title: unknown): string {
  return (
    String(title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'note'
  );
}

function readableTitle(title: unknown): string {
  const clean = String(title || 'Untitled').replace(FORBIDDEN_NAME, '-').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  return clean || 'Untitled';
}

function noteFilename(data: Record<string, any>, id: string): string {
  if (data.filename) {
    const name = String(data.filename).trim();
    if (/[\\/]/.test(name) || !/\.md$/i.test(name)) throw new Error(`"${name}" is not a note file name.`);
    return name;
  }
  if (data.id && /^\d{14}/.test(String(data.id))) return `${id} - ${readableTitle(data.title)}.md`;
  return `${slugTitle(data.title)}.md`;
}

/** `name.md`, or `name-2.md`... when another note already owns that name. */
function freeName(filename: string, dir: string, taken: Set<string>): string {
  const stem = filename.replace(/\.md$/i, '');
  let name = filename;
  for (let n = 2; taken.has(`${dir}/${name}`.toLowerCase()); n++) name = `${stem}-${n}.md`;
  return name;
}

/**
 * Writes a note. Older files with the same id (another filename or another
 * category) are archived first, as the server removed them. Returns the note
 * parsed from what was written.
 */
export async function saveNote(fs: VaultFs, data: Record<string, any>, now: Date): Promise<AtomicNote> {
  if (!data || typeof data !== 'object') throw new Error('Note data is required.');
  const requested = data.type || data.category || 'permanent';
  const type = resolveCategory(requested);
  const id = String(data.id || `zettel_${now.getTime()}`);
  const check = validateFrontmatter('note', { id, title: data.title, category: type ?? requested });
  if (!type || !check.valid) throw new Error(check.errors.join('; ') || `Invalid note category: "${requested}"`);

  const entries = await fs.scan('');
  const clients = clientsFromScan(entries);
  const notes = await listNotes(fs, entries, now, clients);
  const sameId = notes.filter((n) => n.id === id);
  const dir = categoryDir(type);

  let filename = noteFilename(data, id);
  const replaced = new Set(sameId.map((n) => n.filepath.toLowerCase()));
  const taken = new Set(
    entries.filter((e) => e.path.startsWith(`${dir}/`) && !replaced.has(e.path.toLowerCase())).map((e) => e.path.toLowerCase())
  );
  filename = freeName(filename, dir, taken);
  const path = `${dir}/${filename}`;

  const previous = sameId.find((n) => n.filepath === path) ?? sameId[0];
  let existing: Record<string, any> = {};
  if (previous) {
    try {
      existing = parseFrontmatter(await fs.readText(previous.filepath)).frontmatter;
    } catch {
      existing = {};
    }
  }
  for (const old of sameId) if (old.filepath !== path) await fs.moveToArchive(old.filepath);

  const serialized = serializeNote(data, id, type, now, existing);
  await fs.writeText(path, serialized);
  return parseNote(serialized, path, type, now, clients);
}

/** Archives a note ("delete"). Returns the archive path, or null if not found. */
export async function archiveNote(
  fs: VaultFs,
  category: NoteCategory | null,
  id: string,
  now: Date
): Promise<string | null> {
  const notes = await listNotes(fs, await fs.scan(''), now);
  const note = findNote(notes, category, id);
  return note ? fs.moveToArchive(note.filepath) : null;
}

export async function getScratchpad(fs: VaultFs): Promise<string> {
  try {
    return await fs.readText(SCRATCHPAD);
  } catch {
    return '';
  }
}

export async function saveScratchpad(fs: VaultFs, content: string): Promise<string> {
  const text = typeof content === 'string' ? content : String(content ?? '');
  await fs.writeText(SCRATCHPAD, text);
  return text;
}
