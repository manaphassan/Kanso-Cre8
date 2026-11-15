/**
 * Project snapshots in `<project>/.snapshots/<snap_id>/`: copies of README.md,
 * 03_COPY/COPY.md and _review.md plus `meta.json`. Port of
 * server/services/SnapshotService.js. Dot folders are skipped by `scan`, so
 * snapshots never show up in the project index; `listDir` still sees them.
 */

import type { VaultFs } from '$lib/vault/types';
import { exists, readJson, writeJson } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { readReadme } from './projects';

export const SNAPSHOT_DIR = '.snapshots';
const SNAPSHOT_ID = /^snap_[A-Za-z0-9_-]+$/;

/** Files a snapshot captures: project-relative source -> name inside the snapshot. */
const CAPTURED: Array<{ source: string; name: string }> = [
  { source: 'README.md', name: 'README.md' },
  { source: '03_COPY/COPY.md', name: 'COPY.md' },
  { source: '_review.md', name: '_review.md' }
];

export interface SnapshotMeta {
  id: string;
  timestamp: string;
  trigger: string;
  actor: string;
  revision: number;
  status: string;
  deliverableCount: number;
  note: string;
}

export interface SnapshotDetails {
  meta: SnapshotMeta | null;
  readme: string;
  copy: string;
  review: string;
}

export const isSnapshotId = (id: string) => SNAPSHOT_ID.test(String(id || ''));
const snapshotPath = (projectPath: string, id: string) => `${projectPath}/${SNAPSHOT_DIR}/${id}`;

export async function snapshotExists(fs: VaultFs, projectPath: string, id: string): Promise<boolean> {
  return isSnapshotId(id) && exists(fs, snapshotPath(projectPath, id));
}

async function readOr(fs: VaultFs, path: string, fallback: string): Promise<string> {
  try {
    return await fs.readText(path);
  } catch {
    return fallback;
  }
}

/** `snap_<ms>`, with a suffix when two snapshots are taken in the same millisecond. */
async function nextSnapshotId(fs: VaultFs, projectPath: string, now: Date): Promise<string> {
  const base = `snap_${now.getTime()}`;
  const dir = `${projectPath}/${SNAPSHOT_DIR}`;
  const taken = (await exists(fs, dir)) ? new Set((await fs.listDir(dir)).map((e) => baseName(e.path))) : new Set<string>();
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
  return id;
}

export interface SnapshotInput {
  trigger?: string;
  actor?: string;
  note?: string;
}

export async function createSnapshot(fs: VaultFs, projectPath: string, input: SnapshotInput, now: Date): Promise<SnapshotMeta | null> {
  const trigger = input.trigger || 'MANUAL_BACKUP';
  const actor = input.actor || 'Designer';
  const note = input.note || '';
  if (!(await exists(fs, projectPath))) return null;
  const id = await nextSnapshotId(fs, projectPath, now);
  const dir = snapshotPath(projectPath, id);
  await fs.ensureDirs([dir]);

  let revision = 1;
  let status = 'in-progress';
  for (const { source, name } of CAPTURED) {
    const from = `${projectPath}/${source}`;
    if (!(await exists(fs, from))) continue;
    try {
      await fs.copyWithin(from, `${dir}/${name}`, true);
      if (name === 'README.md') {
        const { frontmatter } = await readReadme(fs, projectPath);
        if (frontmatter.revision) revision = frontmatter.revision;
        if (frontmatter.status) status = frontmatter.status;
      }
    } catch {
      // Same as the server: a file that cannot be copied is left out.
    }
  }

  let deliverableCount = 0;
  const deliverables = `${projectPath}/05_DELIVERABLES`;
  if (await exists(fs, deliverables)) {
    deliverableCount = (await fs.listDir(deliverables)).filter((e) => !baseName(e.path).startsWith('.')).length;
  }

  const meta: SnapshotMeta = {
    id,
    timestamp: now.toISOString(),
    trigger,
    actor,
    revision,
    status,
    deliverableCount,
    note: note || `Snapshot captured during ${trigger}`
  };
  await writeJson(fs, `${dir}/meta.json`, meta);
  return meta;
}

/** Newest first. */
export async function getSnapshots(fs: VaultFs, projectPath: string): Promise<SnapshotMeta[]> {
  const dir = `${projectPath}/${SNAPSHOT_DIR}`;
  if (!(await exists(fs, dir))) return [];
  const list: SnapshotMeta[] = [];
  for (const entry of await fs.listDir(dir)) {
    if (!entry.isDir || !baseName(entry.path).startsWith('snap_')) continue;
    const meta = await readJson<SnapshotMeta | null>(fs, `${entry.path}/meta.json`, null);
    if (meta) list.push(meta);
  }
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() || String(b.id).localeCompare(String(a.id)));
}

export async function getSnapshotDetails(fs: VaultFs, projectPath: string, id: string): Promise<SnapshotDetails | null> {
  if (!(await snapshotExists(fs, projectPath, id))) return null;
  const dir = snapshotPath(projectPath, id);
  return {
    meta: await readJson<SnapshotMeta | null>(fs, `${dir}/meta.json`, null),
    readme: await readOr(fs, `${dir}/README.md`, ''),
    copy: await readOr(fs, `${dir}/COPY.md`, ''),
    review: await readOr(fs, `${dir}/_review.md`, '')
  };
}

export interface RollbackResult {
  success: true;
  restoredSnapshot: SnapshotMeta | { revision: number };
  message: string;
}

/**
 * Takes a PRE_ROLLBACK_BACKUP snapshot, then copies the snapshot's files back.
 * Throws when the project or snapshot does not exist.
 */
export async function rollback(fs: VaultFs, projectPath: string, id: string, actor: string, now: Date): Promise<RollbackResult> {
  if (!(await exists(fs, projectPath))) throw new Error('Project folder does not exist.');
  if (!(await snapshotExists(fs, projectPath, id))) throw new Error(`Snapshot "${id}" not found.`);
  const dir = snapshotPath(projectPath, id);

  await createSnapshot(fs, projectPath, { trigger: 'PRE_ROLLBACK_BACKUP', actor, note: `Safety backup before rolling back to ${id}` }, now);

  for (const { source, name } of CAPTURED) {
    const from = `${dir}/${name}`;
    if (!(await exists(fs, from))) continue;
    if (source.includes('/')) await fs.ensureDirs([`${projectPath}/${source.slice(0, source.lastIndexOf('/'))}`]);
    await fs.copyWithin(from, `${projectPath}/${source}`, true);
  }

  const restoredSnapshot = await readJson<SnapshotMeta | { revision: number }>(fs, `${dir}/meta.json`, { revision: 1 });
  return { success: true, restoredSnapshot, message: `Project successfully restored to snapshot ${id}` };
}
