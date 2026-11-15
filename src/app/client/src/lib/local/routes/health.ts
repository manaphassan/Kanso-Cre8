/**
 * Local routes for vault health, sync conflicts, demo data and the
 * archive-first reset (P2.9). Mirrors server/routes/system.js and vault.js
 * for these endpoints. POST /system/vault-health/repair lives in system.ts.
 */

import { clearDemoData, demoStatus, DemoSource, loadDemoData } from '$lib/domain/health/demoData';
import { resetVaultStructure, vaultFolderName } from '$lib/domain/health/reset';
import { cleanAllSyncConflicts, resolveSyncConflict, scanSyncConflicts } from '$lib/domain/health/syncConflicts';
import { emptyHealthReport, vaultHealthReport } from '$lib/domain/health/vaultHealth';
import { sampleVault } from '$lib/vault/sampleVault';
import type { LocalContext } from '../context';
import { badRequest, type LocalRouter } from '../router';

const demoSource = (ctx: LocalContext) => DemoSource.from(sampleVault(ctx.now()));

/** Accepts the vault-relative path, or an absolute path inside the open vault (older clients). */
function toVaultRelative(path: unknown, root: string | null): string {
  const raw = typeof path === 'string' ? path.trim() : '';
  if (!raw || !root) return raw;
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const abs = norm(raw);
  const base = norm(root);
  return abs.toLowerCase().startsWith(`${base.toLowerCase()}/`) ? abs.slice(base.length + 1) : raw;
}

async function asBadRequest<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err: any) {
    throw badRequest(err?.message || String(err));
  }
}

export function healthRoutes(router: LocalRouter): void {
  router.get('/system/vault-health', async ({ ctx }) => {
    const root = (await ctx.vaultRoot()) ?? '';
    let fs;
    try {
      fs = await ctx.vault();
    } catch {
      return { success: true, report: emptyHealthReport(root, ctx.now()) };
    }
    return { success: true, report: await vaultHealthReport(fs, root, ctx.now()) };
  });

  router.post('/system/vault-health/clean-conflicts', async ({ ctx, body }) => {
    const fs = await ctx.vault();
    const result = await asBadRequest(() => cleanAllSyncConflicts(fs, body?.resolution || 'keep_local'));
    if (result.resolvedCount > 0) ctx.bus.emit('workspace:updated', { reason: 'conflicts_cleaned' });
    return result;
  });

  router.get('/system/sync-conflicts', async ({ ctx }) => {
    const conflicts = await scanSyncConflicts(await ctx.vault());
    return { success: true, count: conflicts.length, conflicts };
  });

  router.post('/system/sync-conflicts/resolve', async ({ ctx, body }) => {
    const fs = await ctx.vault();
    const conflictPath = toVaultRelative(body?.conflictPath, await ctx.vaultRoot());
    const result = await asBadRequest(() => resolveSyncConflict(fs, conflictPath, body?.resolution || 'keep_local'));
    ctx.bus.emit('workspace:updated', { reason: 'conflict_resolved' });
    return result;
  });

  router.get('/system/demo-data', async ({ ctx }) => {
    const fs = await ctx.vault();
    return { success: true, workspaceRoot: (await ctx.vaultRoot()) ?? '', ...(await demoStatus(fs, await demoSource(ctx))) };
  });

  router.post('/system/demo-data/load', async ({ ctx }) => {
    const result = await loadDemoData(await ctx.vault(), await demoSource(ctx));
    ctx.bus.emit('workspace:updated', { reason: 'demo_data_loaded' });
    return { success: true, ...result };
  });

  router.post('/system/demo-data/clear', async ({ ctx, body }) => {
    const fs = await ctx.vault();
    const expected = vaultFolderName(await ctx.vaultRoot());
    if (!body || !expected || body.confirm !== expected) {
      throw badRequest(`Confirmation failed. Type the vault folder name "${expected}" to proceed.`);
    }
    const source = await demoSource(ctx);
    const result = await clearDemoData(fs, source);
    ctx.bus.emit('workspace:updated', { reason: 'demo_data_cleared' });
    return { success: true, ...result, ...(await demoStatus(fs, source)) };
  });

  router.post('/system/vault/reset', async ({ ctx, body }) => {
    const fs = await ctx.vault();
    const root = (await ctx.vaultRoot()) ?? '';
    const result = await asBadRequest(() =>
      resetVaultStructure(fs, root, body?.confirmationName || body?.confirm || '', ctx.now())
    );
    ctx.bus.emit('workspace:updated', { reason: 'vault_reset', root });
    return result;
  });
}
