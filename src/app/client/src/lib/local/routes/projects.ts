/**
 * Project read and edit routes (P2.5 core). Mirrors server/routes/projects.js
 * and the comment routes in deliverables.js.
 */

import { listDeliverables } from '$lib/domain/deliverables';
import { writeReadme } from '$lib/domain/projects';
import { addComment, deleteComment, getComments, resolveComment } from '$lib/domain/review';
import { allProjects, listProjects, requireProject } from '../projectIndex';
import { badRequest, type LocalRouter } from '../router';

const ACTOR = 'Studio Owner';

export function projectRoutes(router: LocalRouter): void {
  router.get('/projects', async ({ ctx, query }) => {
    const projects = await listProjects(ctx, query);
    return { total: projects.length, projects };
  });

  router.get('/projects/:id', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    const fs = await ctx.vault();
    return {
      project,
      deliverables: await listDeliverables(fs, project.fullPath, (rel) => ctx.fileUrl(rel)),
      auditLogs: [], // audit log dropped (D2)
      comments: await getComments(fs, project.fullPath, project.jobId || project.id)
    };
  });

  /** All deliverables across projects (the client calls GET /deliverables). */
  router.get('/deliverables', async ({ ctx }) => {
    const fs = await ctx.vault();
    const deliverables = [];
    for (const p of await allProjects(ctx)) {
      for (const d of await listDeliverables(fs, p.fullPath, (rel) => ctx.fileUrl(rel))) {
        deliverables.push({ ...d, projectId: p.id, projectTitle: p.title, brand: p.brand });
      }
    }
    return { deliverables, count: deliverables.length };
  });

  router.put('/projects/:id', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const { frontmatter, status, priority, manager, designer, department, brand, deadline, body: text, expectedHash } = body || {};
    const update: Record<string, any> = { ...(frontmatter || {}) };
    if (status) update.status = status;
    if (priority) update.priority = priority;
    for (const [k, v] of Object.entries({ manager, designer, department, brand, deadline })) if (v !== undefined) update[k] = v;
    const result = await writeReadme(await ctx.vault(), project.fullPath, update, text ?? null, expectedHash || null);
    ctx.bus.emit('project:updated', { projectId: params.id, manager: result.frontmatter.manager, status: result.frontmatter.status, priority: result.frontmatter.priority });
    return { success: true, project: await requireProject(ctx, params.id), versionHash: result.versionHash };
  });

  router.put('/projects/:id/brief', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const brief = body?.briefMarkdown ?? body?.readmeBody ?? body?.body ?? '';
    const result = await writeReadme(await ctx.vault(), project.fullPath, {}, String(brief), body?.expectedHash || null);
    ctx.bus.emit('project:updated', { projectId: params.id });
    return { success: true, versionHash: result.versionHash };
  });

  router.put('/projects/:id/direction', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const d = body || {};
    const creative_direction = {
      ...(project.creativeDirection || {}),
      visual_concept: d.visual_concept || '',
      color_palette: d.color_palette || '',
      target_audience: d.target_audience || '',
      ...(d.aspect_ratio !== undefined ? { aspect_ratio: d.aspect_ratio } : {}),
      ...(d.mood_keywords !== undefined ? { mood_keywords: d.mood_keywords } : {}),
      ...(d.reference_links !== undefined ? { reference_links: d.reference_links } : {}),
      updatedBy: ACTOR,
      updatedAt: ctx.now().toISOString()
    };
    await writeReadme(await ctx.vault(), project.fullPath, { creative_direction });
    ctx.bus.emit('project:updated', { projectId: params.id, creativeDirection: creative_direction });
    return { success: true, creativeDirection: creative_direction };
  });

  router.post('/projects/:id/reassign', async ({ ctx, params, body }) => {
    const designer = String(body?.newDesigner || '').trim();
    if (!designer) throw badRequest('newDesigner name is required');
    const project = await requireProject(ctx, params.id);
    await writeReadme(await ctx.vault(), project.fullPath, { designer });
    ctx.bus.emit('project:updated', { projectId: project.id, action: 'reassigned', designer, actor: ACTOR });
    return { success: true, designer, message: `Project reassigned to ${designer}` };
  });

  router.get('/projects/:id/comments', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    return { comments: await getComments(await ctx.vault(), project.fullPath, project.jobId || project.id) };
  });

  router.post('/projects/:id/comments', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const content = String(body?.content ?? body?.text ?? '');
    if (!content.trim()) throw badRequest('Comment text is required');
    const comment = await addComment(await ctx.vault(), project.fullPath, project.jobId || project.id, {
      content,
      author: body?.authorName || ACTOR,
      authorRole: body?.authorRole || 'Owner',
      deliverableId: body?.deliverableId ?? null,
      annotation: body?.annotation ?? body?.metadata ?? null,
      mentions: body?.mentions
    }, ctx.now());
    ctx.bus.emit('comment:added', { projectId: project.id, comment });
    return { success: true, comment };
  });

  router.put('/projects/:id/comments/:commentId/resolve', async ({ ctx, params, body }) => {
    const project = await requireProject(ctx, params.id);
    const result = await resolveComment(await ctx.vault(), project.fullPath, project.jobId || project.id, params.commentId, body?.resolved !== false, ACTOR, ctx.now());
    ctx.bus.emit('comment:resolved', { projectId: project.id, ...result });
    return result;
  });

  router.delete('/projects/:id/comments/:commentId', async ({ ctx, params }) => {
    const project = await requireProject(ctx, params.id);
    const result = await deleteComment(await ctx.vault(), project.fullPath, project.jobId || project.id, params.commentId);
    return { ...result, deleted: true };
  });
}
