import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { projectRoutes } from './projects';
import { projectWorkRoutes } from './projectWork';

const ACME = '202609_0001D_ACME_MobileAppIllustration';
const ACME_PATH = `_Projects/2026/${ACME}`;
const LUM = '202609_0003P_LUM_BrandIdentity';
const LUM_PATH = `_Projects/2026/${LUM}`;

const harness = (files?: Record<string, string>) => routeHarness([projectRoutes, projectWorkRoutes], { sample: true, files });
const b64 = (text: string) => btoa(text);

describe('POST /projects (scaffold)', () => {
  it('creates the 5-folder vault with README frontmatter and the next job number', async () => {
    const { call, fs, events } = harness();
    const res = await call('POST', '/projects', {
      title: 'Atelier Brand System',
      clientCode: 'nex',
      clientName: 'Nexus Studio',
      deliverableType: 'Social Media',
      priority: 'high',
      budget: 1200,
      currency: 'USD',
      description: 'Launch kit'
    });
    const folder = '202609_0004S_NEX_Atelier_Brand_System';
    const path = `_Projects/2026/${folder}`;
    expect(res).toMatchObject({ success: true, folderName: folder, targetDir: path });
    expect(res.project).toMatchObject({ id: folder, jobId: '0004S', brand: 'NEX', presetType: 'Social Media', status: 'in-progress', priority: 'high', deadline: '2026-09-29' });

    for (const sub of ['01_BRIEF', '02_SOURCE', '03_COPY', '04_WIP', '05_DELIVERABLES']) {
      expect(fs.paths()).toContain(`${path}/${sub}`);
    }
    expect(fs.paths().some((p) => p.includes('03_COPYWRITING'))).toBe(false);
    expect(await fs.readText(`${path}/03_COPY/COPY.md`)).toContain('**Client**: Nexus Studio (NEX)');
    const readme = await fs.readText(`${path}/README.md`);
    expect(readme).toMatch(/^---\nstatus: in-progress\n/);
    expect(readme).toContain('client_name: Nexus Studio');
    expect(readme).toContain('budget: 1200');
    expect(readme).toContain('created: "2026-09-15"');
    expect(readme).toContain('> Launch kit');
    expect(events).toContainEqual({ event: 'workspace:updated', data: expect.objectContaining({ projectId: folder, action: 'created' }) });

    expect((await call('GET', '/projects')).total).toBe(4);
    expect((await call('GET', '/projects/0004S')).project.title).toBe('Atelier Brand System');
  });

  it('honours an explicit job id and the brand alias, and refuses an existing folder', async () => {
    const { call } = harness();
    const body = { jobId: '0099', brand: 'ACME', title: 'Atelier Brand System', status: 'backlog', designer: 'Alex Mercer' };
    const res = await call('POST', '/projects', body);
    expect(res.folderName).toBe('202609_0099_ACME_Atelier_Brand_System');
    expect(res.project).toMatchObject({ status: 'backlog', designer: 'Alex Mercer', brand: 'ACME' });
    await expect(call('POST', '/projects', body)).rejects.toThrow(/already exists/);
  });
});

