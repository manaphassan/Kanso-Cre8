import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { projectRoutes } from './projects';

const ACME = '202609_0001D_ACME_MobileAppIllustration';
const ACME_PATH = `_Projects/2026/${ACME}`;

describe('project routes on the sample vault', () => {
  it('lists the three sample projects with parsed metadata', async () => {
    const { call } = routeHarness([projectRoutes], { sample: true });
    const res = await call('GET', '/projects');
    expect(res.total).toBe(3);
    const acme = res.projects.find((p: any) => p.id === ACME);
    expect(acme).toMatchObject({
      jobId: '0001D',
      presetCode: 'D',
      brand: 'ACME',
      title: 'MobileAppIllustration',
      status: 'in-progress',
      priority: 'high',
      deadline: '2026-09-23',
      daysRemaining: 8,
      isOverdue: false,
      fullPath: ACME_PATH,
      deliverableCount: 3
    });
    expect(res.projects.map((p: any) => p.presetType).sort()).toEqual(['Brand Identity', 'Graphic / Print', 'Social Media']);
  });

  it('filters like the server', async () => {
    const { call } = routeHarness([projectRoutes], { sample: true });
    expect((await call('GET', '/projects?brand=nex')).total).toBe(1);
    expect((await call('GET', '/projects?query=brand')).projects.map((p: any) => p.brand)).toEqual(['LUM']);
    expect((await call('GET', '/projects?status=all&priority=high')).total).toBeGreaterThanOrEqual(1);
  });

  it('returns a project with deliverables and comments, found by job id', async () => {
    const { call } = routeHarness([projectRoutes], { sample: true });
    const res = await call('GET', '/projects/0001D');
    expect(res.project.id).toBe(ACME);
    expect(res.deliverables.map((d: any) => [d.filename, d.previewType, d.folder])).toEqual([
      ['Isometric_Icons_16x_Set.svg', 'image', '05_DELIVERABLES'],
      ['Mobile_Banking_Hero_3D.png', 'image', '05_DELIVERABLES'],
      ['Card_Design_Preview_WIP.png', 'image', '04_WIP']
    ]);
    expect(res.deliverables[0].previewUrl).toMatch(/^asset:\/\/localhost\/_Projects\//);
    expect(res.comments).toEqual([]);
    await expect(call('GET', '/projects/nope')).rejects.toThrow('Project not found');
  });

  it('updates frontmatter, keeps unknown keys and the body, and rejects stale hashes', async () => {
    const { call, fs, events } = routeHarness([projectRoutes], { sample: true });
    const before = (await call('GET', `/projects/${ACME}`)).project;
    const res = await call('PUT', `/projects/${ACME}`, { status: 'review', expectedHash: before.versionHash });
    expect(res.project.status).toBe('review');
    const text = await fs.readText(`${ACME_PATH}/README.md`);
    expect(text).toMatch(/^---\nstatus: review\n/);
    expect(text).toContain('key_messaging: Seamless Digital Banking');
    expect(text).toContain('# Mobile Banking 3D Isometric Illustrations');
    expect(events.map((e) => e.event)).toContain('project:updated');
    await expect(call('PUT', `/projects/${ACME}`, { status: 'done', expectedHash: before.versionHash })).rejects.toThrow(/Concurrency Conflict/);
  });

  it('saves brief, creative direction and reassignment', async () => {
    const { call, fs } = routeHarness([projectRoutes], { sample: true });
    await call('PUT', `/projects/${ACME}/brief`, { briefMarkdown: '# New brief\n' });
    await call('PUT', `/projects/${ACME}/direction`, { visual_concept: 'Isometric glass', color_palette: 'Sky' });
    expect(await call('POST', `/projects/${ACME}/reassign`, { newDesigner: ' Alex ' })).toMatchObject({ designer: 'Alex' });
    const p = (await call('GET', `/projects/${ACME}`)).project;
    expect(p.briefMarkdown).toBe('# New brief\n');
    expect(p.creativeDirection).toMatchObject({ visual_concept: 'Isometric glass', tone: 'Trustworthy, Modern, Electric Blue Fintech' });
    expect(p.designer).toBe('Alex');
    expect(await fs.readText(`${ACME_PATH}/README.md`)).toContain('updatedBy: Studio Owner');
    await expect(call('POST', `/projects/${ACME}/reassign`, {})).rejects.toThrow(/required/);
  });

  it('adds, resolves and deletes comments in _review.md', async () => {
    const { call, fs } = routeHarness([projectRoutes], { sample: true });
    const added = await call('POST', `/projects/${ACME}/comments`, { content: 'Brighten the hero @alex', deliverableId: 'd1' });
    expect(added.comment).toMatchObject({ content: 'Brighten the hero @alex', mentions: ['alex'], resolved: false });
    const review = await fs.readText(`${ACME_PATH}/_review.md`);
    expect(review).toContain('## Comments Thread');
    expect(review).toContain('Brighten the hero');

    const id = added.comment.id;
    expect(await call('PUT', `/projects/${ACME}/comments/${id}/resolve`, { resolved: true })).toEqual({ success: true, commentId: id, resolved: true });
    expect((await call('GET', `/projects/${ACME}/comments`)).comments[0].resolved).toBe(true);
    expect(await call('DELETE', `/projects/${ACME}/comments/${id}`)).toMatchObject({ success: true, deleted: true });
    expect((await call('GET', `/projects/${ACME}/comments`)).comments).toEqual([]);
    await expect(call('POST', `/projects/${ACME}/comments`, { content: '  ' })).rejects.toThrow(/required/);
  });

  it('lists deliverables across projects', async () => {
    const { call } = routeHarness([projectRoutes], { sample: true });
    const res = await call('GET', '/deliverables');
    expect(res.count).toBe(res.deliverables.length);
    expect(res.deliverables.some((d: any) => d.filename === 'Launch_Promo_Reel_9x16.mp4' && d.isVideo && d.aspectRatioEstimate === '9:16')).toBe(true);
  });
});
