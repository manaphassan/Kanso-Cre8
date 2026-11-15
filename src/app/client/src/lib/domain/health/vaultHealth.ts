/**
 * Vault health: compartment telemetry, broken WikiLinks, orphan notes,
 * finance frontmatter checks and sync conflicts, from one scan of the vault.
 * Port of server/services/VaultHealthService.js (getVaultHealthReport).
 */

import { parseFrontmatter, validateFrontmatter } from '$lib/domain/frontmatter';
import { baseName, parentPath } from '$lib/vault/paths';
import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { findSyncConflicts, type SyncConflict } from './syncConflicts';

export const COMPARTMENTS = [
  { id: 'clients', name: '_Clients', description: 'Client profiles and brand dossiers' },
  { id: 'finance', name: '_Finance', description: 'Quotes and draft/issued invoices' },
  { id: 'projects', name: '_Projects', description: 'Active & archived project repositories' },
  { id: 'journal', name: '_Journal', description: 'Daily logs, weekly rituals, monthly/yearly reviews' },
  { id: 'notes', name: '_Notes', description: 'Atelier knowledge base and atomic notes' },
  { id: 'team', name: '_Team', description: 'Studio profile and branding configuration' }
];

/** Always recognised as link targets (the server did the same). */
const SAMPLE_ENTITIES = ['acme', 'nex', 'lum', 'acme corp', 'nexus studio', 'lumina labs'];

export interface CompartmentStat {
  id: string;
  name: string;
  description: string;
  exists: boolean;
  fileCount: number;
  sizeBytes: number;
  formattedSize: string;
}

export interface BrokenLink {
  sourceFile: string;
  sourceTitle: string;
  linkText: string;
  target: string;
  reason: string;
}

export interface OrphanNote {
  id: string;
  title: string;
  relPath: string;
  category: string;
}

export interface FrontmatterIssue {
  file: string;
  compartment: string;
  issue: string;
  missingKeys: string[];
}

export interface VaultHealthReport {
  vaultExists: boolean;
  workspaceRoot: string;
  score: number;
  status: 'pristine' | 'healthy' | 'warning' | 'critical';
  lastScannedAt: string;
  compartments: CompartmentStat[];
  brokenWikiLinks: BrokenLink[];
  orphanNotes: OrphanNote[];
  frontmatterIssues: FrontmatterIssue[];
  syncConflicts: SyncConflict[];
  storageSummary: { totalFiles: number; totalSizeBytes: number; formattedTotalSize: string };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** The report for a vault that is not open or not reachable. */
export function emptyHealthReport(root: string, now: Date): VaultHealthReport {
  return {
    vaultExists: false,
    workspaceRoot: root,
    score: 0,
    status: 'critical',
    lastScannedAt: now.toISOString(),
    compartments: [],
    brokenWikiLinks: [],
    orphanNotes: [],
    frontmatterIssues: [],
    syncConflicts: [],
    storageSummary: { totalFiles: 0, totalSizeBytes: 0, formattedTotalSize: '0 B' }
  };
}

async function textOf(fs: VaultFs, entry: VaultEntry): Promise<string> {
  return entry.text ?? (await fs.readText(entry.path));
}

const stripMd = (name: string) => name.replace(/\.md$/i, '');

/** Unquoted YAML dates load as Date objects; compare them as the ISO dates they are in the file. */
function withIsoDates(fm: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...fm };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date && !isNaN(v.getTime())) out[k] = v.toISOString().slice(0, 10);
  }
  return out;
}

interface NoteNode {
  id: string;
  title: string;
  filename: string;
  relPath: string;
  category: string;
  links: Array<{ raw: string; target: string }>;
}

function compartmentStats(entries: VaultEntry[]): { stats: CompartmentStat[]; files: number; bytes: number } {
  const stats: CompartmentStat[] = [];
  let files = 0;
  let bytes = 0;
  for (const comp of COMPARTMENTS) {
    const exists = entries.some((e) => e.isDir && e.path === comp.name);
    let fileCount = 0;
    let sizeBytes = 0;
    for (const e of entries) {
      if (e.isDir || !e.path.startsWith(`${comp.name}/`)) continue;
      if (e.path.split('/').some((s) => s.startsWith('.'))) continue;
      fileCount++;
      sizeBytes += e.size || 0;
    }
    files += fileCount;
    bytes += sizeBytes;
    stats.push({ ...comp, exists, fileCount, sizeBytes, formattedSize: formatBytes(sizeBytes) });
  }
  return { stats, files, bytes };
}

async function readNotes(
  fs: VaultFs,
  entries: VaultEntry[],
  known: Set<string>
): Promise<{ notes: NoteNode[]; byKey: Map<string, NoteNode> }> {
  const byKey = new Map<string, NoteNode>();
  const notes: NoteNode[] = [];
  for (const e of entries) {
    if (e.isDir || !e.path.startsWith('_Notes/') || !e.path.endsWith('.md')) continue;
    let content: string;
    try {
      content = await textOf(fs, e);
    } catch {
      continue;
    }
    const fm = parseFrontmatter(content).frontmatter as Record<string, any>;
    const filename = baseName(e.path);
    const stem = stripMd(filename);
    const parent = parentPath(e.path);
    const note: NoteNode = {
      id: String(fm.id || stem),
      title: String(fm.title || stem),
      filename,
      relPath: e.path,
      category: parent === '_Notes' ? 'general' : baseName(parent),
      links: []
    };
    for (const m of content.matchAll(/\[\[(.*?)\]\]/g)) {
      const raw = m[1].trim();
      const target = raw.split('|')[0].split('#')[0].trim();
      if (target) note.links.push({ raw, target });
    }
    notes.push(note);
    for (const key of [note.title.toLowerCase(), stem.toLowerCase(), note.id.toLowerCase()]) known.add(key);
    byKey.set(note.title.toLowerCase(), note);
    byKey.set(stem.toLowerCase(), note);
  }
  return { notes, byKey };
}

