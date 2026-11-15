/**
 * Dashboard metrics: KPIs, pipeline, distributions, designer workload and
 * SLA metrics for GET /dashboard. Port of ProjectService.getDashboardMetrics.
 *
 * Single-user app: there is no staff roster, so designer workload is built
 * only from the `designer` values on projects. `now` is passed in.
 */

import type { Project } from './projects';
import { filterProjects } from './projects';
import { isCompleted, slaMetrics, type SlaMetrics } from './dashboardSla';

const DAY_MS = 86_400_000;
const ACTIVE = ['in-progress', 'review', 'revision'];
const isActive = (p: Project) => ACTIVE.includes(p.status);

export interface DashboardOptions {
  timeRange?: string;
  brand?: string;
}

export interface DashboardKpis {
  total: number;
  active: number;
  pendingReview: number;
  pendingApproval: number;
  revisionRequired: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  highRevisionCount: number;
}

export interface DesignerWorkload {
  designer: string;
  /** No staff directory: the designer name is the id. */
  staffId: string;
  role: string;
  name: string;
  avatar: string;
  /** CSS token, not a hex value. */
  avatarColor: string;
  total: number;
  active: number;
  inProgress: number;
  inReview: number;
  revision: number;
  overdue: number;
  completed: number;
  capacityPercent: number;
  capacityStatus: 'Available' | 'Normal' | 'High Load' | 'At Capacity' | 'Overloaded';
  /** CSS token (the server sent hex). */
  capacityColor: string;
}

export interface HighRevisionProject {
  id: string;
  jobId: string;
  title: string;
  designer: string;
  brand: string;
  revision: number;
  status: string;
  priority: string;
  deadline: string;
}

export interface DashboardMetrics {
  kpis: DashboardKpis;
  pipeline: Record<'backlog' | 'inProgress' | 'review' | 'revision' | 'approved' | 'done', number>;
  brandDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  designerWorkload: DesignerWorkload[];
  highRevisionProjects: HighRevisionProject[];
  slaMetrics: SlaMetrics;
  recentProjects: Project[];
  activeFilters: { timeRange: string; brand: string };
}

/** Folder-derived or placeholder values that are not a person. */
function isPersonName(name: string): boolean {
  if (!name || name === 'Unassigned') return false;
  // Years, date codes and job ids ("2026", "202609_...", "0001D") are folder names, not people.
  if (/^\d{4}/.test(name) || name.startsWith('#') || name.startsWith('_')) return false;
  // Same exclusion the server applied to names it could not find in the roster.
  const r = name.toLowerCase();
  return !['manager', 'ceo', 'chief', 'head of', 'executive', 'director of'].some((w) => r.includes(w)) && r !== 'mgr';
}

export function capacityFor(active: number): Pick<DesignerWorkload, 'capacityPercent' | 'capacityStatus' | 'capacityColor'> {
  const capacityPercent = Math.min(100, Math.round((active / 4) * 100));
  if (active > 4) return { capacityPercent, capacityStatus: 'Overloaded', capacityColor: 'var(--kanso-danger)' };
  if (active === 4) return { capacityPercent, capacityStatus: 'At Capacity', capacityColor: 'var(--kanso-warning)' };
  if (active > 2) return { capacityPercent, capacityStatus: 'High Load', capacityColor: 'var(--kanso-warning)' };
  if (active === 0) return { capacityPercent, capacityStatus: 'Available', capacityColor: 'var(--kanso-accent)' };
  return { capacityPercent, capacityStatus: 'Normal', capacityColor: 'var(--kanso-success)' };
}