describe('ingest', () => {
  it('writes base64 data from the client path and returns the client shape', async () => {
    const { call, fs, events } = harness();
    const res = await call('POST', `/projects/${ACME}/ingest`, {
      filename: 'Hero_v2.png',
      targetSubfolder: '05_DELIVERABLES',
      fileData: `data:image/png;base64,${b64('PNGDATA')}`
    });
    expect(res).toEqual({ success: true, filename: 'Hero_v2.png', folder: '05_DELIVERABLES', sizeBytes: 7, relPath: `${ACME_PATH}/05_DELIVERABLES/Hero_v2.png` });
    expect(await fs.readText(res.relPath)).toBe('PNGDATA');
    expect(events.map((e) => e.event)).toContain('workspace:updated');
    expect((await call('GET', `/projects/${ACME}/deliverables`)).total).toBe(4);
  });

  it('maps legacy folder names, sanitises names, overwrites, and serves the server path', async () => {
    const { call, fs } = harness();
    const res = await call('POST', `/projects/${ACME}/deliverables/ingest`, {
      filename: '../Master Layout.psd',
      targetSubfolder: '02_SOURCE_FILES',
      fileData: b64('FAKE_PSD_BINARY_CONTENT')
    });
    expect(res).toMatchObject({ filename: 'Master_Layout.psd', folder: '02_SOURCE' });
    expect(await fs.readText(`${ACME_PATH}/02_SOURCE/Master_Layout.psd`)).toBe('FAKE_PSD_BINARY_CONTENT');

    await call('POST', `/projects/${ACME}/ingest`, { filename: 'Master Layout.psd', targetSubfolder: '02_SOURCE_FILES', fileData: b64('v2') });
    expect(await fs.readText(`${ACME_PATH}/02_SOURCE/Master_Layout.psd`)).toBe('v2');

    expect((await call('POST', `/projects/${ACME}/ingest`, { filename: 'a.pdf', targetSubfolder: 'Elsewhere', fileData: b64('x') })).folder).toBe('01_BRIEF');
    expect((await call('POST', `/projects/${ACME}/ingest`, { filename: 'b.png', targetSubfolder: '04_WORK_IN_PROGRESS', fileData: b64('x') })).folder).toBe('04_WIP');
  });

  it('keeps a legacy folder the project already has', async () => {
    const { call } = harness({ [`${ACME_PATH}/02_SOURCE_FILES/old.psd`]: 'old' });
    expect((await call('POST', `/projects/${ACME}/ingest`, { filename: 'new.psd', targetSubfolder: '02_SOURCE_FILES', fileData: b64('x') })).folder).toBe('02_SOURCE_FILES');
  });

  it('rejects missing or invalid data', async () => {
    const { call } = harness();
    await expect(call('POST', `/projects/${ACME}/ingest`, { filename: 'a.png' })).rejects.toThrow(/fileData/);
    await expect(call('POST', `/projects/${ACME}/ingest`, { fileData: b64('x') })).rejects.toThrow(/filename/);
    await expect(call('POST', `/projects/${ACME}/ingest`, { filename: 'a.png', fileData: '%%%' })).rejects.toThrow(/base64/);
    await expect(call('POST', `/projects/${ACME}/ingest`, { filename: '..', fileData: b64('x') })).rejects.toThrow(/filename/);
    await expect(call('POST', '/projects/nope/ingest', { filename: 'a.png', fileData: b64('x') })).rejects.toThrow('Project not found');
  });
});

describe('decisions', () => {
  it('requests a revision with the client verbs: round +1, status revision, _review.md, events', async () => {
    const { call, fs, events } = harness();
    const res = await call('POST', `/projects/${ACME}/decision`, { decision: 'request_revision', comment: ' Tighten the shadows ', deliverableId: 'd1' });
    expect(res.success).toBe(true);
    expect(res.approvalRecord).toMatchObject({ decision: 'revision_requested', round: 2, comment: 'Tighten the shadows', deliverableId: 'd1', reviewer: 'Studio Owner', timestamp: '2026-09-15T09:00:00.000Z' });
    expect(res.project).toMatchObject({ status: 'revision', revision: 2 });
    expect(res.project.approvals[0].decision).toBe('revision_requested');

    const readme = await fs.readText(`${ACME_PATH}/README.md`);
    expect(readme).toContain('# Mobile Banking 3D Isometric Illustrations');
    expect(readme).toContain('key_messaging: Seamless Digital Banking');
    const review = await fs.readText(`${ACME_PATH}/_review.md`);
    expect(review).toContain('Round 2 [REVISION_REQUESTED]');
    expect(review).toContain('Tighten the shadows');
    expect(fs.paths()).not.toContain(`${ACME_PATH}/05_DELIVERABLES/APPROVAL.md`);

    expect(events).toContainEqual({ event: 'project:decision', data: { projectId: ACME, decision: 'revision_requested', reviewer: 'Studio Owner', round: 2, deliverableId: 'd1' } });
    expect(events.map((e) => e.event)).toContain('project:updated');
  });

  it('approves, sets completedAt and stamps APPROVAL.md with SHA-256 checksums', async () => {
    const { call, fs } = harness();
    await call('POST', `/projects/${ACME}/decision`, { decision: 'request_revision' });
    const res = await call('POST', `/projects/${ACME}/decision`, { decision: 'approve', comment: 'Approved for print.', reviewer: 'Acme Corp Brand Lead', role: 'Brand Director' });
    expect(res.project).toMatchObject({ status: 'approved', revision: 2, completedAt: '2026-09-15T09:00:00.000Z' });
    expect(res.project.approvals).toHaveLength(2);
    expect(res.approvalRecord.round).toBe(2);

    const cert = await fs.readText(`${ACME_PATH}/05_DELIVERABLES/APPROVAL.md`);
    expect(cert).toMatch(/^---\ntype: deliverable_approval\n/);
    expect(cert).toContain('Official Deliverable Approval & Handover Certificate');
    expect(cert).toContain('Acme Corp Brand Lead (Brand Director)');
    expect(cert).toContain('Mobile_Banking_Hero_3D.png');
    expect(cert).toContain(await fs.sha256(`${ACME_PATH}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`));
    expect(cert).toContain('Cryptographic Checksum (SHA-256)');
    expect(/^[\x00-\x7f]*$/.test(cert)).toBe(true);
    // The certificate is not a media deliverable.
    expect((await call('GET', `/projects/${ACME}/deliverables`)).deliverables.some((d: any) => d.filename === 'APPROVAL.md')).toBe(false);
  });

  it('accepts the server path and field names and rejects unknown decisions', async () => {
    const { call, fs } = harness();
    const res = await call('POST', `/projects/${LUM}/deliverables/del42/decision`, { status: 'rejected', note: 'Paused by client' });
    expect(res.approvalRecord).toMatchObject({ decision: 'rejected', deliverableId: 'del42', comment: 'Paused by client' });
    expect(res.project.status).toBe('on-hold');
    expect(await fs.readText(`${LUM_PATH}/_review.md`)).toContain('Paused by client');
    await expect(call('POST', `/projects/${ACME}/decision`, { decision: 'maybe' })).rejects.toThrow(/Unknown decision/);
    await expect(call('POST', '/projects/nope/decision', { decision: 'approve' })).rejects.toThrow('Project not found');
  });
});