function knownEntities(entries: VaultEntry[]): Set<string> {
  const known = new Set<string>(SAMPLE_ENTITIES);
  for (const e of entries) {
    if (parentPath(e.path) === '_Clients') {
      const name = baseName(e.path);
      known.add(stripMd(name).toLowerCase());
      if (name.includes('_')) for (const part of name.split('_')) if (part) known.add(part.toLowerCase());
    } else if (e.isDir && e.path.startsWith('_Projects/')) {
      const name = baseName(e.path);
      known.add(name.toLowerCase());
      const prefix = name.match(/^(\d{6})/);
      if (prefix) known.add(prefix[1]);
    }
  }
  return known;
}

async function financeIssues(fs: VaultFs, entries: VaultEntry[]): Promise<FrontmatterIssue[]> {
  const issues: FrontmatterIssue[] = [];
  const folders: Array<[string, 'quote' | 'invoice']> = [
    ['_Finance/Quotes', 'quote'],
    ['_Finance/Invoices', 'invoice']
  ];
  for (const [folder, docType] of folders) {
    for (const e of entries) {
      if (e.isDir || parentPath(e.path) !== folder || !e.path.endsWith('.md')) continue;
      try {
        const fm = parseFrontmatter(await textOf(fs, e)).frontmatter as Record<string, any>;
        if (!fm || Object.keys(fm).length === 0) {
          issues.push({
            file: e.path,
            compartment: '_Finance',
            issue: `Missing YAML frontmatter header in ${docType}`,
            missingKeys: ['documentNumber', 'client', 'total', 'status']
          });
          continue;
        }
        const check = validateFrontmatter(docType, withIsoDates(fm));
        if (!check.valid) {
          issues.push({ file: e.path, compartment: '_Finance', issue: check.errors.join('; '), missingKeys: check.errors });
        }
      } catch (err: any) {
        issues.push({ file: e.path, compartment: '_Finance', issue: `YAML parsing syntax error: ${err.message}`, missingKeys: [] });
      }
    }
  }
  return issues;
}

export function healthScore(counts: { broken: number; frontmatter: number; conflicts: number; orphans: number }) {
  const score = Math.max(
    0,
    100 -
      Math.min(30, counts.broken * 5) -
      Math.min(30, counts.frontmatter * 10) -
      Math.min(30, counts.conflicts * 10) -
      Math.min(10, counts.orphans * 2)
  );
  const status: VaultHealthReport['status'] =
    score < 60 ? 'critical' : score < 80 ? 'warning' : score < 95 ? 'healthy' : 'pristine';
  return { score, status };
}

export async function vaultHealthReport(fs: VaultFs, root: string, now: Date): Promise<VaultHealthReport> {
  const entries = await fs.scan('');
  const { stats, files, bytes } = compartmentStats(entries);

  const known = knownEntities(entries);
  const { notes, byKey } = await readNotes(fs, entries, known);
  const knownList = [...known];

  const brokenWikiLinks: BrokenLink[] = [];
  const incoming = new Map<string, number>();
  for (const note of notes) incoming.set(note.id, 0);
  for (const note of notes) {
    for (const link of note.links) {
      const target = link.target.toLowerCase();
      const isKnown = known.has(target) || knownList.some((k) => target.includes(k) || k.includes(target));
      if (isKnown) {
        const hit = byKey.get(target);
        if (hit) incoming.set(hit.id, (incoming.get(hit.id) || 0) + 1);
      } else {
        brokenWikiLinks.push({
          sourceFile: note.relPath,
          sourceTitle: note.title,
          linkText: link.raw,
          target: link.target,
          reason: 'Target note, client, or project reference not found in vault'
        });
      }
    }
  }

  const orphanNotes: OrphanNote[] = [];
  for (const note of notes) {
    if (note.links.length === 0 && !incoming.get(note.id) && !note.filename.toLowerCase().includes('scratchpad')) {
      orphanNotes.push({ id: note.id, title: note.title, relPath: note.relPath, category: note.category });
    }
  }

  const frontmatterIssues = await financeIssues(fs, entries);
  const syncConflicts = findSyncConflicts(entries);
  const { score, status } = healthScore({
    broken: brokenWikiLinks.length,
    frontmatter: frontmatterIssues.length,
    conflicts: syncConflicts.length,
    orphans: orphanNotes.length
  });

  return {
    vaultExists: true,
    workspaceRoot: root,
    score,
    status,
    lastScannedAt: now.toISOString(),
    compartments: stats,
    brokenWikiLinks,
    orphanNotes,
    frontmatterIssues,
    syncConflicts,
    storageSummary: { totalFiles: files, totalSizeBytes: bytes, formattedTotalSize: formatBytes(bytes) }
  };
}
