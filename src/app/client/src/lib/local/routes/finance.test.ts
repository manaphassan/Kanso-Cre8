import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { financeRoutes } from './finance';
import { projectRoutes } from './projects';

const INV = '_Finance/Invoices';
const QTE = '_Finance/Quotes';
const eventsOf = (events: Array<{ event: string }>) => events.map((e) => e.event);

describe('finance routes on the sample vault', () => {
  it('lists and gets quotes and invoices with the server keys', async () => {
    const { call } = routeHarness([financeRoutes], { sample: true });
    const invoices = await call('GET', '/finance/invoices');
    expect(invoices.success).toBe(true);
    expect(invoices.invoices).toHaveLength(3);
    const quotes = await call('GET', '/finance/quotes');
    expect(quotes.quotes.map((q: any) => q.documentNumber)).toEqual(['QUOTE-2026-003', 'QUOTE-2026-002', 'QUOTE-2026-001']);

    expect((await call('GET', '/finance/invoices/INV-2026-002')).invoice).toMatchObject({ clientCode: 'NEX', total: 2200, status: 'paid' });
    expect((await call('GET', `/finance/quotes/${encodeURIComponent(quotes.quotes[0].id)}`)).quote.documentNumber).toBe('QUOTE-2026-003');
    await expect(call('GET', '/finance/invoices/INV-2026-404')).rejects.toThrow('Invoice not found on disk.');
    await expect(call('GET', '/finance/quotes/QUOTE-2026-404')).rejects.toMatchObject({ status: 404 });
  });

  it('saves a quote and an invoice as one file each and emits finance:updated', async () => {
    const { call, fs, events } = routeHarness([financeRoutes], { sample: true });
    const quote = await call('POST', '/finance/quotes', {
      documentNumber: 'QTE-2026-042', type: 'quote', clientCode: 'LUM', clientName: 'Lumina Labs', date: '2026-09-09',
      validUntil: '2026-09-23', currency: 'USD', hourlyRate: 160, taxRatePercent: 10,
      items: [{ description: 'AI Interface Design System & Iconography', quantity: 25, unitPrice: 160, amount: 4000 }]
    });
    expect(quote).toMatchObject({ success: true, quote: { documentNumber: 'QTE-2026-042', type: 'quote', total: 4400 } });
    const text = await fs.readText(`${QTE}/QTE-2026-042_LUM.md`);
    expect(text).toContain('type: quote');
    expect(text).toContain('valid_until: "2026-09-23"');

    const invoice = await call('POST', '/finance/invoices', { clientCode: 'ACME', items: [{ description: 'Icons', quantity: 4, unitPrice: 125 }] });
    expect(invoice.invoice).toMatchObject({ documentNumber: 'INV-2026-004', total: 500, clientName: 'Acme Corporation' });
    expect(fs.paths().filter((p) => p.startsWith(`${INV}/`))).toHaveLength(4);
    expect(eventsOf(events)).toEqual(['finance:quote-saved', 'finance:updated', 'finance:updated']);
  });

  it('archives on delete and 404s afterwards', async () => {
    const { call, fs, events } = routeHarness([financeRoutes], { sample: true });
    const res = await call('DELETE', '/finance/invoices/INV-2026-001');
    expect(res).toMatchObject({ success: true, deleted: true });
    expect(res.archivedTo).toMatch(/^_Archive\/.+\/_Finance\/Invoices\/INV-2026-001_ACME\.md$/);
    expect(fs.paths()).toContain(res.archivedTo);
    expect(fs.paths()).not.toContain(`${INV}/INV-2026-001_ACME.md`);
    await expect(call('DELETE', '/finance/invoices/INV-2026-001')).rejects.toThrow('Invoice not found to delete.');
    expect((await call('DELETE', '/finance/quotes/QUOTE-2026-003')).deleted).toBe(true);
    expect(eventsOf(events)).toEqual(['finance:invoice-deleted', 'finance:updated', 'finance:quote-deleted', 'finance:updated']);
  });

  it('converts a quote to an invoice', async () => {
    const { call, events } = routeHarness([financeRoutes], { sample: true });
    const res = await call('POST', '/finance/convert-quote', { quoteId: 'QUOTE-2026-002' });
    expect(res.success).toBe(true);
    expect(res.invoice).toMatchObject({ documentNumber: 'INV-2026-004', linkedQuoteId: 'QUOTE-2026-002', total: 3850 });
    expect(res.quote).toMatchObject({ status: 'accepted', linkedInvoiceId: 'INV-2026-004' });
    expect(eventsOf(events)).toEqual(['finance:quote-converted', 'finance:updated']);
    await expect(call('POST', '/finance/convert-quote', {})).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/finance/convert-quote', { quoteId: 'QUOTE-2026-404' })).rejects.toMatchObject({ status: 400 });
  });

  it('converts a quote to a project and invoice and refreshes the project index', async () => {
    const { call, fs, events } = routeHarness([financeRoutes, projectRoutes], { sample: true });
    expect((await call('GET', '/projects')).total).toBe(3);
    const res = await call('POST', '/finance/convert-quote-full', { quoteId: 'QUOTE-2026-001', projectTitle: 'Mobile Design Sprint', depositPercentage: 50 });
    expect(res).toMatchObject({ success: true, invoice: { total: 2375, linkedProjectId: res.project.id }, quote: { status: 'accepted' } });
    expect(fs.paths()).toContain(`${res.project.targetDir}/05_DELIVERABLES`);
    expect(eventsOf(events)).toEqual(['finance:quote-converted-full', 'finance:updated', 'workspace:updated']);
    expect(events[2].data).toMatchObject({ projectId: res.project.id, action: 'created' });
    const projects = await call('GET', '/projects');
    expect(projects.total).toBe(4);
    expect(projects.projects.some((p: any) => p.id === res.project.id)).toBe(true);
  });

  it('appends a session to the client draft invoice', async () => {
    const { call, events } = routeHarness([financeRoutes], { sample: true });
    const res = await call('POST', '/finance/append-session', {
      clientCode: 'LUM',
      sessionLog: { projectTitle: 'Brand Identity', note: 'Tokens', durationSeconds: 5400, durationFormatted: '01:30:00', hourlyRate: 140 }
    });
    expect(res.invoice.documentNumber).toBe('INV-2026-003');
    expect(res.invoice.items).toHaveLength(2);
    expect(res.invoice.items[1]).toMatchObject({ quantity: 1.5, amount: 210 });
    expect((await call('GET', '/finance/invoices/INV-2026-003')).invoice.total).toBe(3010);
    expect(eventsOf(events)).toEqual(['finance:session-appended', 'finance:updated']);
    await expect(call('POST', '/finance/append-session', { clientCode: 'LUM' })).rejects.toThrow('clientCode and sessionLog are required.');
  });

  it('exports standalone HTML as JSON for invoices and quotes', async () => {
    const { call } = routeHarness([financeRoutes], { sample: true });
    const inv = await call('GET', '/finance/invoice/INV-2026-002/export-html');
    expect(inv).toMatchObject({ success: true, filename: 'INV-2026-002_NEX.html' });
    expect(inv.html).toContain('<!DOCTYPE html>');
    expect(inv.html).toContain('INV-2026-002');
    expect(inv.html).toContain('$2,200.00');
    const quote = await call('GET', '/finance/quotes/QUOTE-2026-003/export-html');
    expect(quote.filename).toBe('QUOTE-2026-003_LUM.html');
    expect(quote.html).toContain('Creative Proposal &amp; Quote');
    expect(quote.html).toContain('$4,900.00');
    await expect(call('GET', '/finance/invoice/INV-2026-404/export-html')).rejects.toMatchObject({ status: 404 });
    await expect(call('GET', '/finance/receipts/INV-2026-002/export-html')).rejects.toMatchObject({ status: 404 });
  });

  it('registers no timer routes', async () => {
    const { router } = routeHarness([financeRoutes]);
    expect(router.list().some((r) => /timer/.test(r))).toBe(false);
  });
});
