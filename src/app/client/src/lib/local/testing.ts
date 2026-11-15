/**
 * Test helpers for local routes: a router over a memory context, optionally
 * seeded with the sample vault.
 */

import { createMemoryContext } from './context';
import { LocalRouter, type RouteModule } from './router';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import { sampleVault } from '$lib/vault/sampleVault';

/** Fixed clock used by route tests: 2026-09-15 09:00 UTC (inside the sample data's month). */
export const TEST_NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));

export function routeHarness(
  modules: RouteModule[],
  options: { sample?: boolean; files?: Record<string, string>; now?: Date } = {}
) {
  const now = options.now ?? TEST_NOW;
  const fs = options.sample ? sampleVault(now) : new MemoryVaultFs(options.files ?? {});
  if (options.sample && options.files) for (const [p, t] of Object.entries(options.files)) fs.put(p, t);
  fs.now = () => now;
  const ctx = createMemoryContext({}, { fs });
  const router = new LocalRouter(ctx).use(...modules);
  const call = async (method: string, path: string, body?: unknown): Promise<any> => {
    const res = await router.handle(method, path, body === undefined ? undefined : JSON.stringify(body));
    if (!res.matched) throw new Error(`unmatched ${method} ${path}`);
    return res.data;
  };
  const events: Array<{ event: string; data: unknown }> = [];
  ctx.bus.on((event, data) => events.push({ event, data }));
  return { ctx, router, call, fs, events };
}