export function designerWorkload(projects: Project[]): DesignerWorkload[] {
  const byKey = new Map<string, Omit<DesignerWorkload, 'capacityPercent' | 'capacityStatus' | 'capacityColor'>>();
  for (const p of projects) {
    const name = String(p.designer || '').trim();
    if (!isPersonName(name)) continue;
    const key = name.toLowerCase();
    let row = byKey.get(key);
    if (!row) {
      row = {
        designer: name, staffId: name, role: 'Designer', name, avatar: '', avatarColor: 'var(--kanso-accent)',
        total: 0, active: 0, inProgress: 0, inReview: 0, revision: 0, overdue: 0, completed: 0
      };
      byKey.set(key, row);
    }
    row.total++;
    if (isActive(p)) row.active++;
    if (p.status === 'in-progress') row.inProgress++;
    if (p.status === 'review') row.inReview++;
    if (p.status === 'revision') row.revision++;
    if (isCompleted(p)) row.completed++;
    if (p.isOverdue) row.overdue++;
  }
  return [...byKey.values()]
    .map((row) => ({ ...row, ...capacityFor(row.active) }))
    .sort((a, b) => b.active - a.active || a.designer.localeCompare(b.designer));
}

/** Active projects always count; others only if created or completed inside the window. */
export function inTimeRange(projects: Project[], timeRange: string, now: Date): Project[] {
  if (timeRange !== '30d' && timeRange !== '90d') return projects;
  const cutoff = now.getTime() - (timeRange === '30d' ? 30 : 90) * DAY_MS;
  const after = (v: unknown) => {
    const t = v ? new Date(String(v)).getTime() : NaN;
    return !isNaN(t) && t >= cutoff;
  };
  return projects.filter((p) => isActive(p) || after(p.created) || after(p.completedAt));
}

function countBy(projects: Project[], key: (p: Project) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of projects) {
    const k = key(p);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function getDashboardMetrics(all: Project[], options: DashboardOptions | string = {}, now: Date): DashboardMetrics {
  const timeRange = (typeof options === 'string' ? options : options?.timeRange) || 'all';
  const rawBrand = typeof options === 'object' && options?.brand ? String(options.brand).trim() : 'all';
  const brandFilter = rawBrand.toUpperCase();

  const brandScoped = brandFilter !== 'ALL' && brandFilter !== ''
    ? all.filter((p) => (p.brand || '').toUpperCase() === brandFilter)
    : all;
  const projects = inTimeRange(brandScoped, timeRange, now);
  const count = (fn: (p: Project) => boolean) => projects.filter(fn).length;

  const highRevisionProjects = projects
    .filter((p) => (p.revision || 0) >= 2 && !['done', 'approved', 'completed', 'on-hold'].includes(p.status))
    .map((p) => ({
      id: p.id, jobId: p.jobId, title: p.title, designer: p.designer, brand: p.brand,
      revision: p.revision, status: p.status, priority: p.priority, deadline: p.deadline
    }));

  return {
    kpis: {
      total: projects.length,
      active: count(isActive),
      pendingReview: count((p) => p.status === 'review'),
      pendingApproval: count((p) => p.status === 'approved' || (p.status === 'review' && p.revision > 0)),
      revisionRequired: count((p) => p.status === 'revision'),
      completed: count(isCompleted),
      overdue: count((p) => p.isOverdue),
      dueSoon: count((p) => p.isDueSoon),
      highRevisionCount: highRevisionProjects.length
    },
    pipeline: {
      backlog: count((p) => p.status === 'backlog'),
      inProgress: count((p) => p.status === 'in-progress'),
      review: count((p) => p.status === 'review'),
      revision: count((p) => p.status === 'revision'),
      approved: count((p) => p.status === 'approved'),
      done: count((p) => p.status === 'done')
    },
    brandDistribution: countBy(projects, (p) => p.brand || 'SS'),
    typeDistribution: countBy(projects, (p) => p.presetType || 'Other'),
    designerWorkload: designerWorkload(projects),
    highRevisionProjects,
    slaMetrics: slaMetrics(projects, brandScoped, now),
    // Newest first (the server used its scan order).
    recentProjects: filterProjects(projects).slice(0, 6),
    activeFilters: { timeRange, brand: brandFilter }
  };
}
