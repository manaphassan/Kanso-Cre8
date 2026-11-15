/**
 * Projects: the 5-folder project vaults under `_Projects/<YYYY>/`.
 * Port of server/services/ProjectService.js (index, read, edits) and
 * FrontmatterService.readProjectReadme / writeProjectReadme.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';
import { contentHash, parseFrontmatter, serializeFrontmatter, validateFrontmatter } from './frontmatter';

export const PROJECT_DIR = /^(\d{6})_([A-Za-z0-9]+)(?:_([A-Za-z0-9]+))?(?:_(.+))?$/;
const MONTH_DIR = /^\d{6}_(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i;
const SKIP_TOP = (name: string) =>
  name.startsWith('.') || (name.startsWith('_') && name !== '_Projects') || name.startsWith('#') || name.startsWith('@') ||
  name === 'node_modules' || name === '$RECYCLE.BIN';
const DELIVERABLE_COUNT_DIRS = ['05_DELIVERABLES', '04_WIP', '04_WORK_IN_PROGRESS'];

export const DEFAULT_README_FRONTMATTER = { status: 'backlog', priority: 'medium', revision: 0, tags: [] as string[] };

/** Brief shown for a project whose README has no body yet (same text as the server). */
export function defaultBrief(folderName: string): string {
  const title = folderName.replace(/^\d{6}_([A-Za-z0-9]+)_([A-Za-z0-9]+)_?/, '').replace(/_/g, ' ') || 'Creative Project Brief';
  return `# ${title}

## Campaign & Objective Overview
Deliver high-converting visual assets, compliant packaging, and campaign creatives according to studio brand standards.

## Creative Deliverables & Milestones
- [ ] 01. Packaging Box Dieline & Label (AI/PDF, CMYK 300 DPI)
- [ ] 02. Product 3D Render & Mockup (PNG 4K transparent)
- [ ] 03. Social Media Ad Carousel (1080x1080, 5 slides)
- [ ] 04. Short-form Video Hook (9:16, 15s)

## Visual Direction & Brand Voice
- **Tone**: Clean, Minimalist, Precision Studio.
- **Primary Palette**: Deep Canvas \`#09090B\`, Electric Sky \`#38BDF8\`, Pure Surface \`#18181B\`.

## Production & Review Flow
\`\`\`mermaid
flowchart LR
  Intake[Intake & Brief] --> Concept[Concept & Dieline]
  Concept --> Review[Art Director Review]
  Review --> Approved[Final Sign-Off]
\`\`\`
`;
}

export interface Readme {
  exists: boolean;
  frontmatter: Record<string, any>;
  body: string;
  versionHash: string | null;
}

export async function parseReadme(text: string | null, folderName: string): Promise<Readme> {
  if (text === null) return { exists: false, frontmatter: { ...DEFAULT_README_FRONTMATTER }, body: '', versionHash: null };
  const { frontmatter, body } = parseFrontmatter(text);
  return {
    exists: true,
    frontmatter,
    body: body && body.trim() ? body : defaultBrief(folderName),
    versionHash: await contentHash(text)
  };
}

export async function readReadme(fs: VaultFs, projectPath: string): Promise<Readme> {
  let text: string | null = null;
  try {
    text = await fs.readText(`${projectPath}/README.md`);
  } catch {
    text = null;
  }
  return parseReadme(text, baseName(projectPath));
}

/** Merges frontmatter, keeps unknown keys, checks the optimistic-concurrency hash. */
export async function writeReadme(
  fs: VaultFs,
  projectPath: string,
  update: Record<string, any>,
  newBody: string | null = null,
  expectedHash: string | null = null
): Promise<{ success: true; versionHash: string; frontmatter: Record<string, any>; body: string }> {
  let current: string | null = null;
  try {
    current = await fs.readText(`${projectPath}/README.md`);
  } catch {
    current = null;
  }
  let existing = { frontmatter: {} as Record<string, any>, body: '' };
  if (current !== null) {
    if (expectedHash) {
      const hash = await contentHash(current);
      if (hash !== expectedHash) {
        throw new Error(`Concurrency Conflict: File was modified by another client (expected ${expectedHash}, got ${hash})`);
      }
    }
    existing = parseFrontmatter(current);
  }
  const { data } = validateFrontmatter('project', { ...existing.frontmatter, ...update });
  const body = newBody !== null && newBody !== undefined ? newBody : existing.body;
  const text = serializeFrontmatter(data, body);
  await fs.writeText(`${projectPath}/README.md`, text);
  return { success: true, versionHash: await contentHash(text), frontmatter: data, body };
}

