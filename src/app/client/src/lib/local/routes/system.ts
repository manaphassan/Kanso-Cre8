/**
 * Local routes for system status, the vault mount and vault config (P2.1).
 * Mirrors server/routes/system.js and vault.js for these endpoints; response
 * shapes are unchanged so views keep working.
 */

import {
  getLicenseState,
  getPreferences,
  getStudioProfile,
  migrateVaultConfig,
  saveLicenseState,
  savePreferences,
  saveStudioProfile,
  DEFAULT_LICENSE
} from '$lib/domain/config';
import { countProjects, ensureVaultStructure } from '$lib/domain/vaultLayout';
import { VaultOpenError, type LocalContext } from '../context';
import { badRequest, type LocalRouter } from '../router';

export const MACHINE_ROOT_KEY = 'workspaceRoot';
export const MACHINE_RECENT_KEY = 'recentVaults';
const MAX_RECENT = 8;

/** Opens the folder, repairs the layout, migrates config and remembers it. */
export async function mountVault(ctx: LocalContext, path: string, create: boolean) {
  const opened = await ctx.openVault(path, create);
  const fs = await ctx.vault();
  const structure = await ensureVaultStructure(fs, ctx.now());
  const migration = await migrateVaultConfig(fs);
  if (migration.retire.length) {
    try {
      await ctx.retireFiles(migration.retire);
    } catch (err: any) {
      migration.errors.push(err.message);
    }
  }
  // Store what the user gave us: in portable mode this may be relative.
  await ctx.machine.set(MACHINE_ROOT_KEY, path.trim());
  const recent = ((await ctx.machine.get<string[]>(MACHINE_RECENT_KEY)) ?? []).filter((p) => p !== path.trim());
  await ctx.machine.set(MACHINE_RECENT_KEY, [path.trim(), ...recent].slice(0, MAX_RECENT));
  ctx.bus.emit('workspace:updated', { workspaceRoot: opened.root, timestamp: ctx.now().toISOString() });
  return { opened, structure, migration };
}

/** Opens the remembered vault on first use. Returns null when none is set. */
export async function ensureMounted(ctx: LocalContext): Promise<string | null> {
  const current = await ctx.vaultRoot();
  if (current) return current;
  const saved = await ctx.machine.get<string>(MACHINE_ROOT_KEY);
  if (!saved) return null;
  await mountVault(ctx, saved, false);
  return ctx.vaultRoot();
}

async function vaultStatus(ctx: LocalContext) {
  const saved = (await ctx.machine.get<string>(MACHINE_ROOT_KEY)) ?? '';
  try {
    const root = await ensureMounted(ctx);
    if (!root) {
      return {
        ok: false, status: 'missing_root', reason: 'missing_root',
        message: 'Choose a folder for your vault.', root: '', repaired: [], errors: ['No vault folder is set.']
      };
    }
    const repair = await ensureVaultStructure(await ctx.vault(), ctx.now());
    const repaired = [...repair.createdDirs, ...repair.createdFiles];
    if (repair.errors.length) {
      return { ok: false, status: 'repair_failed', reason: 'repair_failed', message: repair.errors[0], root, repaired, errors: repair.errors };
    }
    if (repaired.length) ctx.bus.emit('workspace:updated', { reason: 'vault_repaired' });
    return { ok: true, status: 'ok', root, repaired, errors: [] };
  } catch (err: any) {
    const code = err instanceof VaultOpenError || err?.code ? String(err.code) : 'repair_failed';
    const status = code === 'not_writable' ? 'not_writable' : code === 'repair_failed' ? 'repair_failed' : 'missing_root';
    return { ok: false, status, reason: status, message: err.message, root: saved, repaired: [], errors: [err.message] };
  }
}

async function health(ctx: LocalContext) {
  const root = await ensureMounted(ctx).catch(() => null);
  const cachedProjects = root ? await countProjects(await ctx.vault()).catch(() => 0) : 0;
  return {
    success: true,
    app: 'Kanso Cre8 - The Mindful Creative Vault',
    version: ctx.version,
    workspaceRoot: root ?? ((await ctx.machine.get<string>(MACHINE_ROOT_KEY)) || ''),
    workspaceExists: Boolean(root),
    cachedProjects,
    lastScan: ctx.now().toISOString(),
    platform: ctx.platform
  };
}

