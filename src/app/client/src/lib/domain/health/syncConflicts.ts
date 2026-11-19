/**
 * Cloud sync conflict copies: detection and archive-first resolution.
 * Port of server/services/SyncConflictService.js. Paths are vault-relative.
 *
 * Nothing is deleted. "Remove a copy" is `fs.moveToArchive`; "keep the
 * conflicted copy" writes its content over the base file, then archives the
 * conflicted copy.
 */

import { ARCHIVE_DIR, baseName, hasTextExtension, normalizePath, parentPath } from '$lib/vault/paths';
import type { VaultEntry, VaultFs } from '$lib/vault/types';

export type ConflictProvider = 'dropbox' | 'syncthing' | 'onedrive' | 'google-drive' | 'generic';

export interface SyncConflict {
  /** Vault-relative (the server returned an absolute path here). */
  conflictPath: string;
  relPath: string;
  filename: string;
  sizeBytes: number;
  mtime: string | null;
  baseFilename: string;
  basePath: string;
  baseRelPath: string;
  baseExists: boolean;
  baseSizeBytes: number | null;
  baseMtime: string | null;
  provider: ConflictProvider;
  /** True for the OneDrive and Google Drive patterns, which are guesses (see below). */
  inferred: boolean;
}

export const RESOLUTIONS = ['keep_local', 'keep_conflict', 'keep_cloud', 'archive'] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export interface ConflictMatch {
  base: string;
  provider: ConflictProvider;
  inferred: boolean;
}

function splitExt(name: string): [string, string] {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
}

/** Markers on the whole file name (they may sit before or after the extension). */
const NAME_MARKERS: Array<{ re: RegExp; provider: ConflictProvider }> = [
  // Syncthing: `name.sync-conflict-20260915-101500-ABCDEF1.ext` (Synology Drive uses the same marker).
  { re: /\.sync-conflict-[A-Za-z0-9-]*/i, provider: 'syncthing' },
  { re: /\.sync-temp-\d+/i, provider: 'syncthing' }
];

/** Markers on the name without its extension. */
const STEM_MARKERS: Array<{ re: RegExp; provider: ConflictProvider }> = [
  // Dropbox: `name (Alex's conflicted copy 2026-09-15).ext`, nested `(... (1))` allowed.
  { re: /\s*\((?:[^()]|\([^()]*\))*conflicted copy(?:[^()]|\([^()]*\))*\)/i, provider: 'dropbox' },
  { re: /\s*[-_.]*conflicted copy[-_.]*/i, provider: 'dropbox' },
  { re: /\s*\(Case Conflict(?:\s+\d+)?\)/i, provider: 'dropbox' },
  { re: /\s*\(conflict\)/i, provider: 'generic' }
];

/** A Windows computer name: up to 15 of A-Z, 0-9 and '-', with at least one letter. */
const MACHINE_NAME = /^[A-Z0-9](?:[A-Z0-9-]{1,13}[A-Z0-9])?$/;

/**
 * Returns the base file name when `name` looks like a sync conflict copy.
 * `siblings` are the file names in the same folder; the inferred patterns
 * only match when the base file exists there.
 */
export function detectConflict(name: string, siblings: Set<string>): ConflictMatch | null {
  for (const { re, provider } of NAME_MARKERS) {
    if (re.test(name)) {
      const base = name.replace(re, '').trim();
      if (base && base !== name) return { base, provider, inferred: false };
    }
  }
  const [stem, ext] = splitExt(name);
  for (const { re, provider } of STEM_MARKERS) {
    if (re.test(stem)) {
      const cleaned = stem.replace(re, '').trim();
      if (cleaned) return { base: `${cleaned}${ext}`, provider, inferred: false };
    }
  }

  // The two patterns below are inferred from public descriptions of the sync
  // clients, not confirmed against real OneDrive or Google Drive conflicts.
  // They only fire when the plain sibling file exists, but can still flag a
  // deliberate pair such as `Logo.pdf` + `Logo-CMYK.pdf`; bulk cleaning skips them.

  // OneDrive: `name-COMPUTERNAME.ext`, e.g. `README-DESKTOP-AB12CD.md`.
  for (let i = stem.indexOf('-'); i > 0; i = stem.indexOf('-', i + 1)) {
    const machine = stem.slice(i + 1);
    if (machine.length >= 3 && MACHINE_NAME.test(machine) && /[A-Z]/.test(machine)) {
      const base = `${stem.slice(0, i)}${ext}`;
      if (siblings.has(base)) return { base, provider: 'onedrive', inferred: true };
    }
  }

  // Google Drive: `name (1).ext`, `name (2).ext`.
  const numbered = stem.match(/^(.+?) \(\d+\)$/);
  if (numbered) {
    const base = `${numbered[1]}${ext}`;
    if (siblings.has(base)) return { base, provider: 'google-drive', inferred: true };
  }
  return null;
}

const iso = (ms: number | null | undefined) => (typeof ms === 'number' ? new Date(ms).toISOString() : null);
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);

