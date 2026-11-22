import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { clientRoutes } from './clients';
import { exportRoutes } from './export';
import { financeRoutes } from './finance';
import { timerRoutes } from './timer';
import { FREE_CLIENT_LIMIT } from '../plan';

const zen = () => {
  const h = routeHarness([clientRoutes, financeRoutes, timerRoutes, exportRoutes], { sample: true });
  h.ctx.tier = 'zen';
  return h;
};
const PRO = { status: 402, message: expect.stringContaining('needs Kanso Studio Pro') };

describe('free Kanso Zen tier', () => {
  it('keeps the sample clients editable but refuses a client beyond the limit', async () => {
    const { call } = zen();
    const { clients } = await call('GET', '/clients');
    expect(clients).toHaveLength(FREE_CLIENT_LIMIT);
    await call('PUT', '/clients/ACME', { ...clients[0], notes: 'Edited on the free tier' });
    await expect(call('POST', '/clients', { code: 'NEWCO', name: 'New Co' })).rejects.toMatchObject(PRO);
  });

  it('edits and reads existing invoices but refuses new documents and conversions', async () => {
    const { call } = zen();
    const { invoices } = await call('GET', '/finance/invoices');
    const saved = await call('POST', '/finance/invoices', { ...invoices[0], status: 'paid' });
    expect(saved.invoice.status).toBe('paid');
    await expect(call('POST', '/finance/invoices', { clientCode: 'ACME', items: [] })).rejects.toMatchObject(PRO);
    await expect(call('POST', '/finance/quotes', { clientCode: 'NEX', items: [] })).rejects.toMatchObject(PRO);
    await expect(call('POST', '/finance/convert-quote', { quoteId: 'QTE-2026-001' })).rejects.toMatchObject(PRO);
    await expect(call('POST', '/finance/append-session', { clientCode: 'ACME', sessionLog: { durationSeconds: 60 } })).rejects.toMatchObject(PRO);
    const html = await call('GET', `/finance/invoices/${invoices[0].documentNumber}/export-html`);
    expect(html.success).toBe(true);
  });

  it('logs timer sessions without adding them to an invoice', async () => {
    const { call, ctx, fs } = zen();
    const before = fs.paths().filter((p) => p.startsWith('_Finance/Invoices/')).length;
    await call('POST', '/system/timer/start', { clientCode: 'ACME', hourlyRate: 100 });
    const later = new Date(ctx.now().getTime() + 60_000);
    ctx.now = () => later;
    const stop = await call('POST', '/system/timer/stop', {});
    expect(stop.sessionLog).toMatchObject({ appendedToInvoice: false, durationSeconds: 60 });
    expect(fs.paths().filter((p) => p.startsWith('_Finance/Invoices/')).length).toBe(before);
  });

  it('refuses the handover ZIP but not its preview', async () => {
    const { call } = zen();
    const id = '202609_0001D_ACME_MobileAppIllustration';
    expect((await call('GET', `/projects/${id}/export/preview`)).success).toBe(true);
    await expect(call('POST', `/projects/${id}/export`, { dest: 'D:/out.zip' })).rejects.toMatchObject(PRO);
  });
});
