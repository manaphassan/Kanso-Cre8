/**
 * Project work routes (P2.5 rest): scaffold, ingest, decisions, snapshots,
 * copywriting, archive ("delete") and per-project deliverables. Mirrors
 * server/routes/projects.js and deliverables.js for these endpoints, plus the
 * paths ApiClient actually calls where they differed from the server.
 */

import { normalizeDecision, submitDecision } from '$lib/domain/approvals';
import { getCopywriting, updateCopywriting } from '$lib/domain/copywriting';
import { listDeliverables } from '$lib/domain/deliverables';
import { ingestFile, scaffoldProject } from '$lib/domain/scaffold';
import { createSnapshot, getSnapshotDetails, getSnapshots, rollback, snapshotExists } from '$lib/domain/snapshots';
import { requireProject } from '../projectIndex';
import { badRequest, notFound, type LocalRouter } from '../router';

const ACTOR = 'Studio Owner';

/** Runs a domain call and reports its validation errors as 400 (the server's status). */
async function as400<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err: any) {
    throw badRequest(err?.message || String(err));
  }
}

export function projectWorkRoutes(router: LocalRouter): void {
  router.post('/projects', async ({ ctx, body }) => {
    const fs = await ctx.vault();
    const result = await as400(() => scaffoldProject(fs, body && typeof body === 'object' ? body : {}, ctx.now()));
    ctx.bus.emit('workspace:updated', { projectId: result.folderName, action: 'created', timestamp: ctx.now().toISOString() });
    const project = await requireProject(ctx, result.folderName).catch(() => result.project);
    return { ...result, project };
  });

  // ApiClient.deleteProject. Never deletes: the folder moves to _Archive/<stamp>/.
  router.delete('/projects/:id', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    const archivedTo = await (await ctx.vault()).moveToArchive(project.fullPath);
    ctx.bus.emit('workspace:updated', { projectId: project.id, action: 'deleted', archivedTo });
    return {
      success: true,
      message: `Project ${project.jobId || project.title} moved to ${archivedTo}.`,
      projectId: project.id,
      archivedTo
    };
  });

  // ApiClient.ingestFile posts to /ingest; the server registered /deliverables/ingest.
  router.post(['/projects/:id/ingest', '/projects/:id/deliverables/ingest'], async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const filename = String(body?.filename ?? '').trim();
    const fileData = body?.fileData ?? body?.base64Data ?? body?.data;
    if (!filename) throw badRequest('filename is required');
    if (typeof fileData !== 'string' || !fileData) throw badRequest('fileData (base64) is required');
    const fs = await ctx.vault();
    const result = await as400(() =>
      ingestFile(fs, project.fullPath, { filename, targetSubfolder: body?.targetSubfolder ?? body?.subfolder, fileData })
    );
    ctx.bus.emit('workspace:updated', { projectId: project.id, filename: result.filename, folder: result.folder, timestamp: ctx.now().toISOString() });
    return result;
  });

  // ApiClient.submitDecision posts { decision, comment, deliverableId } to /decision;
  // the server route was /deliverables/:deliverableId/decision with { status, note }.
  router.post(['/projects/:id/decision', '/projects/:id/deliverables/:deliverableId/decision'], async ({ ctx, params, body }) => {
    const raw = body?.decision ?? body?.status;
    const decision = normalizeDecision(raw);
    if (!decision) throw badRequest(`Unknown decision "${raw ?? ''}". Use approve, request_revision or reject.`);
    const project = await requireProject(ctx, params.id);
    const reviewer = body?.reviewer || ACTOR;
    const deliverableId = params.deliverableId ?? body?.deliverableId ?? null;
    const result = await submitDecision(await ctx.vault(), project, {
      decision,
      reviewer,
      role: body?.role || 'Owner',
      comment: body?.comment ?? body?.note ?? '',
      deliverableId
    }, ctx.now());
    ctx.bus.emit('project:decision', { projectId: project.id, decision, reviewer, round: result.approvalRecord.round, deliverableId });
    ctx.bus.emit('project:updated', { projectId: project.id });
    return { success: true, project: await requireProject(ctx, project.id), approvalRecord: result.approvalRecord };
  });

  router.get('/projects/:id/snapshots', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    return { success: true, snapshots: await getSnapshots(await ctx.vault(), project.fullPath) };
  });

  router.get('/projects/:id/snapshots/:snapId', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    const snapshot = await getSnapshotDetails(await ctx.vault(), project.fullPath, params.snapId);
    if (!snapshot) throw notFound('Snapshot not found');
    return { success: true, snapshot };
  });

  router.post(['/projects/:id/snapshot', '/projects/:id/snapshots'], async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const snapshot = await createSnapshot(await ctx.vault(), project.fullPath, {
      trigger: body?.trigger || 'MANUAL_MILESTONE',
      actor: ACTOR,
      note: body?.note
    }, ctx.now());
    return { success: true, snapshot };
  });

  router.post('/projects/:id/rollback', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const snapshotId = String(body?.snapshotId ?? '').trim();
    if (!snapshotId) throw badRequest('snapshotId is required');
    const fs = await ctx.vault();
    if (!(await snapshotExists(fs, project.fullPath, snapshotId))) throw notFound(`Snapshot "${snapshotId}" not found.`);
    const result = await rollback(fs, project.fullPath, snapshotId, ACTOR, ctx.now());
    ctx.bus.emit('project:updated', { projectId: project.id, action: 'rollback', snapshotId, actor: ACTOR });
    return result;
  });

  router.get('/projects/:id/copywriting', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    return { success: true, copywriting: await getCopywriting(await ctx.vault(), project.fullPath, project.title, ctx.now()) };
  });

  // Flat server shape, plus `copywriting` because ApiClient types the reply as { success, copywriting }.
  router.put('/projects/:id/copywriting', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const text = body?.body !== undefined ? body.body : body?.content || '';
    const result = await updateCopywriting(await ctx.vault(), project.fullPath, String(text), ACTOR, ctx.now());
    const copywriting = { filePath: result.filePath, body: result.body, stats: result.stats, lastUpdated: result.lastUpdated, updatedBy: result.updatedBy };
    return { ...result, copywriting };
  });

  router.get('/projects/:id/deliverables', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    const deliverables = await listDeliverables(await ctx.vault(), project.fullPath, (rel) => ctx.fileUrl(rel));
    return { total: deliverables.length, deliverables };
  });

  router.get('/projects/:id/deliverables/:deliverableId', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    const deliverables = await listDeliverables(await ctx.vault(), project.fullPath, (rel) => ctx.fileUrl(rel));
    const deliverable = deliverables.find((d) => d.id === params.deliverableId);
    if (!deliverable) throw notFound('Deliverable not found');
    return { deliverable };
  });
}
