/**
 * Cached project index per context. Rebuilt from one `vault_scan` when the
 * vault changes (watcher, mount, or any route emitting a workspace/project event).
 */

import { filterProjects, findProject, indexProjects, refreshProject, type Project, type ProjectFilters } from '$lib/domain/projects';
import type { LocalContext } from './context';
import { notFound } from './router';

interface Cache {
  projects: Project[] | null;
  scannedAt: Date | null;
}

const caches = new WeakMap<LocalContext, Cache>();
const STALE_EVENTS = new Set(['workspace:updated', 'project:updated', 'project:decision']);

function cacheFor(ctx: LocalContext): Cache {
  let cache = caches.get(ctx);
  if (!cache) {
    const fresh: Cache = { projects: null, scannedAt: null };
    ctx.bus.on((event) => {
      if (STALE_EVENTS.has(event)) fresh.projects = null;
    });
    caches.set(ctx, fresh);
    cache = fresh;
  }
  return cache;
}

export function invalidateProjects(ctx: LocalContext): void {
  cacheFor(ctx).projects = null;
}

export async function allProjects(ctx: LocalContext): Promise<Project[]> {
  const cache = cacheFor(ctx);
  if (!cache.projects) {
    const fs = await ctx.vault();
    cache.projects = await indexProjects(await fs.scan(''), ctx.now());
    cache.scannedAt = ctx.now();
  }
  return cache.projects;
}

export async function listProjects(ctx: LocalContext, filters: ProjectFilters = {}): Promise<Project[]> {
  return filterProjects(await allProjects(ctx), filters);
}

export function lastScan(ctx: LocalContext): Date | null {
  return cacheFor(ctx).scannedAt;
}

/** The project with a freshly read README, or a 404. */
export async function requireProject(ctx: LocalContext, id: string): Promise<Project> {
  const project = findProject(await allProjects(ctx), id);
  if (!project) throw notFound('Project not found');
  return refreshProject(await ctx.vault(), project, ctx.now());
}
