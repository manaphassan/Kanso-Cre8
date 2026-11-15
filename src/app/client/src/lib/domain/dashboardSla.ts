/**
 * Turnaround, first-time-right, review age, brand velocity and competency
 * scores for the dashboard. Port of the SLA half of
 * ProjectService.getDashboardMetrics; `now` is passed in.
 */

import type { Project } from './projects';

const DAY_MS = 86_400_000;
const isActive = (p: Project) => ['in-progress', 'review', 'revision'].includes(p.status);
export const isCompleted = (p: Project) => p.status === 'done' || p.status === 'approved';

export interface BrandVelocity {
  brand: string;
  total: number;
  active: number;
  completed: number;
  avgDays: number;
}

export interface CompetencySkill {
  label: string;
  target: number;
  actual: number;
  projectCount: number;
}

export interface SlaMetrics {
  avgTurnaroundDays: number | null;
  medianTurnaroundDays: number | null;
  p90TurnaroundDays: number | null;
  firstTimeRightPercent: number | null;
  avgRevisionCount: number | null;
  avgReviewAgeDays: number;
  totalCompleted: number;
  brandVelocity: BrandVelocity[];
  competencySkills: CompetencySkill[];
}

const time = (value: unknown): number => (value ? new Date(String(value)).getTime() : NaN);

/** Days from `created` to completion (completedAt, then first approval, then deadline). */
export function turnaroundDays(p: Project): number | null {
  if (!p.created) return null;
  const created = time(p.created);
  let finish = NaN;
  if (p.completedAt) finish = time(p.completedAt);
  else if (Array.isArray(p.approvals) && p.approvals.length) {
    const approval = p.approvals.find((a) => a?.decision === 'approved') || p.approvals[0];
    finish = time(approval?.timestamp);
  } else if (p.deadline) finish = time(p.deadline);
  if (isNaN(finish) || isNaN(created)) return null;
  return Math.max(0.5, Math.round(((finish - created) / DAY_MS) * 10) / 10);
}

const DISCIPLINES = [
  { label: 'Packaging', keywords: ['packaging', 'box', 'label', 'bottle', 'pouch', 'pack', 'unboxing'], target: 90 },
  { label: 'Graphic Design', keywords: ['graphic', 'poster', 'social', 'banner', 'print', 'flyer', 'catalog'], target: 95 },
  { label: '3D & Motion', keywords: ['3d', 'motion', 'animation', 'c4d', 'blender', 'render', 'cinema'], target: 80 },
  { label: 'Video Editing', keywords: ['video', 'reel', 'tiktok', 'vfx', 'premiere', 'youtube', 'clip'], target: 85 },
  { label: 'Copywriting', keywords: ['copy', 'headline', 'script', 'article', 'content', 'copywriting'], target: 75 },
  { label: 'Branding', keywords: ['brand', 'identity', 'guidelines', 'logo', 'launch', 'typography'], target: 90 }
];

export function competencySkills(all: Project[]): CompetencySkill[] {
  return DISCIPLINES.map((disc) => {
    const matching = all.filter((p) => {
      const text = `${p.title || ''} ${p.presetType || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return disc.keywords.some((kw) => text.includes(kw));
    });
    const total = matching.length;
    const completed = matching.filter(isCompleted).length;
    const zeroRev = matching.filter((p) => isCompleted(p) && (p.revision || 0) === 0).length;
    let actual: number;
    if (total > 0) {
      const ftr = completed > 0 ? (zeroRev / completed) * 100 : 75;
      actual = Math.min(98, Math.max(65, Math.round(60 + Math.min(20, total * 4) + ftr * 0.18)));
    } else {
      actual = disc.target > 85 ? disc.target - 2 : disc.target + 3;
    }
    return { label: disc.label, target: disc.target, actual, projectCount: total };
  });
}

/**
 * `projects` is the time- and brand-filtered list; `brandScoped` is the
 * brand-filtered list before the time filter (brand velocity and competency
 * use it, as on the server).
 */
export function slaMetrics(projects: Project[], brandScoped: Project[], now: Date): SlaMetrics {
  const completed = projects.filter(isCompleted);
  const turnarounds: number[] = [];
  let zeroRev = 0;
  let totalRevisions = 0;
  for (const p of completed) {
    totalRevisions += p.revision || 0;
    if ((p.revision || 0) === 0) zeroRev++;
    const days = turnaroundDays(p);
    if (days !== null) turnarounds.push(days);
  }
  turnarounds.sort((a, b) => a - b);
  const sum = turnarounds.reduce((n, d) => n + d, 0);

  // The 3.5 / 3.0 / 5.5 placeholders are the server's values for completed projects without dates.
  const avgTurnaroundDays = turnarounds.length
    ? Number((sum / turnarounds.length).toFixed(1))
    : completed.length ? 3.5 : null;
  let medianTurnaroundDays: number | null = null;
  let p90TurnaroundDays: number | null = null;
  if (turnarounds.length) {
    const mid = Math.floor(turnarounds.length / 2);
    medianTurnaroundDays = turnarounds.length % 2
      ? turnarounds[mid]
      : Number(((turnarounds[mid - 1] + turnarounds[mid]) / 2).toFixed(1));
    p90TurnaroundDays = Number(turnarounds[Math.min(turnarounds.length - 1, Math.floor(turnarounds.length * 0.9))].toFixed(1));
  } else if (completed.length) {
    medianTurnaroundDays = 3.0;
    p90TurnaroundDays = 5.5;
  }

  const inReview = projects.filter((p) => p.status === 'review');
  let reviewWait = 0;
  for (const p of inReview) {
    let enter = p.created ? time(p.created) : now.getTime();
    if (Array.isArray(p.approvals) && p.approvals[0]?.timestamp) enter = time(p.approvals[0].timestamp);
    if (isNaN(enter)) enter = now.getTime();
    reviewWait += Math.max(0.1, Math.round(((now.getTime() - enter) / DAY_MS) * 10) / 10);
  }

  // Brands present in the vault (the server listed a fixed set of legacy codes).
  const brands = [...new Set(brandScoped.map((p) => (p.brand || '').toUpperCase()).filter(Boolean))];
  const brandVelocity = brands
    .map((brand) => {
      const list = brandScoped.filter((p) => (p.brand || '').toUpperCase() === brand);
      return {
        brand,
        total: list.length,
        active: list.filter(isActive).length,
        completed: list.filter(isCompleted).length,
        avgDays: avgTurnaroundDays || 3.5
      };
    })
    .sort((a, b) => b.total - a.total || a.brand.localeCompare(b.brand));

  return {
    avgTurnaroundDays,
    medianTurnaroundDays,
    p90TurnaroundDays,
    firstTimeRightPercent: completed.length ? Number(((zeroRev / completed.length) * 100).toFixed(1)) : null,
    avgRevisionCount: completed.length ? Number((totalRevisions / completed.length).toFixed(1)) : null,
    avgReviewAgeDays: inReview.length ? Number((reviewWait / inReview.length).toFixed(1)) : 0,
    totalCompleted: completed.length,
    brandVelocity,
    competencySkills: competencySkills(brandScoped)
  };
}