export function systemRoutes(router: LocalRouter): void {
  router.get('/status', ({ ctx }) => ({ success: true, name: 'Kanso Cre8', version: ctx.version, platform: ctx.platform }));
  router.get(['/system/health', '/system/status'], ({ ctx }) => health(ctx));
  router.get('/system/vault-status', ({ ctx }) => vaultStatus(ctx));

  router.post('/system/workspace-root', async ({ ctx, body }) => {
    const path = typeof body?.workspacePath === 'string' ? body.workspacePath.trim() : '';
    if (!path) throw badRequest('Valid workspace path is required.');
    const { opened } = await mountVault(ctx, path, body?.autoCreate === true || body?.autoCreate === 'true');
    return {
      success: true,
      message: 'Vault folder connected.',
      workspaceRoot: opened.root,
      cachedProjects: await countProjects(await ctx.vault()).catch(() => 0),
      lastScan: ctx.now().toISOString()
    };
  });

  router.get('/system/workspace-candidates', async ({ ctx }) => {
    const current = (await ctx.vaultRoot()) ?? '';
    const recent = (await ctx.machine.get<string[]>(MACHINE_RECENT_KEY)) ?? [];
    const saved = await ctx.machine.get<string>(MACHINE_ROOT_KEY);
    const paths = [...new Set([...(current ? [current] : []), ...(saved ? [saved] : []), ...recent])];
    return {
      success: true,
      current,
      candidates: paths.map((p) => ({
        path: p,
        // Folders other than the open one are checked when the user picks them.
        accessible: true,
        exists: true,
        isCurrent: p === current || p === saved
      }))
    };
  });

  router.post('/system/vault-health/repair', async ({ ctx }) => {
    const result = await ensureVaultStructure(await ctx.vault(), ctx.now());
    if (result.createdDirs.length || result.createdFiles.length) ctx.bus.emit('workspace:updated', { reason: 'vault_repaired' });
    return { success: result.errors.length === 0, root: (await ctx.vaultRoot()) ?? '', ...result };
  });

  router.get('/system/studio-profile', async ({ ctx }) => ({ success: true, profile: await getStudioProfile(await ctx.vault()) }));
  router.put('/system/studio-profile', async ({ ctx, body }) => {
    const profile = await saveStudioProfile(await ctx.vault(), body && typeof body === 'object' ? body : {});
    ctx.bus.emit('studio:updated', { profile });
    return { success: true, profile };
  });

  router.get('/system/preferences', async ({ ctx }) => ({ success: true, preferences: await getPreferences(await ctx.vault()) }));
  router.put('/system/preferences', async ({ ctx, body }) => ({
    success: true,
    preferences: await savePreferences(await ctx.vault(), body && typeof body === 'object' ? body : {})
  }));

  // Licence state only. Verification moves to Rust in MASTER_PLAN P6.1 (D3).
  router.get('/system/license', async ({ ctx }) => {
    const state = await getLicenseState(await ctx.vault());
    const key = state.licenseKey ? String(state.licenseKey).trim() : null;
    return {
      success: true,
      license: key,
      status: { valid: Boolean(key && state.active), tier: key ? state.tier : 'zen', status: key ? 'valid' : 'unlicensed', isPro: Boolean(key && state.tier === 'pro') }
    };
  });
  router.put('/system/license', async ({ ctx, body }) => {
    const key = typeof body?.licenseKey === 'string' ? body.licenseKey.trim() : '';
    if (!key) {
      await saveLicenseState(await ctx.vault(), { ...DEFAULT_LICENSE, active: false, tier: 'zen' });
      return { success: true, message: 'License removed.', license: null };
    }
    await saveLicenseState(await ctx.vault(), { active: true, tier: 'pro', licenseKey: key });
    return { success: true, message: 'License saved.', license: key };
  });
  router.post('/system/license/deactivate', async ({ ctx }) => {
    await saveLicenseState(await ctx.vault(), { ...DEFAULT_LICENSE, active: false, tier: 'zen', issuedTo: 'Solo Creator' });
    return { success: true, message: 'License deactivated.', status: { valid: false, tier: 'zen', status: 'unlicensed', isPro: false } };
  });
}
