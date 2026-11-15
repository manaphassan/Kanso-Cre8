/**
 * Client handover package. Port of ExportService.collectProjectAssets,
 * getHandoverPreview and streamProjectHandover. Planning is separate from
 * writing: `planHandover` picks files and computes SHA-256 checksums; the
 * ZIP is written by Rust (`fs.exportZip`) to a destination the user chose.
 *
 * ZIP entries keep their folder names inside the project
 * (`05_DELIVERABLES/...`, `03_COPY/COPY.md`, `README.md`) because exportZip
 * only strips a prefix; the server renamed them to `Deliverables/...`.
 */

import { parseFrontmatter } from '$lib/domain/frontmatter';
import { decodeDeliverableId } from '$lib/domain/deliverables';
import { baseName } from '$lib/vault/paths';
import type { VaultEntry, VaultFs } from '$lib/vault/types';
import {
  buildHandoverDoc,
  formatBytes,
  generateDeliveryMarkdown,
  type HandoverAsset,
  type HandoverClient,
  type HandoverProjectInfo
} from './manifest';
import { generateHtmlSummary } from './summaryHtml';

export const DELIVERABLE_DIRS = ['05_DELIVERABLES', '05_Deliverables', '04_Production', 'Production', '04_Final_Exports'];
export const WIP_DIRS = ['04_WORK_IN_PROGRESS', '04_WIP', '02_Artwork_Mockup', 'Artwork Mockup', 'Mockup'];
export const COPY_FILE = '03_COPY/COPY.md';
export const DELIVERY_FILE = 'DELIVERY.md';
export const SUMMARY_FILE = 'HANDOVER_SUMMARY.html';

export interface HandoverOptions {
  /** Default false. */
  includeWip?: boolean;
  /** README.md; default true. */
  includeBrief?: boolean;
  /** 03_COPY/COPY.md; default true. */
  includeCopy?: boolean;
  /** DELIVERY.md in the ZIP; default true. The preview always has it. */
  includeManifest?: boolean;
  /** Deliverable / WIP files to keep: filenames, paths or deliverable ids. Empty = all. */
  selectedFiles?: string[] | null;
}

/** The project fields a handover needs (a `Project` from domain/projects fits). */
export interface HandoverProject extends HandoverProjectInfo {
  /** Vault-relative project folder. */
  fullPath: string;
}

export interface PlannedAsset extends HandoverAsset {
  vaultPath: string;
}

export interface HandoverPreview {
  jobId: string;
  projectTitle: string;
  clientCode: string;
  clientName: string;
  totalAssets: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  assets: HandoverAsset[];
  deliveryMd: string;
  htmlSummary: string;
}

export interface ZipExtra {
  name: string;
  text: string;
}

export interface HandoverPlan {
  /** Vault paths of the files to pack. */
  paths: string[];
  /** The project folder, stripped from entry names. */
  prefix: string;
  extras: ZipExtra[];
  preview: HandoverPreview;
}

export interface ExportResult {
  success: true;
  files: number;
  bytes: number;
  dest: string;
}

/** Hidden files, Office lock files and Windows thumbnail caches stay out (as on the server). */
export function isSkippedName(name: string): boolean {
  return name.startsWith('.') || name.startsWith('~lock~') || name.toLowerCase() === 'thumbs.db';
}

function formatOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : 'BIN';
}

function decodeId(value: string): string | null {
  try {
    return decodeDeliverableId(value);
  } catch {
    return null;
  }
}

/** Server rule (`name`, the entry path, or a path suffix) plus deliverable ids. */
function isSelected(selected: string[], vaultPath: string, entryName: string, legacyRel: string): boolean {
  const name = baseName(vaultPath);
  return selected.some(
    (s) =>
      s === name ||
      s === entryName ||
      s === legacyRel ||
      vaultPath.endsWith(s) ||
      legacyRel.endsWith(s) ||
      decodeId(s) === vaultPath
  );
}

function filesUnder(entries: VaultEntry[], dir: string): VaultEntry[] {
  return entries.filter((e) => {
    if (e.isDir || !e.path.startsWith(`${dir}/`)) return false;
    return !e.path.slice(dir.length + 1).split('/').some(isSkippedName);
  });
}

