/**
 * Project scaffolding and file ingest. Port of server/services/ScaffoldService.js.
 *
 * scaffoldProject(fs, options, now) creates the standardized 5-folder project
 * vault and returns the new project. It is also used by the finance domain for
 * quote -> project conversion.
 *
 * Options (all optional, see `ScaffoldOptions`):
 *   title            Project title. Default 'Untitled Project'. Folder part is the
 *                    title with every non-alphanumeric run replaced by '_'.
 *   clientCode       Client code (alias: brand). Uppercased, alphanumerics only. Default 'ACME'.
 *   clientName       Display name stored as `client_name`. Default: the client code.
 *   year             Year folder under `_Projects/`. Default: `now` (local year).
 *   month            Folder date code `YYYYMM`. Default: `now` (local month).
 *   jobId            Job number such as '0004D'. Default: highest existing job
 *                    number in `_Projects/` + 1, padded to 4 digits, plus the type
 *                    letter (S Social Media, V Video, P Brand Identity, D otherwise).
 *   deliverableType  Sets the job letter and a tag.
 *   status           Default 'in-progress'.     priority   Default 'normal'.
 *   designer         Default 'alex.mercer'.     deadline   ISO date. Default: now + 14 days (UTC).
 *   budget/currency  Number (default 0) and code (default 'USD').
 *   tone/description Seed `creative_direction` and the README note.
 *   linkedQuoteId / linkedInvoiceId   Stored in frontmatter when given.
 *
 * Writes, in order: `_Projects/<year>/<folder>/` with 01_BRIEF, 02_SOURCE, 03_COPY,
 * 04_WIP, 05_DELIVERABLES; `03_COPY/COPY.md`; `README.md` (frontmatter + sprint checklist).
 *
 * Returns `{ success: true, folderName, targetDir, project }` where `targetDir` is the
 * vault-relative project folder and `project` is the built `Project` (deliverableCount 0).
 * Throws if the folder already exists. The caller emits 'workspace:updated'
 * (the server broadcast `{ projectId: folderName, action: 'created', timestamp }`).
 */

import type { VaultFs } from '$lib/vault/types';
import { exists } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { buildProject, PROJECT_DIR, readReadme, writeReadme, type Project } from './projects';

export const PROJECT_SUBFOLDERS = ['01_BRIEF', '02_SOURCE', '03_COPY', '04_WIP', '05_DELIVERABLES'];

export interface ScaffoldOptions {
  title?: string;
  clientCode?: string;
  /** Alias of `clientCode` (used by older callers and the server tests). */
  brand?: string;
  clientName?: string;
  year?: string;
  month?: string;
  jobId?: string;
  deliverableType?: string;
  status?: string;
  priority?: string;
  designer?: string;
  deadline?: string;
  budget?: number | string;
  currency?: string;
  tone?: string;
  description?: string;
  linkedQuoteId?: string;
  linkedInvoiceId?: string;
}

export interface ScaffoldResult {
  success: true;
  folderName: string;
  /** Vault-relative project folder, e.g. `_Projects/2026/202609_0004D_ACME_Title`. */
  targetDir: string;
  project: Project;
}

export function jobLetter(deliverableType?: string): string {
  if (deliverableType === 'Social Media') return 'S';
  if (deliverableType === 'Video') return 'V';
  if (deliverableType === 'Brand Identity') return 'P';
  return 'D';
}