/** Every conflict copy in one scan of the vault. `_Archive/` is ignored. */
export function findSyncConflicts(entries: VaultEntry[]): SyncConflict[] {
  const files = new Map<string, VaultEntry>();
  const byFolder = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.isDir || e.path === ARCHIVE_DIR || e.path.startsWith(`${ARCHIVE_DIR}/`)) continue;
    // Hidden files are app-internal (for example the presence file .kanso-open.json).
    if (baseName(e.path).startsWith('.')) continue;
    files.set(e.path, e);
    const dir = parentPath(e.path);
    if (!byFolder.has(dir)) byFolder.set(dir, new Set());
    byFolder.get(dir)!.add(baseName(e.path));
  }

  const out: SyncConflict[] = [];
  for (const entry of files.values()) {
    const dir = parentPath(entry.path);
    const filename = baseName(entry.path);
    const match = detectConflict(filename, byFolder.get(dir)!);
    if (!match) continue;
    const basePath = join(dir, match.base);
    const base = files.get(basePath);
    out.push({
      conflictPath: entry.path,
      relPath: entry.path,
      filename,
      sizeBytes: entry.size,
      mtime: iso(entry.modifiedMs),
      baseFilename: match.base,
      basePath,
      baseRelPath: basePath,
      baseExists: Boolean(base),
      baseSizeBytes: base ? base.size : null,
      baseMtime: base ? iso(base.modifiedMs) : null,
      provider: match.provider,
      inferred: match.inferred
    });
  }
  return out.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
}

export async function scanSyncConflicts(fs: VaultFs): Promise<SyncConflict[]> {
  return findSyncConflicts(await fs.scan(''));
}

export interface ResolveResult {
  success: true;
  message: string;
  conflictPath: string;
  basePath: string;
  resolution: Resolution;
  archivedTo: string;
}

/**
 * keep_local / archive: the conflicted copy goes to `_Archive/`.
 * keep_conflict / keep_cloud: its content replaces the base file, then the
 * copy goes to `_Archive/`.
 */
export async function resolveSyncConflict(
  fs: VaultFs,
  conflictPath: string,
  resolution: string = 'keep_local'
): Promise<ResolveResult> {
  if (!RESOLUTIONS.includes(resolution as Resolution)) {
    throw new Error(`Unknown resolution strategy: ${resolution}`);
  }
  if (!conflictPath || typeof conflictPath !== 'string') throw new Error('conflictPath is required.');
  const rel = normalizePath(conflictPath);
  const dir = parentPath(rel);
  const filename = baseName(rel);

  let listing: VaultEntry[];
  try {
    listing = await fs.listDir(dir);
  } catch {
    throw new Error(`Conflict file not found on disk: ${conflictPath}`);
  }
  if (!listing.some((e) => e.path === rel && !e.isDir)) throw new Error(`Conflict file not found on disk: ${conflictPath}`);
  const siblings = new Set(listing.filter((e) => !e.isDir).map((e) => baseName(e.path)));
  const match = detectConflict(filename, siblings);
  if (!match) throw new Error(`"${filename}" is not a sync conflict copy.`);
  const basePath = join(dir, match.base);

  if (resolution === 'keep_conflict' || resolution === 'keep_cloud') {
    if (hasTextExtension(rel)) await fs.writeText(basePath, await fs.readText(rel));
    else await fs.copyWithin(rel, basePath, true);
  }
  const archivedTo = await fs.moveToArchive(rel);
  return {
    success: true,
    message: `Sync conflict resolved via ${resolution}`,
    conflictPath: rel,
    basePath,
    resolution: resolution as Resolution,
    archivedTo
  };
}

export interface CleanResult {
  success: true;
  resolvedCount: number;
  totalCount: number;
  details: Array<Record<string, unknown>>;
}

/** Bulk resolution (VaultHealthService.cleanAllSyncConflicts). Inferred matches are left for the user. */
export async function cleanAllSyncConflicts(fs: VaultFs, resolution: string = 'keep_local'): Promise<CleanResult> {
  if (!RESOLUTIONS.includes(resolution as Resolution)) {
    throw new Error(`Unknown resolution strategy: ${resolution}`);
  }
  const conflicts = await scanSyncConflicts(fs);
  const details: Array<Record<string, unknown>> = [];
  for (const c of conflicts) {
    if (c.inferred) {
      details.push({
        conflict: c.filename,
        success: false,
        skipped: true,
        error: 'Possible OneDrive or Google Drive copy. Resolve it on its own.'
      });
      continue;
    }
    try {
      details.push({ conflict: c.filename, ...(await resolveSyncConflict(fs, c.conflictPath, resolution)) });
    } catch (err: any) {
      details.push({ conflict: c.filename, success: false, error: err.message });
    }
  }
  return {
    success: true,
    resolvedCount: details.filter((d) => d.success === true).length,
    totalCount: conflicts.length,
    details
  };
}