describe('snapshots', () => {
  it('captures milestones, lists newest first, shows details and rolls back with a safety backup', async () => {
    const { call, fs, events } = harness();
    const copy = `${ACME_PATH}/03_COPY/COPY.md`;
    const original = await fs.readText(copy);

    const snap1 = (await call('POST', `/projects/${ACME}/snapshot`, { trigger: 'MANUAL_MILESTONE', note: 'First draft completed' })).snapshot;
    expect(snap1).toMatchObject({ trigger: 'MANUAL_MILESTONE', revision: 1, status: 'in-progress', deliverableCount: 2, note: 'First draft completed', actor: 'Studio Owner' });
    expect(snap1.id).toMatch(/^snap_\d+$/);
    expect(fs.paths()).toContain(`${ACME_PATH}/.snapshots/${snap1.id}/meta.json`);

    await fs.writeText(copy, '# Altered Bad Headline\nCorrupted text\n');
    await call('PUT', `/projects/${ACME}`, { status: 'review' });
    const snap2 = (await call('POST', `/projects/${ACME}/snapshots`, { note: 'Client feedback logged' })).snapshot;
    expect(snap2.id).not.toBe(snap1.id);
    expect(snap2).toMatchObject({ status: 'review', trigger: 'MANUAL_MILESTONE' });

    const list = (await call('GET', `/projects/${ACME}/snapshots`)).snapshots;
    expect(list.map((s: any) => s.id)).toEqual([snap2.id, snap1.id]);

    const details = (await call('GET', `/projects/${ACME}/snapshots/${snap1.id}`)).snapshot;
    expect(details.meta.id).toBe(snap1.id);
    expect(details.copy).toBe(original);
    expect(details.readme).toContain('status: in-progress');
    expect(details.review).toBe('');

    const res = await call('POST', `/projects/${ACME}/rollback`, { snapshotId: snap1.id });
    expect(res).toMatchObject({ success: true, restoredSnapshot: { id: snap1.id }, message: `Project successfully restored to snapshot ${snap1.id}` });
    expect(await fs.readText(copy)).toBe(original);
    expect((await call('GET', `/projects/${ACME}`)).project.status).toBe('in-progress');
    const after = (await call('GET', `/projects/${ACME}/snapshots`)).snapshots;
    expect(after).toHaveLength(3);
    expect(after.some((s: any) => s.trigger === 'PRE_ROLLBACK_BACKUP' && s.status === 'review')).toBe(true);
    expect(events).toContainEqual({ event: 'project:updated', data: { projectId: ACME, action: 'rollback', snapshotId: snap1.id, actor: 'Studio Owner' } });

    // Snapshots stay out of the project index.
    expect((await call('GET', '/projects')).total).toBe(3);
  });

  it('reports missing snapshots and bad input', async () => {
    const { call } = harness();
    expect((await call('GET', `/projects/${ACME}/snapshots`)).snapshots).toEqual([]);
    await expect(call('GET', `/projects/${ACME}/snapshots/snap_1`)).rejects.toThrow('Snapshot not found');
    await expect(call('POST', `/projects/${ACME}/rollback`, {})).rejects.toThrow(/snapshotId is required/);
    await expect(call('POST', `/projects/${ACME}/rollback`, { snapshotId: 'snap_1' })).rejects.toThrow(/not found/);
    await expect(call('POST', `/projects/${ACME}/rollback`, { snapshotId: '../README.md' })).rejects.toThrow(/not found/);
  });
});

