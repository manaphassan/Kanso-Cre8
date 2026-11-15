import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { healthRoutes } from './health';

const BASE = '_Notes/01_Fleeting/client_intake_call_sarah_jenkins_acme.md';
const COPY = "_Notes/01_Fleeting/client_intake_call_sarah_jenkins_acme (Alex's conflicted copy 2026-09-15).md";

describe('health routes', () => {
  it('returns the vault health report with the display root', async () => {
    const { call } = routeHarness([healthRoutes], { sample: true, files: { [COPY]: '# Remote edit\n' } });
    const res = await call('GET', '/system/vault-health');
    expect(res.success).toBe(true);
    expect(res.report).toMatchObject({ vaultExists: true, workspaceRoot: 'D:/Vault', lastScannedAt: '2026-09-15T09:00:00.000Z' });
    expect(res.report.compartments).toHaveLength(6);
    expect(res.report.syncConflicts.map((c: any) => c.relPath)).toEqual([COPY]);
    expect(res.report.storageSummary.formattedTotalSize).toMatch(/KB$/);
  });

  it('reports a critical empty report when no vault is open', async () => {
    const { call, ctx } = routeHarness([healthRoutes]);
    ctx.vault = async () => {
      throw new Error('No vault is open.');
    };
    const res = await call('GET', '/system/vault-health');
    expect(res.report).toMatchObject({ vaultExists: false, status: 'critical', compartments: [] });
  });

  it('lists and resolves sync conflicts with vault-relative paths', async () => {
    const { call, fs, events } = routeHarness([healthRoutes], { sample: true, files: { [COPY]: '# Remote edit\n' } });
    const listed = await call('GET', '/system/sync-conflicts');
    expect(listed).toMatchObject({ success: true, count: 1 });
    expect(listed.conflicts[0]).toMatchObject({ conflictPath: COPY, baseRelPath: BASE, baseExists: true });

    const res = await call('POST', '/system/sync-conflicts/resolve', { conflictPath: COPY, resolution: 'keep_cloud' });
    expect(res).toMatchObject({ success: true, message: 'Sync conflict resolved via keep_cloud', conflictPath: COPY });
    expect(await fs.readText(BASE)).toBe('# Remote edit\n');
    expect(await fs.readText(res.archivedTo)).toBe('# Remote edit\n');
    expect(events).toContainEqual({ event: 'workspace:updated', data: { reason: 'conflict_resolved' } });
    expect((await call('GET', '/system/sync-conflicts')).count).toBe(0);
  });

  it('accepts an absolute conflict path inside the vault and rejects bad requests', async () => {
    const { call, fs } = routeHarness([healthRoutes], { sample: true, files: { [COPY]: 'x' } });
    await expect(call('POST', '/system/sync-conflicts/resolve', { conflictPath: COPY, resolution: 'delete' })).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/system/sync-conflicts/resolve', { conflictPath: '_Notes/nope (conflicted copy).md' })).rejects.toMatchObject({ status: 400 });
    const res = await call('POST', '/system/sync-conflicts/resolve', { conflictPath: `D:\\Vault\\${COPY.replace(/\//g, '\\')}` });
    expect(res.resolution).toBe('keep_local');
    expect(fs.paths()).not.toContain(COPY);
  });

  it('cleans all conflicted copies (keep_local)', async () => {
    const { call, fs, events } = routeHarness([healthRoutes], { sample: true, files: { [COPY]: 'x' } });
    const res = await call('POST', '/system/vault-health/clean-conflicts', { resolution: 'keep_local' });
    expect(res).toMatchObject({ success: true, resolvedCount: 1, totalCount: 1 });
    expect(fs.paths()).not.toContain(COPY);
    expect(fs.paths()).toContain(BASE);
    expect(events.map((e) => e.event)).toContain('workspace:updated');
  });

  it('loads and clears demo data with typed confirmation', async () => {
    const { call, fs, events } = routeHarness([healthRoutes]);
    const before = await call('GET', '/system/demo-data');
    expect(before).toMatchObject({ success: true, workspaceRoot: 'D:/Vault', enabled: false, present: false, totalFiles: 0 });

    const loaded = await call('POST', '/system/demo-data/load');
    expect(loaded).toMatchObject({ success: true, enabled: true, present: true });
    expect(loaded.counts.client).toBe(3);
    expect(events).toContainEqual({ event: 'workspace:updated', data: { reason: 'demo_data_loaded' } });
    expect(await fs.readText('_Clients/LUM_LuminaLabs/client.md')).toMatch(/LUM/);

    await expect(call('POST', '/system/demo-data/clear', { confirm: 'vault' })).rejects.toMatchObject({
      status: 400,
      message: 'Confirmation failed. Type the vault folder name "Vault" to proceed.'
    });
    const cleared = await call('POST', '/system/demo-data/clear', { confirm: 'Vault' });
    expect(cleared).toMatchObject({ success: true, enabled: false, present: false, skipped: [] });
    expect(cleared.removed.length).toBe(loaded.items.length);
    expect(fs.paths().filter((p) => p.startsWith('_Clients/'))).toEqual([]);
    expect(events).toContainEqual({ event: 'workspace:updated', data: { reason: 'demo_data_cleared' } });
  });

  it('resets the vault structure archive-first', async () => {
    const { call, fs, events } = routeHarness([healthRoutes], { sample: true });
    await expect(call('POST', '/system/vault/reset', { confirmationName: 'Other' })).rejects.toMatchObject({ status: 400 });
    expect(fs.paths()).toContain('_Clients/ACME_AcmeCorp/client.md');

    const res = await call('POST', '/system/vault/reset', { confirmationName: 'Vault' });
    expect(res).toMatchObject({ success: true, root: 'D:/Vault', archivePath: '_Archive/20260915-090000' });
    expect(fs.paths()).toContain('_Archive/20260915-090000/_Clients/ACME_AcmeCorp/client.md');
    expect(fs.paths()).toContain('_Archive/20260915-090000/_Team/_Config/studio_profile.json');
    expect(fs.paths()).not.toContain('_Clients/ACME_AcmeCorp');
    expect(fs.paths()).toEqual(expect.arrayContaining(['_Projects/2026', '_Notes/Scratchpad.md']));
    expect(events).toContainEqual({ event: 'workspace:updated', data: { reason: 'vault_reset', root: 'D:/Vault' } });

    // The server also accepted `confirm`.
    expect((await call('POST', '/system/vault/reset', { confirm: 'vault' })).success).toBe(true);
  });
});