/** Picks the files for a handover from one scan of the project folder (no hashing). */
export function selectHandoverFiles(
  entries: VaultEntry[],
  projectPath: string,
  options: HandoverOptions = {}
): Array<Omit<PlannedAsset, 'sha256'>> {
  const root = projectPath.replace(/\/+$/, '');
  const dirs = new Set(entries.filter((e) => e.isDir).map((e) => e.path));
  const files = new Map(entries.filter((e) => !e.isDir).map((e) => [e.path, e]));
  const selected = (options.selectedFiles ?? []).map((s) => String(s).trim()).filter(Boolean);
  const out: Array<Omit<PlannedAsset, 'sha256'>> = [];
  const item = (entry: VaultEntry) => ({
    vaultPath: entry.path,
    relPath: entry.path.slice(root.length + 1),
    filename: baseName(entry.path),
    format: formatOf(baseName(entry.path)),
    sizeBytes: entry.size,
    sizeFormatted: formatBytes(entry.size)
  });

  const addFolder = (candidates: string[], legacyPrefix: string) => {
    const folder = candidates.find((name) => dirs.has(`${root}/${name}`));
    if (!folder) return;
    const dir = `${root}/${folder}`;
    for (const entry of filesUnder(entries, dir)) {
      const legacyRel = `${legacyPrefix}/${entry.path.slice(dir.length + 1)}`;
      if (selected.length && !isSelected(selected, entry.path, entry.path.slice(root.length + 1), legacyRel)) continue;
      out.push(item(entry));
    }
  };

  addFolder(DELIVERABLE_DIRS, 'Deliverables');
  if (options.includeWip) addFolder(WIP_DIRS, 'Mockups');
  const copy = files.get(`${root}/${COPY_FILE}`);
  if (options.includeCopy !== false && copy) out.push({ ...item(copy), format: 'Markdown' });
  const readme = files.get(`${root}/README.md`);
  if (options.includeBrief !== false && readme) out.push({ ...item(readme), format: 'Markdown' });
  return out;
}

async function hashAll(fs: VaultFs, items: Array<Omit<PlannedAsset, 'sha256'>>): Promise<PlannedAsset[]> {
  return Promise.all(
    items.map(async (it) => ({ ...it, sha256: await fs.sha256(it.vaultPath).catch(() => 'N/A') }))
  );
}

async function scanProject(fs: VaultFs, projectPath: string): Promise<VaultEntry[]> {
  try {
    return await fs.scan(projectPath);
  } catch {
    throw new Error('Project folder not found.');
  }
}

/** Files of a handover with checksums. Port of ExportService.collectProjectAssets. */
export async function collectProjectAssets(
  fs: VaultFs,
  projectPath: string,
  options: HandoverOptions = {}
): Promise<PlannedAsset[]> {
  return hashAll(fs, selectHandoverFiles(await scanProject(fs, projectPath), projectPath, options));
}

async function readmeFrontmatter(fs: VaultFs, entries: VaultEntry[], projectPath: string): Promise<Record<string, any>> {
  const path = `${projectPath}/README.md`;
  const entry = entries.find((e) => e.path === path && !e.isDir);
  if (!entry) return {};
  try {
    return parseFrontmatter(entry.text ?? (await fs.readText(path))).frontmatter ?? {};
  } catch {
    return {};
  }
}

/**
 * Everything needed to write the handover ZIP: vault paths, the prefix to
 * strip, the generated DELIVERY.md and HTML summary, and the preview the
 * manifest modal shows.
 */
export async function planHandover(
  fs: VaultFs,
  project: HandoverProject,
  options: HandoverOptions,
  studio: Record<string, any> | null,
  client: HandoverClient | null,
  now: Date
): Promise<HandoverPlan> {
  const prefix = project.fullPath.replace(/\/+$/, '');
  const info: HandoverProjectInfo = { ...project, folderName: project.folderName || baseName(prefix) };
  const entries = await scanProject(fs, prefix);
  const frontmatter = await readmeFrontmatter(fs, entries, prefix);
  const planned = await hashAll(fs, selectHandoverFiles(entries, prefix, options ?? {}));
  const assets: HandoverAsset[] = planned.map(({ vaultPath: _vaultPath, ...rest }) => rest);
  const doc = buildHandoverDoc(info, frontmatter, assets, studio, client, now);
  const deliveryMd = generateDeliveryMarkdown(doc);
  const htmlSummary = generateHtmlSummary(doc);

  const extras: ZipExtra[] = [];
  if (options?.includeManifest !== false) extras.push({ name: DELIVERY_FILE, text: deliveryMd });
  extras.push({ name: SUMMARY_FILE, text: htmlSummary });

  return {
    paths: planned.map((a) => a.vaultPath),
    prefix,
    extras,
    preview: {
      jobId: doc.jobId,
      projectTitle: doc.title,
      clientCode: doc.clientCode,
      clientName: doc.clientName,
      totalAssets: assets.length,
      totalSizeBytes: doc.totalBytes,
      totalSizeFormatted: doc.totalSizeFormatted,
      assets,
      deliveryMd,
      htmlSummary
    }
  };
}

/** Writes a planned handover to `dest` (an absolute path from a save dialog). */
export async function exportHandover(fs: VaultFs, plan: HandoverPlan, dest: string): Promise<ExportResult> {
  const summary = await fs.exportZip(plan.paths, dest, { prefix: plan.prefix, extras: plan.extras });
  return { success: true, files: summary.files, bytes: summary.bytes, dest };
}

/** A name safe on Windows, macOS and Linux. */
export function safeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/, '');
}

/** Default name for the save dialog, e.g. `202609_0001D_ACME_Title_Handover_2026-09-15.zip`. */
export function suggestedHandoverFilename(project: Pick<HandoverProject, 'fullPath' | 'folderName'>, now: Date): string {
  const folder = project.folderName || baseName(project.fullPath.replace(/\/+$/, '')) || 'Project';
  return `${safeFileName(folder)}_Handover_${now.toISOString().slice(0, 10)}.zip`;
}