describe('copywriting', () => {
  it('reads 03_COPY/COPY.md with stats', async () => {
    const { call, fs } = harness();
    const res = await call('GET', `/projects/${ACME}/copywriting`);
    expect(res.success).toBe(true);
    expect(res.copywriting.filePath).toBe(`${ACME_PATH}/03_COPY/COPY.md`);
    expect(res.copywriting.body).toBe(await fs.readText(`${ACME_PATH}/03_COPY/COPY.md`));
    expect(res.copywriting.stats.words).toBeGreaterThan(0);
    expect(res.copywriting.lastUpdated).toBe('2026-09-15T09:00:00.000Z');
  });

  it('seeds and saves the template when COPY.md is blank or missing', async () => {
    const { call, fs } = harness({ [`${LUM_PATH}/03_COPY/COPY.md`]: '  \n' });
    const res = await call('GET', `/projects/${LUM}/copywriting`);
    expect(res.copywriting.body).toContain('# Copywriting & Script Studio: BrandIdentity');
    expect(await fs.readText(`${LUM_PATH}/03_COPY/COPY.md`)).toBe(res.copywriting.body);
    expect(/^[\x00-\x7f]*$/.test(res.copywriting.body)).toBe(true);

    fs.remove(`${ACME_PATH}/03_COPY`);
    await call('GET', `/projects/${ACME}/copywriting`);
    expect(fs.paths()).toContain(`${ACME_PATH}/03_COPY/COPY.md`);
    expect(fs.paths().some((p) => p.includes('03_COPYWRITING') || p.startsWith('_Team/copywriting'))).toBe(false);
  });

  it('saves body or content and returns the flat server shape plus copywriting', async () => {
    const { call, fs } = harness();
    const saved = await call('PUT', `/projects/${ACME}/copywriting`, { body: '# Updated Hook\n\n- Hook 1: test' });
    expect(saved).toMatchObject({ success: true, body: '# Updated Hook\n\n- Hook 1: test', updatedBy: 'Studio Owner', stats: { words: 7 } });
    expect(saved.copywriting).toMatchObject({ body: saved.body, filePath: `${ACME_PATH}/03_COPY/COPY.md` });
    expect(await fs.readText(`${ACME_PATH}/03_COPY/COPY.md`)).toBe('# Updated Hook\n\n- Hook 1: test');
    await call('PUT', `/projects/${ACME}/copywriting`, { content: 'Alt field' });
    expect(await fs.readText(`${ACME_PATH}/03_COPY/COPY.md`)).toBe('Alt field');
    await expect(call('GET', '/projects/nope/copywriting')).rejects.toThrow('Project not found');
  });
});

describe('DELETE /projects/:id', () => {
  it('archives the folder instead of deleting it', async () => {
    const { call, fs, events } = harness();
    const res = await call('DELETE', '/projects/0001D');
    const archived = `_Archive/20260915-090000/${ACME_PATH}`;
    expect(res).toEqual({ success: true, message: `Project 0001D moved to ${archived}.`, projectId: ACME, archivedTo: archived });
    expect(fs.paths()).toContain(`${archived}/README.md`);
    expect(fs.paths()).toContain(`${archived}/05_DELIVERABLES/Mobile_Banking_Hero_3D.png`);
    expect(fs.paths().some((p) => p.startsWith(`${ACME_PATH}`))).toBe(false);
    expect(events).toContainEqual({ event: 'workspace:updated', data: { projectId: ACME, action: 'deleted', archivedTo: archived } });
    expect((await call('GET', '/projects')).total).toBe(2);
    await expect(call('DELETE', '/projects/0001D')).rejects.toThrow('Project not found');
  });
});

describe('project deliverables', () => {
  it('lists one project and finds a deliverable by id', async () => {
    const { call } = harness();
    const res = await call('GET', `/projects/${ACME}/deliverables`);
    expect(res.total).toBe(3);
    expect(res.deliverables.map((d: any) => d.filename)).toEqual(['Isometric_Icons_16x_Set.svg', 'Mobile_Banking_Hero_3D.png', 'Card_Design_Preview_WIP.png']);
    const one = await call('GET', `/projects/${ACME}/deliverables/${res.deliverables[1].id}`);
    expect(one.deliverable).toMatchObject({ filename: 'Mobile_Banking_Hero_3D.png', folder: '05_DELIVERABLES' });
    await expect(call('GET', `/projects/${ACME}/deliverables/nope`)).rejects.toThrow('Deliverable not found');
  });
});
