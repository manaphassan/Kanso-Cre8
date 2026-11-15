import { describe, expect, it } from 'vitest';
import { getClient, listClients } from '$lib/domain/clients';
import { routeHarness } from '../testing';
import { clientRoutes } from './clients';

const LUM_FILE = '_Clients/LUM_LuminaLabs/client.md';

describe('client routes on the sample vault', () => {
  it('lists the three sample clients under both clients and companies keys, ACME first', async () => {
    const { call } = routeHarness([clientRoutes], { sample: true });
    const res = await call('GET', '/clients');
    expect(res.success).toBe(true);
    expect(res.clients.map((c: any) => c.code)).toEqual(['ACME', 'LUM', 'NEX']);
    expect(res.companies).toEqual(res.clients);
    expect(res.clients[0]).toMatchObject({
      code: 'ACME',
      name: 'Acme Corporation',
      id: 'acmecorp',
      contactPerson: 'Sarah Jenkins',
      billingAddress: '100 Market St, Suite 400, San Francisco, CA 94105',
      location: 'San Francisco, CA 94105',
      currency: 'USD',
      defaultHourlyRate: 125,
      paymentTermsDays: 15,
      color: '#0066FF',
      isParent: true,
      status: 'active',
      folderName: 'ACME_AcmeCorp',
      filePath: '_Clients/ACME_AcmeCorp/client.md'
    });
    expect(res.clients[0].palette.accent).toBe('#00F0FF');
    expect(res.clients[0].tags).toEqual(['fintech', 'banking', '3d', 'mobile']);
    expect(res.clients[0].notes).toMatch(/^## Creative Direction/);
    expect(res.clients[1].isParent).toBe(false);
    expect((await call('GET', '/companies')).companies).toHaveLength(3);
  });

  it('gets one client by code in any case, with the company alias, or 404s', async () => {
    const { call } = routeHarness([clientRoutes], { sample: true });
    const res = await call('GET', '/clients/nex');
    expect(res.client.name).toBe('Nexus Studio');
    expect(res.company).toEqual(res.client);
    expect((await call('GET', '/companies/LUM')).company.code).toBe('LUM');
    await expect(call('GET', '/clients/ZZZ')).rejects.toMatchObject({ status: 404, message: 'Client not found' });
  });

  it('updates client.md in place, keeps unknown keys and the body, and emits company:updated', async () => {
    const { call, fs, events } = routeHarness([clientRoutes], { sample: true });
    const res = await call('PUT', '/clients/lum', { name: 'Lumina Labs', location: 'Singapore', defaultHourlyRate: '160', color: '#7C3AED' });
    expect(res.client).toMatchObject({ code: 'LUM', location: 'Singapore', defaultHourlyRate: 160, color: '#7C3AED', folderName: 'LUM_LuminaLabs' });
    expect(res.company).toEqual(res.client);

    const text = await fs.readText(LUM_FILE);
    expect(text).toMatch(/^---\nid: luminalabs\n/);
    expect(text).toContain('location: Singapore');
    expect(text).toContain('default_hourly_rate: 160');
    expect(text).toContain('primary: "#7C3AED"');
    expect(text).toMatch(/updatedAt: "?2026-09-15T09:00:00.000Z"?\n/);
    expect(text).toContain('# Lumina Labs (LUM)');
    expect(text).toContain('`202609_0003P_LUM_BrandIdentity`');
    expect(fs.paths().filter((p) => p.startsWith('_Clients/LUM'))).toEqual(['_Clients/LUM_LuminaLabs', LUM_FILE]);
    expect(events.map((e) => e.event)).toEqual(['company:updated', 'client:updated']);
    expect(events[0].data).toMatchObject({ action: 'updated', client: { code: 'LUM' } });
  });

  it('archives a client folder on delete; it is gone from the list', async () => {
    const { call, fs, events } = routeHarness([clientRoutes], { sample: true });
    const res = await call('DELETE', '/clients/NEX');
    expect(res).toMatchObject({ success: true, deletedCode: 'NEX' });
    expect(res.archivedTo).toMatch(/^_Archive\/.+\/_Clients\/NEX_NexusStudio$/);
    expect(await fs.readText(`${res.archivedTo}/client.md`)).toContain('name: Nexus Studio');
    expect((await call('GET', '/clients')).clients.map((c: any) => c.code)).toEqual(['ACME', 'LUM']);
    expect(events.find((e) => e.event === 'company:updated')?.data).toEqual({ code: 'NEX', action: 'deleted' });
    await expect(call('DELETE', '/clients/NEX')).rejects.toMatchObject({ status: 400, message: 'Company with code "NEX" not found.' });
  });

  it('exports listClients and getClient for finance stamping', async () => {
    const { fs } = routeHarness([clientRoutes], { sample: true });
    expect((await listClients(fs)).length).toBe(3);
    expect(await getClient(fs, 'acme')).toMatchObject({ name: 'Acme Corporation', email: 'sarah.j@acmefintech.io', paymentTermsDays: 15 });
    expect(await getClient(fs, '')).toBeNull();
  });
});

describe('client routes on an empty vault', () => {
  it('lists no clients (no demo fallback) and creates _Clients/<CODE>_<Name>/client.md', async () => {
    const { call, fs } = routeHarness([clientRoutes]);
    const empty = await call('GET', '/clients');
    expect(empty).toEqual({ success: true, clients: [], companies: [] });

    const res = await call('POST', '/clients', {
      code: 'acme',
      name: 'Acme Corp',
      contactPerson: 'Sarah Jenkins',
      email: 'billing@example.com',
      phone: '+1-555-0100',
      billingAddress: '100 Creative Way, Metropolis',
      paymentTermsDays: 30,
      color: '#0066FF'
    });
    expect(res.client).toMatchObject({
      code: 'ACME',
      name: 'Acme Corp',
      contact: '+1-555-0100 / billing@example.com',
      paymentTermsDays: 30,
      defaultHourlyRate: 150,
      color: '#0066FF',
      establishedYear: '2026',
      filePath: '_Clients/ACME_AcmeCorp/client.md'
    });
    const text = await fs.readText('_Clients/ACME_AcmeCorp/client.md');
    expect(text).toContain('code: ACME');
    expect(text).toContain('# Acme Corp (ACME)');
    expect(fs.paths().some((p) => p.includes('companies.json'))).toBe(false);
    expect((await call('GET', '/companies')).companies.map((c: any) => c.code)).toEqual(['ACME']);

    // Saving again reuses the folder even when the name changes.
    await call('POST', '/companies', { code: 'ACME', name: 'Acme Corporation' });
    expect(fs.paths().filter((p) => p.startsWith('_Clients/') && p.endsWith('client.md'))).toEqual(['_Clients/ACME_AcmeCorp/client.md']);
  });

  it('rejects missing fields, bad codes and invalid frontmatter with 400', async () => {
    const { call, fs } = routeHarness([clientRoutes]);
    await expect(call('POST', '/clients', { code: 'NEX' })).rejects.toMatchObject({ status: 400, message: 'Company code and name are required.' });
    await expect(call('POST', '/clients', { code: 'N1', name: 'Nexus Studio' })).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/clients', { code: 'NEXUSS', name: 'Nexus Studio' })).rejects.toThrow(/2 to 5 letters/);
    await expect(call('POST', '/clients', { code: 'NEX', name: 'Nexus Studio', defaultHourlyRate: -5 })).rejects.toThrow(/non-negative/);
    expect(fs.paths()).toEqual([]);
  });
});
