/**
 * Demo data: the sample workspace copied into the vault on request and taken
 * out again. Port of server/services/DemoDataService.js.
 *
 * Like the server, the only stored state is the `demo_data` flag in
 * `_Team/_Config/preferences.json`; demo items are recognised by their sample
 * path. A file counts as demo data only while its content still equals the
 * sample, so clearing never touches a file the user wrote or edited, and
 * removal is `fs.moveToArchive`.
 */

import { getPreferences, savePreferences } from '$lib/domain/config';
import { SCRATCHPAD } from '$lib/domain/vaultLayout';
import { hasTextExtension, normalizeText, parseRelative } from '$lib/vault/paths';
import type { VaultEntry, VaultFs } from '$lib/vault/types';

export type DemoKind = 'client' | 'project' | 'quote' | 'invoice' | 'note' | 'journal' | 'file';

/**
 * Sample files that are not demo content: `_Team/` holds config (the user's
 * own studio profile and preferences) and retired legacy files, and the
 * scratchpad is part of the vault structure.
 */
export function isDemoPath(path: string): boolean {
  return !path.startsWith('_Team/') && path !== SCRATCHPAD;
}

interface DemoGroup {
  kind: DemoKind;
  label: string;
  /** The folder (clients, projects) or file that makes up the item. */
  root: string;
  isFolder: boolean;
  files: string[];
}

function groupOf(path: string): Omit<DemoGroup, 'files'> {
  const s = parseRelative(path);
  if (s[0] === '_Clients' && s.length > 2) return { kind: 'client', label: s[1], root: s.slice(0, 2).join('/'), isFolder: true };
  if (s[0] === '_Projects' && s.length > 3) return { kind: 'project', label: s[2], root: s.slice(0, 3).join('/'), isFolder: true };
  const label = s[s.length - 1];
  const kind: DemoKind =
    s[0] === '_Finance' && s[1] === 'Quotes'
      ? 'quote'
      : s[0] === '_Finance' && s[1] === 'Invoices'
        ? 'invoice'
        : s[0] === '_Notes'
          ? 'note'
          : s[0] === '_Journal'
            ? 'journal'
            : 'file';
  return { kind, label, root: path, isFolder: false };
}

/** The demo source (normally `sampleVault()`): its files, grouped into items. */
export class DemoSource {
  private constructor(
    readonly fs: VaultFs,
    readonly files: Map<string, VaultEntry>,
    readonly groups: DemoGroup[]
  ) {}

  static async from(fs: VaultFs): Promise<DemoSource> {
    const files = new Map<string, VaultEntry>();
    for (const e of await fs.scan('')) if (!e.isDir && isDemoPath(e.path)) files.set(e.path, e);
    const groups = new Map<string, DemoGroup>();
    for (const path of [...files.keys()].sort()) {
      const g = groupOf(path);
      if (!groups.has(g.root)) groups.set(g.root, { ...g, files: [] });
      groups.get(g.root)!.files.push(path);
    }
    return new DemoSource(fs, files, [...groups.values()]);
  }

  async text(path: string): Promise<string> {
    return normalizeText(await this.fs.readText(path));
  }
}

export interface DemoItem {
  kind: DemoKind;
  label: string;
  root: string;
  isFolder: boolean;
  /** Demo files of this item that exist in the vault. */
  files: number;
  unchanged: string[];
  changed: string[];
  /** Files inside a demo folder that are not demo files. */
  extras: string[];
}

export interface DemoStatus {
  enabled: boolean;
  present: boolean;
  counts: Record<string, number>;
  totalFiles: number;
  items: Array<{ kind: DemoKind; label: string; files: number }>;
}

async function sameAsSample(fs: VaultFs, source: DemoSource, entry: VaultEntry): Promise<boolean> {
  const sample = source.files.get(entry.path)!;
  if (hasTextExtension(entry.path)) {
    const text = entry.text ?? (await fs.readText(entry.path));
    return normalizeText(text) === (await source.text(entry.path));
  }
  if (entry.size !== sample.size) return false;
  return (await fs.sha256(entry.path)) === (await source.fs.sha256(entry.path));
}