export interface Project {
  id: string;
  folderName: string;
  /** Vault-relative folder path (the server returned an absolute path). */
  fullPath: string;
  dateCode: string;
  jobId: string;
  presetCode: string;
  presetType: string;
  brand: string;
  title: string;
  status: string;
  priority: string;
  designer: string;
  manager: string;
  department: string;
  created: string;
  deadline: string;
  completedAt: string | null;
  duration: string;
  revision: number;
  tags: string[];
  isOverdue: boolean;
  isDueSoon: boolean;
  daysRemaining: number | null;
  deliverableCount: number;
  creativeDirection: Record<string, any>;
  copywriting: Record<string, any>;
  approvals: any[];
  versionHash: string | null;
  readmeBody: string;
  briefMarkdown: string;
  [key: string]: any;
}

export function designerFromPath(path: string): string {
  const first = path.split('/')[0] ?? '';
  if (first && !first.startsWith('_') && !/^\d{4}/.test(first)) return first;
  return 'Unassigned';
}

export function buildProject(
  path: string,
  match: RegExpExecArray,
  readme: Readme,
  deliverableCount: number,
  now: Date
): Project {
  const folderName = baseName(path);
  const [, dateCode, jobRaw, brandRaw = 'SS', titleRaw = folderName] = match;
  let presetCode = 'D';
  let presetType = 'Graphic / Print';
  if (/[A-Za-z]$/.test(jobRaw)) {
    presetCode = jobRaw.slice(-1).toUpperCase();
    if (presetCode === 'S') presetType = 'Social Media';
    else if (presetCode === 'V') presetType = 'Video';
    else if (presetCode === 'P') presetType = 'Brand Identity';
  }
  const fm = readme.frontmatter;
  const status = fm.status || 'backlog';
  const deadline = fm.deadline ? String(fm.deadline) : '';
  const created = fm.created ? String(fm.created) : `${folderName.slice(0, 4)}-${folderName.slice(4, 6)}-01`;

  let isOverdue = false;
  let isDueSoon = false;
  let daysRemaining: number | null = null;
  if (deadline && status !== 'done' && status !== 'approved') {
    // Calendar days between today's local date and the deadline date.
    const [y, m, d] = deadline.slice(0, 10).split('-').map(Number);
    const due = Date.UTC(y, (m || 1) - 1, d || 1);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    daysRemaining = Math.round((due - today) / 86_400_000);
    if (daysRemaining < 0) isOverdue = true;
    else if (daysRemaining <= 2) isDueSoon = true;
  }

  let completedAt = fm.completedAt || null;
  if (!completedAt && (status === 'done' || status === 'approved') && Array.isArray(fm.approvals) && fm.approvals.length) {
    const approved = fm.approvals.find((a: any) => a.decision === 'approved') || fm.approvals[0];
    completedAt = approved?.timestamp || null;
  }

  return {
    id: folderName,
    folderName,
    fullPath: path,
    dateCode,
    jobId: jobRaw,
    presetCode,
    presetType,
    brand: brandRaw.toUpperCase(),
    title: titleRaw.replace(/_/g, ' '),
    status,
    priority: fm.priority || 'medium',
    designer: fm.designer || designerFromPath(path),
    manager: fm.manager || 'Unassigned',
    department: fm.department || 'General',
    created,
    deadline,
    completedAt,
    duration: fm.duration || '',
    revision: fm.revision || 0,
    tags: fm.tags || [],
    isOverdue,
    isDueSoon,
    daysRemaining,
    deliverableCount,
    creativeDirection: fm.creative_direction || {},
    copywriting: fm.copywriting || { status: 'draft' },
    approvals: fm.approvals || [],
    versionHash: readme.versionHash,
    readmeBody: readme.body || '',
    briefMarkdown: readme.body || ''
  };
}

