/**
 * Notes routes (P2.2): atomic notes, scratchpad, universal #task rollup and
 * toggle and knowledge graph. Mirrors
 * server/routes/notes.js; response shapes are unchanged.
 */

import { archiveNote, findNote, getScratchpad, listNotes, saveNote, saveScratchpad } from '$lib/domain/notes/atomic';
import { buildGraph } from '$lib/domain/notes/graph';
import { clientsFromScan, resolveCategory } from '$lib/domain/notes/model';

import { collectTasks, isTaskSourcePath, toggleTaskLine } from '$lib/domain/notes/tasks';
import type { LocalContext } from '../context';
import { allProjects } from '../projectIndex';
import { badRequest, notFound, type LocalRouter } from '../router';

/**
 * Note writes run one at a time per context: the notes view saves a note and
 * toggles one of its tasks in the same tick, and both touch the same file.
 */
const queues = new WeakMap<LocalContext, Promise<unknown>>();
function serial<T>(ctx: LocalContext, work: () => Promise<T>): Promise<T> {
  const run = (queues.get(ctx) ?? Promise.resolve()).then(work);
  queues.set(ctx, run.catch(() => undefined));
  return run;
}

/** Errors from the domain become 400s, as the server's catch blocks did. */
async function as400<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err: any) {
    if (typeof err?.status === 'number') throw err;
    throw badRequest(err?.message || String(err));
  }
}

async function loadNotes(ctx: LocalContext) {
  const fs = await ctx.vault();
  const entries = await fs.scan('');
  const clients = clientsFromScan(entries);
  const notes = await listNotes(fs, entries, ctx.now(), clients);
  return { fs, entries, clients, notes };
}

function parseLineIndex(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? undefined : n;
}

function parseCompleted(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

export function notesRoutes(router: LocalRouter): void {
  // Scratchpad (registered before `/notes/:id` so PUT /notes/scratchpad is not a quick note).
  router.get('/notes/scratchpad', async ({ ctx }) => ({ success: true, content: await getScratchpad(await ctx.vault()) }));
  const saveScratch = ({ ctx, body }: { ctx: LocalContext; body: any }) =>
    serial(ctx, () =>
      as400(async () => {
        await saveScratchpad(await ctx.vault(), body?.content || '');
        ctx.bus.emit('notes:scratchpad:saved', { updatedAt: ctx.now().toISOString() });
        return { success: true };
      })
    );
  router.post('/notes/scratchpad', saveScratch);
  router.put('/notes/scratchpad', saveScratch);

  // Atomic notes.
  router.get('/notes/atomic', async ({ ctx, query }) => {
    const { notes } = await loadNotes(ctx);
    const cat = resolveCategory(query.category);
    return { success: true, notes: cat ? notes.filter((n) => resolveCategory(n.type) === cat) : notes };
  });

  router.post('/notes/atomic', ({ ctx, body }) =>
    serial(ctx, () =>
      as400(async () => {
        const note = await saveNote(await ctx.vault(), body, ctx.now());
        ctx.bus.emit('notes:atomic:saved', { note });
        return { success: true, note };
      })
    )
  );

  router.get(['/notes/atomic/:category/:id', '/notes/atomic/:id'], async ({ ctx, params }) => {
    const { notes } = await loadNotes(ctx);
    const note = findNote(notes, params.category ? resolveCategory(params.category) : null, params.id, true);
    if (!note) throw notFound('Note not found on disk.');
    return { success: true, note };
  });

  router.delete(['/notes/atomic/:category/:id', '/notes/atomic/:id'], ({ ctx, params }) =>
    serial(ctx, async () => {
      const archived = await archiveNote(await ctx.vault(), params.category ? resolveCategory(params.category) : null, params.id, ctx.now());
      if (!archived) throw notFound('Note not found to delete.');
      ctx.bus.emit('notes:atomic:deleted', { id: params.id, category: params.category });
      return { success: true, deleted: true };
    })
  );

  // Universal task rollup across notes, journal and project folders.
  router.get('/notes/tasks', async ({ ctx }) => {
    const { fs, entries, notes } = await loadNotes(ctx);
    return { success: true, tasks: await collectTasks(fs, entries, notes, await allProjects(ctx)) };
  });

  router.post('/notes/tasks/toggle', ({ ctx, body }) =>
    serial(ctx, () =>
      as400(async () => {
        const b = body || {};
        const noteId = b.noteId ?? b.sourceNoteId;
        const description: string | undefined = b.taskDescription ?? b.description ?? b.text;
        const lineIndex = parseLineIndex(b.lineIndex);
        const completed = parseCompleted(b.completed);
        const explicit: string | undefined = b.sourceFile || b.filepath;
        if (lineIndex === undefined && (!(noteId || explicit) || !description)) {
          throw badRequest('noteId and taskDescription are required.');
        }

        let path: string;
        if (explicit || (typeof noteId === 'string' && noteId.includes('/'))) {
          path = String(explicit || noteId);
          if (!isTaskSourcePath(path)) throw badRequest(`"${path}" is not a note, journal or project file.`);
        } else {
          const { notes } = await loadNotes(ctx);
          const category = b.category || 'permanent';
          const note = findNote(notes, resolveCategory(category), String(noteId), true) ?? findNote(notes, null, String(noteId), true);
          if (!note) throw badRequest(`Note "${noteId}" not found in category "${category}".`);
          path = note.filepath;
        }

        const fs = await ctx.vault();
        const outcome = await toggleTaskLine(fs, { path, lineIndex, description, completed });
        const text = description ?? outcome.line.replace(/^.*?- \[[ xX]\]\s*(?:#task)?\s*/, '');
        const id = noteId ?? path;
        const result = {
          success: true,
          noteId: id,
          taskDescription: text,
          completed: outcome.completed,
          sourceFile: path,
          lineIndex: outcome.lineIndex,
          task: { id: `${id}_task`, sourceNoteId: id, text, description: text, completed: outcome.completed }
        };
        ctx.bus.emit('notes:task:toggled', { result });
        if (outcome.changed && path.startsWith('_Projects/')) {
          const project = (await allProjects(ctx)).find((p) => path.startsWith(`${p.fullPath}/`));
          ctx.bus.emit('project:updated', { projectId: project?.id ?? null, action: 'task_toggled' });
        }
        return result;
      })
    )
  );

  router.get('/notes/graph', async ({ ctx }) => {
    const { clients, notes } = await loadNotes(ctx);
    return { success: true, graph: buildGraph(notes, clients, await allProjects(ctx)) };
  });
}