/** Demo items currently in the vault (DemoDataService.inspect). One scan. */
export async function inspectDemoData(fs: VaultFs, source: DemoSource): Promise<DemoItem[]> {
  const entries = await fs.scan('');
  const files = new Map(entries.filter((e) => !e.isDir).map((e) => [e.path, e]));
  const items: DemoItem[] = [];
  for (const group of source.groups) {
    const unchanged: string[] = [];
    const changed: string[] = [];
    for (const path of group.files) {
      const entry = files.get(path);
      if (!entry) continue;
      ((await sameAsSample(fs, source, entry)) ? unchanged : changed).push(path);
    }
    // A sample path holding only the user's own content is not demo data.
    if (unchanged.length === 0) continue;
    const own = new Set(group.files);
    const extras = group.isFolder
      ? [...files.keys()].filter((p) => p.startsWith(`${group.root}/`) && !own.has(p))
      : [];
    items.push({
      kind: group.kind,
      label: group.label,
      root: group.root,
      isFolder: group.isFolder,
      files: unchanged.length + changed.length,
      unchanged,
      changed,
      extras
    });
  }
  return items;
}

export async function isDemoEnabled(fs: VaultFs): Promise<boolean> {
  return (await getPreferences(fs)).demo_data === true;
}

export async function demoStatus(fs: VaultFs, source: DemoSource, items?: DemoItem[]): Promise<DemoStatus> {
  const found = items ?? (await inspectDemoData(fs, source));
  const counts: Record<string, number> = {};
  for (const i of found) counts[i.kind] = (counts[i.kind] || 0) + 1;
  return {
    enabled: await isDemoEnabled(fs),
    present: found.length > 0,
    counts,
    totalFiles: found.reduce((n, i) => n + i.files, 0),
    items: found.map(({ kind, label, files }) => ({ kind, label, files }))
  };
}

export interface DemoLoadResult extends DemoStatus {
  created: string[];
  /** Sample paths that already existed and were left as they are. */
  kept: string[];
  errors: string[];
}

/** Turns the flag on and copies every missing sample file. Never overwrites. */
export async function loadDemoData(fs: VaultFs, source: DemoSource): Promise<DemoLoadResult> {
  await savePreferences(fs, { demo_data: true });
  const existing = new Set((await fs.scan('')).map((e) => e.path.toLowerCase()));
  const created: string[] = [];
  const kept: string[] = [];
  const errors: string[] = [];
  for (const [path, entry] of source.files) {
    if (existing.has(path.toLowerCase())) {
      kept.push(path);
      continue;
    }
    try {
      if (hasTextExtension(path)) {
        await fs.writeText(path, await source.text(path));
      } else {
        // sampleVault() holds binary deliverables as zero-filled placeholders of `size` bytes.
        await fs.writeBytes(path, new Uint8Array(entry.size), false);
      }
      created.push(path);
    } catch (err: any) {
      errors.push(`${path}: ${err.message}`);
    }
  }
  return { ...(await demoStatus(fs, source)), created, kept, errors };
}

export interface DemoClearResult {
  removed: Array<{ kind: DemoKind; label: string; archivedTo: string }>;
  skipped: Array<{ label: string; reason: string }>;
}

/**
 * Archives each demo item whose files are all unchanged, and turns the flag
 * off. An item holding the user's own files or edits is kept whole, as the
 * server kept client folders with extra files.
 */
export async function clearDemoData(fs: VaultFs, source: DemoSource): Promise<DemoClearResult> {
  const removed: DemoClearResult['removed'] = [];
  const skipped: DemoClearResult['skipped'] = [];
  for (const item of await inspectDemoData(fs, source)) {
    if (item.extras.length) {
      skipped.push({ label: item.label, reason: 'contains your own files' });
      continue;
    }
    if (item.changed.length) {
      skipped.push({ label: item.label, reason: `you edited ${item.changed.length} file(s)` });
      continue;
    }
    try {
      removed.push({ kind: item.kind, label: item.label, archivedTo: await fs.moveToArchive(item.root) });
    } catch (err: any) {
      skipped.push({ label: item.label, reason: err.message });
    }
  }
  await savePreferences(fs, { demo_data: false });
  return { removed, skipped };
}