/** Finds project folders in a flat scan list (folders within folders until a project matches). */
export async function indexProjects(entries: VaultEntry[], now: Date): Promise<Project[]> {
  const dirs = new Set(entries.filter((e) => e.isDir).map((e) => e.path));
  const texts = new Map(entries.filter((e) => !e.isDir).map((e) => [e.path, e.text ?? null]));
  const childCount = new Map<string, number>();
  for (const e of entries) {
    const parent = e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/')) : '';
    if (!baseName(e.path).startsWith('.')) childCount.set(parent, (childCount.get(parent) ?? 0) + 1);
  }

  const found: Array<{ path: string; match: RegExpExecArray }> = [];
  const walk = (dir: string) => {
    const prefix = dir ? `${dir}/` : '';
    const children = [...dirs].filter((d) => d.startsWith(prefix) && !d.slice(prefix.length).includes('/')).sort();
    for (const child of children) {
      const name = baseName(child);
      if (!dir && SKIP_TOP(name)) continue;
      if (dir && (name.startsWith('.') || name === 'node_modules')) continue;
      const match = MONTH_DIR.test(name) ? null : PROJECT_DIR.exec(name);
      if (match && match[4]) found.push({ path: child, match });
      else walk(child);
    }
  };
  walk('');

  const projects: Project[] = [];
  for (const { path, match } of found) {
    const readmeText = texts.has(`${path}/README.md`) ? texts.get(`${path}/README.md`) ?? '' : null;
    const readme = await parseReadme(readmeText, baseName(path));
    const deliverables = DELIVERABLE_COUNT_DIRS.reduce((n, d) => n + (childCount.get(`${path}/${d}`) ?? 0), 0);
    projects.push(buildProject(path, match, readme, deliverables, now));
  }
  return projects;
}

export interface ProjectFilters {
  query?: string;
  status?: string;
  brand?: string;
  designer?: string;
  priority?: string;
  department?: string;
  isOverdue?: string | boolean;
}

export function filterProjects(all: Project[], f: ProjectFilters = {}): Project[] {
  let list = [...all];
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  if (f.query) {
    const q = f.query.toLowerCase();
    list = list.filter((p) => [p.title, p.jobId, p.folderName, p.brand, p.designer].some((v) => v.toLowerCase().includes(q)));
  }
  if (f.status && f.status !== 'all') list = list.filter((p) => eq(p.status, f.status!));
  if (f.brand && f.brand !== 'all') list = list.filter((p) => eq(p.brand, f.brand!));
  if (f.designer && f.designer !== 'all') list = list.filter((p) => eq(p.designer, f.designer!));
  if (f.priority && f.priority !== 'all') list = list.filter((p) => eq(p.priority, f.priority!));
  if (f.department && f.department !== 'all') list = list.filter((p) => eq(p.department, f.department!));
  if (f.isOverdue === true || f.isOverdue === 'true') list = list.filter((p) => p.isOverdue);
  return list.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

/** Same tolerant matching as the server: id, folder, job id, or a folder substring. */
export function findProject(all: Project[], id: string): Project | null {
  if (!id) return null;
  let raw = String(id).trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const target = raw.toLowerCase();
  const norm = target.replace(/[\s_-]+/g, '_');
  const jobId = target.match(/\b(\d{4}[A-Za-z])\b/)?.[1].toLowerCase() ?? null;
  return (
    all.find((p) => {
      const pid = p.id.toLowerCase();
      const folder = p.folderName.toLowerCase();
      const job = p.jobId.toLowerCase();
      if (pid === target || folder === target || job === target) return true;
      const pidN = pid.replace(/[\s_-]+/g, '_');
      const folderN = folder.replace(/[\s_-]+/g, '_');
      if (pidN === norm || folderN === norm) return true;
      if (jobId && (job === jobId || pidN.includes(`_${jobId}_`) || folderN.includes(`_${jobId}_`))) return true;
      return target.length >= 6 && (folder.includes(target) || target.includes(folder));
    }) ?? null
  );
}

/** Re-reads one project's README so a detail view is never stale. */
export async function refreshProject(fs: VaultFs, project: Project, now: Date): Promise<Project> {
  const readme = await readReadme(fs, project.fullPath);
  const match = PROJECT_DIR.exec(project.folderName)!;
  return { ...buildProject(project.fullPath, match, readme, project.deliverableCount, now) };
}
