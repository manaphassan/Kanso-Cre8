import { describe, expect, it } from 'vitest';
import { addApproval, addComment, resolveComment } from '$lib/domain/review';
import { routeHarness, TEST_NOW } from '../testing';
import { dashboardRoutes } from './dashboard';

const ACME_PATH = '_Projects/2026/202609_0001D_ACME_MobileAppIllustration';
const NEX_PATH = '_Projects/2026/202609_0002S_NEX_GameKeyVisual';

/** A finished ACME job from last year: zero revisions, 10-day turnaround. */
const DONE_PROJECT = {
  '_Projects/2025/202501_0009D_ACME_PackagingRefresh/README.md':
    '---\nstatus: done\ndesigner: alex.mercer\ncreated: "2025-01-05"\ncompletedAt: "2025-01-15T00:00:00.000Z"\nrevision: 0\ntags: [packaging]\n---\n\n# Packaging refresh\n'
};

describe('GET /dashboard on the sample vault', () => {
  it('returns every key the dashboard reads with sample counts', async () => {
    const { call } = routeHarness([dashboardRoutes], { sample: true });
    const res = await call('GET', '/dashboard');
    expect(Object.keys(res).sort()).toEqual([
      'activeFilters', 'brandDistribution', 'designerWorkload', 'highRevisionProjects', 'kpis',
      'pipeline', 'recentProjects', 'slaMetrics', 'typeDistribution'
    ]);
    expect(res.kpis).toMatchObject({
      total: 3, active: 2, pendingReview: 1, pendingApproval: 1, revisionRequired: 0, completed: 0, overdue: 0, highRevisionCount: 1
    });
    expect(res.pipeline).toEqual({ backlog: 1, inProgress: 1, review: 1, revision: 0, approved: 0, done: 0 });
    expect(res.brandDistribution).toEqual({ ACME: 1, NEX: 1, LUM: 1 });
    expect(res.typeDistribution).toEqual({ 'Graphic / Print': 1, 'Social Media': 1, 'Brand Identity': 1 });
    expect(res.highRevisionProjects).toEqual([
      expect.objectContaining({ jobId: '0002S', brand: 'NEX', revision: 2, status: 'review' })
    ]);
    expect(res.designerWorkload).toEqual([
      expect.objectContaining({
        designer: 'alex.mercer', name: 'alex.mercer', total: 3, active: 2, inProgress: 1, inReview: 1,
        capacityPercent: 50, capacityStatus: 'Normal', capacityColor: 'var(--kanso-success)'
      })
    ]);
    expect(res.slaMetrics).toMatchObject({
      avgTurnaroundDays: null, firstTimeRightPercent: null, avgRevisionCount: null, totalCompleted: 0,
      avgReviewAgeDays: 13.4 // NEX in review since 2026-09-02
    });
    expect(res.slaMetrics.brandVelocity.map((b: any) => b.brand).sort()).toEqual(['ACME', 'LUM', 'NEX']);
    expect(res.slaMetrics.competencySkills).toHaveLength(6);
    expect(res.recentProjects.map((p: any) => p.jobId)).toEqual(['0003P', '0002S', '0001D']);
    expect(res.activeFilters).toEqual({ timeRange: 'all', brand: 'ALL' });
  });

  it('filters by brand and time range, and computes SLA metrics from completed work', async () => {
    const { call } = routeHarness([dashboardRoutes], { sample: true, files: DONE_PROJECT });
    const all = await call('GET', '/dashboard');
    expect(all.kpis).toMatchObject({ total: 4, completed: 1 });
    expect(all.slaMetrics).toMatchObject({
      avgTurnaroundDays: 10, medianTurnaroundDays: 10, p90TurnaroundDays: 10, firstTimeRightPercent: 100, avgRevisionCount: 0, totalCompleted: 1
    });
    expect(all.designerWorkload[0]).toMatchObject({ total: 4, completed: 1 });

    const acme = await call('GET', '/dashboard?brand=acme');
    expect(acme.kpis.total).toBe(2);
    expect(acme.brandDistribution).toEqual({ ACME: 2 });
    expect(acme.activeFilters).toEqual({ timeRange: 'all', brand: 'ACME' });

    const recent = await call('GET', '/dashboard?timeRange=30d');
    expect(recent.kpis).toMatchObject({ total: 3, completed: 0 });
    expect(recent.slaMetrics.firstTimeRightPercent).toBeNull();
    // Brand velocity ignores the time window, as on the server.
    expect(recent.slaMetrics.brandVelocity.find((b: any) => b.brand === 'ACME')).toMatchObject({ total: 2, completed: 1 });
  });
});

describe('GET /notifications', () => {
  it('is empty when no project has a review file', async () => {
    const { call } = routeHarness([dashboardRoutes], { sample: true });
    expect(await call('GET', '/notifications?limit=25')).toEqual({ notifications: [], unreadCount: 0 });
  });

  it('builds comment, revision and approval notifications from _review.md, newest first', async () => {
    const { call, fs } = routeHarness([dashboardRoutes], { sample: true });
    const hour = (h: number) => new Date(TEST_NOW.getTime() - h * 3_600_000);
    const long = 'Please brighten the hero render and push the cyan accent further on the card stack';
    await addComment(fs, ACME_PATH, '0001D', { content: long, author: 'Sarah Jenkins', authorRole: 'Client' }, hour(3));
    const resolved = await addComment(fs, ACME_PATH, '0001D', { content: 'Logo spacing fixed' }, hour(2));
    await resolveComment(fs, ACME_PATH, '0001D', resolved.id, true, 'Studio Owner', hour(1.5));
    await addApproval(fs, NEX_PATH, '0002S', {
      id: 'appr_1', round: 3, decision: 'revision_requested', reviewer: 'Marcus Vance', role: 'Client', comment: 'Sharper neon edges', timestamp: hour(1).toISOString()
    });
    await addApproval(fs, NEX_PATH, '0002S', {
      id: 'appr_2', round: 3, decision: 'approved', reviewer: 'Marcus Vance', role: 'Client', comment: '', timestamp: hour(0.5).toISOString()
    });

    const res = await call('GET', '/notifications?limit=30');
    expect(res.notifications.map((n: any) => n.type)).toEqual(['approval', 'revision', 'comment', 'comment']);
    expect(res.notifications[0]).toEqual({
      id: 'notif_appr_2', type: 'approval', title: 'Project Approved: 0002S', message: 'Marcus Vance signed off and approved deliverables.',
      timestamp: hour(0.5).toISOString(), actor: 'Marcus Vance', role: 'Client', route: 'project-detail', routeId: '0002S', unread: true
    });
    expect(res.notifications[1]).toMatchObject({ title: 'Revision Requested on 0002S', message: 'Sharper neon edges' });
    expect(res.notifications[2]).toMatchObject({ id: `notif_${resolved.id}`, title: 'Comment by Designer', routeId: '0001D', unread: false });
    expect(res.notifications[3]).toMatchObject({ actor: 'Sarah Jenkins', role: 'Client', message: `${long.slice(0, 60)}...`, unread: true });
    expect(res.unreadCount).toBe(3);

    expect((await call('GET', '/notifications?limit=2')).notifications).toHaveLength(2);
  });
});