/** Highest numeric job prefix among project folders under `_Projects/` (0 when none). */
export async function highestJobNumber(fs: VaultFs): Promise<number> {
  if (!(await exists(fs, '_Projects'))) return 0;
  let max = 0;
  for (const entry of await fs.scan('_Projects')) {
    if (!entry.isDir) continue;
    const match = PROJECT_DIR.exec(baseName(entry.path));
    if (!match || !match[4]) continue;
    const n = parseInt(match[2], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export async function scaffoldProject(fs: VaultFs, options: ScaffoldOptions, now: Date): Promise<ScaffoldResult> {
  const title = String(options.title || 'Untitled Project').trim() || 'Untitled Project';
  const clientCode = String(options.clientCode || options.brand || 'ACME').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ACME';
  const clientName = options.clientName || clientCode;
  const year = String(options.year || now.getFullYear());
  const monthCode = options.month || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  let jobId = options.jobId ? String(options.jobId).replace(/[^A-Za-z0-9]/g, '') : '';
  if (!jobId) {
    const next = (await highestJobNumber(fs)) + 1;
    jobId = `${String(next).padStart(4, '0')}${jobLetter(options.deliverableType)}`;
  }

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Creative_Project';
  const folderName = `${monthCode}_${jobId}_${clientCode}_${sanitizedTitle}`;
  const match = PROJECT_DIR.exec(folderName);
  if (!match || !match[4]) throw new Error(`"${folderName}" is not a valid project folder name.`);

  const targetDir = `_Projects/${year}/${folderName}`;
  if (await exists(fs, targetDir)) throw new Error(`Project folder "${folderName}" already exists.`);

  await fs.ensureDirs([targetDir, ...PROJECT_SUBFOLDERS.map((sub) => `${targetDir}/${sub}`)]);

  const initialCopy = `# ${title}\n**Client**: ${clientName} (${clientCode})\n**Status**: Draft\n\n## Hook & Value Proposition\n- Hook: Engaging headline for ${title}\n- Core value proposition\n\n## Body Copy & Messaging\nDetailed creative copy, specifications, and call-to-action.\n`;
  await fs.writeText(`${targetDir}/03_COPY/COPY.md`, initialCopy);

  const deadline = options.deadline || new Date(now.getTime() + 14 * 86_400_000).toISOString().split('T')[0];
  const frontmatter: Record<string, any> = {
    status: options.status || 'in-progress',
    priority: options.priority || 'normal',
    designer: options.designer || 'alex.mercer',
    client: clientCode,
    brand: clientCode,
    client_name: clientName,
    deadline,
    created: now.toISOString().split('T')[0],
    budget: Number(options.budget) || 0,
    currency: options.currency || 'USD',
    revision: 0,
    tags: ['design', clientCode.toLowerCase(), (options.deliverableType || 'creative').toLowerCase().replace(/\s+/g, '-')],
    creative_direction: {
      tone: options.tone || 'Modern, minimal, high-impact',
      key_messaging: options.description || title
    },
    copywriting: { status: 'draft', headline: title, body_copy: '' },
    ...(options.linkedQuoteId ? { linkedQuoteId: options.linkedQuoteId } : {}),
    ...(options.linkedInvoiceId ? { linkedInvoiceId: options.linkedInvoiceId } : {})
  };

  const readmeBody = `# ${title}\n\n> [!NOTE]\n> ${options.description || 'Standardized 5-folder creative project vault.'}\n\n## Sprint Checklist\n- [ ] #task Review client brief and vector assets in 01_BRIEF/ due: ${deadline} priority: normal\n- [ ] #task Prepare master design source files in 02_SOURCE/\n- [ ] #task Compose hooks and copywriting in 03_COPY/\n- [ ] #task Export review renders to 04_WIP/\n- [ ] #task Package final deliverables in 05_DELIVERABLES/\n`;
  await writeReadme(fs, targetDir, frontmatter, readmeBody);

  const project = buildProject(targetDir, match, await readReadme(fs, targetDir), 0, now);
  return { success: true, folderName, targetDir, project };
}

// ---------------------------------------------------------------------------
// Ingest: a file the user dropped, sent as base64 from the webview.

/** Legacy folder names the ingester UI still sends -> canonical folder. */
const INGEST_ALIASES: Record<string, string> = {
  '01_BRIEF_ASSETS': '01_BRIEF',
  '02_SOURCE_FILES': '02_SOURCE',
  '04_WORK_IN_PROGRESS': '04_WIP'
};

/**
 * Canonical target folder. A legacy alias is kept only when the project
 * already has that folder; unknown names fall back to 01_BRIEF (as the server).
 */
export function resolveIngestFolder(requested: string, existingDirs: string[]): string {
  const name = String(requested || '').trim();
  if (PROJECT_SUBFOLDERS.includes(name)) return name;
  const canonical = INGEST_ALIASES[name];
  if (canonical) return existingDirs.includes(name) ? name : canonical;
  return '01_BRIEF';
}

/** Same rule as the server: base name only, then anything outside [a-zA-Z0-9._-] becomes '_'. */
export function safeIngestName(filename: string): string {
  const base = String(filename || '').split(/[\\/]/).pop() || '';
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!safe || /^\.+$/.test(safe)) throw new Error('A valid filename is required.');
  return safe;
}

/** Decodes base64 or a `data:...;base64,` URL. Throws on invalid input. */
export function decodeBase64(data: string): Uint8Array {
  const clean = String(data || '').replace(/^data:.*?;base64,/, '').replace(/\s+/g, '');
  let bin: string;
  try {
    bin = atob(clean);
  } catch {
    throw new Error('fileData is not valid base64.');
  }
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export interface IngestInput {
  filename: string;
  targetSubfolder?: string;
  /** Base64 file contents, optionally a data URL. */
  fileData: string;
}

export interface IngestResult {
  success: true;
  filename: string;
  folder: string;
  sizeBytes: number;
  relPath: string;
}

/** Writes the file into the project, overwriting a file of the same name (as the server). */
export async function ingestFile(fs: VaultFs, projectPath: string, input: IngestInput): Promise<IngestResult> {
  const filename = safeIngestName(input.filename);
  const bytes = decodeBase64(input.fileData);
  const dirs = (await fs.listDir(projectPath)).filter((e) => e.isDir).map((e) => baseName(e.path));
  const folder = resolveIngestFolder(input.targetSubfolder || '', dirs);
  const relPath = `${projectPath}/${folder}/${filename}`;
  await fs.ensureDirs([`${projectPath}/${folder}`]);
  const written = await fs.writeBytes(relPath, bytes, true);
  return { success: true, filename, folder, sizeBytes: written.size, relPath: written.path };
}
