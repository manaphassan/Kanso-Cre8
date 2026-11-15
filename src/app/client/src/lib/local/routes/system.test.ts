import { describe, expect, it } from 'vitest';
import { createMemoryContext } from '../context';
import { LocalRouter } from '../router';
import { MACHINE_RECENT_KEY, MACHINE_ROOT_KEY, systemRoutes } from './system';

function setup(...args: Parameters<typeof createMemoryContext>) {
  const ctx = createMemoryContext(...args);
  const router = new LocalRouter(ctx).use(systemRoutes);
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await router.handle(method, path, body === undefined ? undefined : JSON.stringify(body));
    if (!res.matched) throw new Error(`unmatched ${method} ${path}`);
    return res.data as any;
  };
  return { ctx, call };
}

describe('vault status and mount', () => {
  it('asks for a folder when none is set', async () => {
    const { call } = setup({}, { root: null });
    expect(await call('GET', '/system/vault-status')).toMatchObject({ ok: false, status: 'missing_root', root: '' });
  });

  it('reports a missing remembered folder with its path', async () => {
    const { ctx, call } = setup({}, { root: null });
    await ctx.machine.set(MACHINE_ROOT_KEY, 'E:/Gone');
    expect(await call('GET', '/system/vault-status')).toMatchObject({ ok: false, status: 'missing_root', root: 'E:/Gone' });
  });

  it('mounts, repairs the layout, migrates config and remembers the folder', async () => {
    const { ctx, call } = setup({ '_Team/_Config/user_passwords.json': '{}' }, { root: null, existing: ['D:/Studio'] });
    ctx.fs.now = () => new Date(Date.UTC(2026, 10, 14));
    const events: string[] = [];
    ctx.bus.on((e) => events.push(e));

    const res = await call('POST', '/system/workspace-root', { workspacePath: ' D:/Studio ', autoCreate: false });
    expect(res).toMatchObject({ success: true, workspaceRoot: 'D:/Studio', cachedProjects: 0 });
    expect(ctx.fs.paths()).toEqual(expect.arrayContaining(['_Clients', '_Finance/Quotes', '_Projects/2026', '_Team/_Config', '_Notes/Scratchpad.md']));
    expect(ctx.retired).toEqual(['_Team/_Config/user_passwords.json']);
    expect(await ctx.machine.get(MACHINE_ROOT_KEY)).toBe('D:/Studio');
    expect(await ctx.machine.get(MACHINE_RECENT_KEY)).toEqual(['D:/Studio']);
    expect(events).toContain('workspace:updated');

    expect(await call('GET', '/system/vault-status')).toMatchObject({ ok: true, status: 'ok', root: 'D:/Studio', repaired: [] });
  });

  it('creates the folder only when asked', async () => {
    const { call } = setup({}, { root: null });
    await expect(call('POST', '/system/workspace-root', { workspacePath: 'E:/New' })).rejects.toThrow(/not found/);
    expect(await call('POST', '/system/workspace-root', { workspacePath: 'E:/New', autoCreate: true })).toMatchObject({ success: true });
    await expect(call('POST', '/system/workspace-root', { workspacePath: '  ' })).rejects.toThrow(/required/);
  });

  it('reopens the remembered vault on first use', async () => {
    const { ctx, call } = setup({}, { root: null, existing: ['D:/Studio'] });
    await ctx.machine.set(MACHINE_ROOT_KEY, 'D:/Studio');
    expect(await call('GET', '/system/health')).toMatchObject({ success: true, workspaceRoot: 'D:/Studio', workspaceExists: true });
    expect(ctx.opened).toEqual(['D:/Studio']);
  });

  it('lists the current and recent vaults as candidates', async () => {
    const { ctx, call } = setup({}, { root: null, existing: ['D:/A', 'D:/B'] });
    await call('POST', '/system/workspace-root', { workspacePath: 'D:/A' });
    await call('POST', '/system/workspace-root', { workspacePath: 'D:/B' });
    const res = await call('GET', '/system/workspace-candidates');
    expect(res.current).toBe('D:/B');
    expect(res.candidates.map((c: any) => [c.path, c.isCurrent])).toEqual([['D:/B', true], ['D:/A', false]]);
    expect(await ctx.machine.get(MACHINE_RECENT_KEY)).toEqual(['D:/B', 'D:/A']);
  });
});

describe('vault config routes', () => {
  it('reads and saves the studio profile with UI aliases', async () => {
    const { ctx, call } = setup();
    const got = await call('GET', '/system/studio-profile');
    expect(got.profile).toMatchObject({ studioName: 'Acme Design Studio', principalName: 'Alex Mercer' });
    const saved = await call('PUT', '/system/studio-profile', { ...got.profile, studioName: 'Nexus Studio' });
    expect(saved.profile.studioName).toBe('Nexus Studio');
    expect(JSON.parse(await ctx.fs.readText('_Team/_Config/studio_profile.json'))).not.toHaveProperty('principalName');
  });

  it('stores licence state without verifying it', async () => {
    const { call } = setup();
    expect(await call('GET', '/system/license')).toMatchObject({ success: true, license: null });
    await call('PUT', '/system/license', { licenseKey: 'KANSO-PRO-X' });
    expect(await call('GET', '/system/license')).toMatchObject({ license: 'KANSO-PRO-X', status: { isPro: true } });
    await call('POST', '/system/license/deactivate');
    expect(await call('GET', '/system/license')).toMatchObject({ license: null });
  });

  it('repairs a damaged layout on request', async () => {
    const { ctx, call } = setup({ '_Notes/Scratchpad.md': '# mine' });
    const res = await call('POST', '/system/vault-health/repair');
    expect(res.success).toBe(true);
    expect(res.createdFiles).toEqual([]);
    expect(await ctx.fs.readText('_Notes/Scratchpad.md')).toBe('# mine');
  });

  it('fails clearly when no vault is open', async () => {
    const { call } = setup({}, { root: null });
    await expect(call('GET', '/system/studio-profile')).rejects.toThrow(/No vault is open/);
  });
});
