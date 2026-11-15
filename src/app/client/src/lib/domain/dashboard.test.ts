import { describe, expect, it } from 'vitest';
import { capacityFor, designerWorkload, getDashboardMetrics } from './dashboard';
import { turnaroundDays } from './dashboardSla';
import type { Project } from './projects';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));

function project(over: Partial<Project>): Project {
  return {
    id: 'p', folderName: 'p', fullPath: '_Projects/2026/p', dateCode: '202609', jobId: '0001D', presetCode: 'D',
    presetType: 'Graphic / Print', brand: 'ACME', title: 'Job', status: 'backlog', priority: 'medium', designer: 'Unassigned',
    manager: 'Unassigned', department: 'General', created: '2026-09-01', deadline: '', completedAt: null, duration: '',
    revision: 0, tags: [], isOverdue: false, isDueSoon: false, daysRemaining: null, deliverableCount: 0,
    creativeDirection: {}, copywriting: {}, approvals: [], versionHash: null, readmeBody: '', briefMarkdown: '',
    ...over
  } as Project;
}

describe('designer workload without a staff roster', () => {
  it('groups by designer (case-insensitive) and skips folder-derived and manager names', () => {
    const rows = designerWorkload([
      project({ designer: 'Alex', status: 'in-progress' }),
      project({ designer: 'alex', status: 'review', isOverdue: true }),
      project({ designer: 'Unassigned', status: 'in-progress' }),
      project({ designer: '2026', status: 'in-progress' }),
      project({ designer: '0002S', status: 'in-progress' }),
      project({ designer: 'Studio Manager', status: 'in-progress' }),
      project({ designer: 'Sam', status: 'done' })
    ]);
    expect(rows.map((r) => [r.designer, r.total, r.active, r.overdue, r.completed])).toEqual([
      ['Alex', 2, 2, 1, 0],
      ['Sam', 1, 0, 0, 1]
    ]);
    expect(rows[1]).toMatchObject({ capacityStatus: 'Available', capacityPercent: 0, staffId: 'Sam', role: 'Designer' });
  });

  it('maps active counts to capacity bands with CSS tokens', () => {
    expect(capacityFor(2)).toEqual({ capacityPercent: 50, capacityStatus: 'Normal', capacityColor: 'var(--kanso-success)' });
    expect(capacityFor(3).capacityStatus).toBe('High Load');
    expect(capacityFor(4)).toMatchObject({ capacityPercent: 100, capacityStatus: 'At Capacity' });
    expect(capacityFor(6)).toMatchObject({ capacityPercent: 100, capacityStatus: 'Overloaded', capacityColor: 'var(--kanso-danger)' });
  });
});

describe('SLA metrics', () => {
  it('uses completedAt, then the approval, then the deadline for turnaround', () => {
    expect(turnaroundDays(project({ completedAt: '2026-09-04T12:00:00.000Z' }))).toBe(3.5);
    expect(turnaroundDays(project({ approvals: [{ decision: 'revision_requested', timestamp: '2026-09-02T00:00:00Z' }, { decision: 'approved', timestamp: '2026-09-06T00:00:00Z' }] }))).toBe(5);
    expect(turnaroundDays(project({ deadline: '2026-09-01' }))).toBe(0.5);
    expect(turnaroundDays(project({ created: '' }))).toBeNull();
  });

  it('computes median, p90 and first-time-right over completed projects', () => {
    const done = (days: number, revision: number) =>
      project({ status: 'done', revision, completedAt: new Date(Date.UTC(2026, 8, 1) + days * 86_400_000).toISOString() });
    const m = getDashboardMetrics([done(2, 0), done(4, 1), done(6, 0), done(10, 3), project({ status: 'in-progress' })], {}, NOW);
    expect(m.slaMetrics).toMatchObject({
      avgTurnaroundDays: 5.5, medianTurnaroundDays: 5, p90TurnaroundDays: 10, firstTimeRightPercent: 50, avgRevisionCount: 1, totalCompleted: 4
    });
    expect(m.kpis).toMatchObject({ total: 5, completed: 4, active: 1 });
  });

  it('accepts the time range as a string like the server', () => {
    const old = project({ status: 'done', created: '2025-01-01', completedAt: '2025-01-05T00:00:00Z' });
    expect(getDashboardMetrics([old], '90d', NOW).kpis.total).toBe(0);
    expect(getDashboardMetrics([old], 'all', NOW).kpis.total).toBe(1);
  });
});
