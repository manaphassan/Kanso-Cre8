import { describe, expect, it } from 'vitest';
import { FRESH_MS, PRESENCE_FILE, otherDevice } from '$lib/domain/presence';
import { routeHarness, TEST_NOW } from '../testing';
import { presenceRoutes } from './presence';

const other = (heartbeatAt: Date, id = 'nexus-laptop') =>
  JSON.stringify({ device_id: id, device_label: 'Nexus Laptop', opened_at: heartbeatAt.toISOString(), heartbeat_at: heartbeatAt.toISOString() });

describe('device presence', () => {
  it('writes this computer and reports nobody else on a fresh vault', async () => {
    const { call, fs, ctx } = routeHarness([presenceRoutes]);
    const res = await call('POST', '/system/presence/heartbeat');
    expect(res).toEqual({ success: true, device: 'Studio PC', other: null });
    const written = JSON.parse(await fs.readText(PRESENCE_FILE));
    expect(written).toMatchObject({ device_label: 'Studio PC', heartbeat_at: TEST_NOW.toISOString() });
    expect(written.device_id).toBe(await ctx.machine.get('deviceId'));
    expect((await call('POST', '/system/presence/heartbeat')).other).toBeNull();
  });

  it('warns about another computer with a recent heartbeat, then takes the file over', async () => {
    const { call, fs, ctx } = routeHarness([presenceRoutes], { files: { [PRESENCE_FILE]: other(new Date(TEST_NOW.getTime() - 30_000)) } });
    const res = await call('POST', '/system/presence/heartbeat');
    expect(res.other).toEqual({ label: 'Nexus Laptop', heartbeatAt: new Date(TEST_NOW.getTime() - 30_000).toISOString() });
    expect(JSON.parse(await fs.readText(PRESENCE_FILE)).device_label).toBe('Studio PC');
    // An extra beat that only reads our own record keeps the warning while it is fresh.
    expect((await call('POST', '/system/presence/heartbeat')).other?.label).toBe('Nexus Laptop');
    const later = new Date(TEST_NOW.getTime() + 2 * 60_000);
    ctx.now = () => later;
    expect((await call('POST', '/system/presence/heartbeat')).other).toBeNull();
  });

  it('ignores stale heartbeats, its own id and broken files', async () => {
    const now = TEST_NOW;
    const record = (ms: number, id = 'x') => ({ device_id: id, device_label: 'L', opened_at: '', heartbeat_at: new Date(now.getTime() - ms).toISOString() });
    expect(otherDevice(record(FRESH_MS), 'me', now)).toBeNull();
    expect(otherDevice(record(FRESH_MS - 1), 'me', now)).not.toBeNull();
    expect(otherDevice(record(10, 'me'), 'me', now)).toBeNull();
    const { call } = routeHarness([presenceRoutes], { files: { [PRESENCE_FILE]: '{ not json' } });
    expect((await call('POST', '/system/presence/heartbeat')).other).toBeNull();
  });

  it('uses the saved device label', async () => {
    const { call, ctx } = routeHarness([presenceRoutes]);
    await ctx.machine.set('deviceLabel', 'Acme Studio iMac');
    expect((await call('POST', '/system/presence/heartbeat')).device).toBe('Acme Studio iMac');
  });
});
