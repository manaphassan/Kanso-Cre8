import { describe, expect, it } from 'vitest';
import { sampleVault } from '$lib/vault/sampleVault';
import { appendSessionToInvoice, convertQuoteToInvoice, convertQuoteToProjectAndInvoice } from './convert';
import { deleteQuote, getInvoice, getQuote, listInvoices, listQuotes, nextNumber, saveInvoice, saveQuote } from './documents';
import { documentHtmlFilename, renderDocumentHtml } from './html';
import { readInvoiceSummaries } from './summaries';
import { getClient } from '../clients';
import { getStudioProfile } from '../config';

const NOW = new Date(Date.UTC(2026, 8, 15, 9, 0, 0));
const INV = '_Finance/Invoices';
const QTE = '_Finance/Quotes';

const vault = () => sampleVault(NOW);
const filesIn = (fs: ReturnType<typeof vault>, dir: string) =>
  fs.paths().filter((p) => p.startsWith(`${dir}/`) && p.endsWith('.md'));

describe('finance documents on the sample vault', () => {
  it('lists invoices and quotes newest first with the server shape', async () => {
    const fs = vault();
    const invoices = await listInvoices(fs, NOW);
    expect(invoices.map((d) => d.documentNumber)).toEqual(['INV-2026-003', 'INV-2026-002', 'INV-2026-001']);
    expect(invoices[2]).toMatchObject({
      id: 'INV-2026-001__INV-2026-001_ACME',
      type: 'invoice',
      date: '2026-09-02',
      dueDate: '2026-09-17',
      status: 'paid',
      clientCode: 'ACME',
      clientName: 'Acme Corporation',
      currency: 'USD',
      subtotal: 2375,
      total: 2375,
      freelancerName: 'Acme Design Studio',
      paymentBank: 'Acme Federal Bank',
      linkedProjectId: '202609_0001D_ACME_MobileAppIllustration'
    });
    expect(invoices[2].items[0]).toMatchObject({ quantity: 19, unitPrice: 125, amount: 2375 });

    const quotes = await listQuotes(fs, NOW);
    expect(quotes.map((d) => d.documentNumber)).toEqual(['QUOTE-2026-003', 'QUOTE-2026-002', 'QUOTE-2026-001']);
    expect(quotes.every((q) => q.type === 'quote')).toBe(true);
    expect(quotes[2]).toMatchObject({ validUntil: '2026-09-30', total: 4750, status: 'approved' });
  });

  it('finds a document by number, stored id or read id', async () => {
    const fs = vault();
    expect((await getInvoice(fs, 'inv-2026-002', NOW))?.clientCode).toBe('NEX');
    expect((await getInvoice(fs, 'INV-2026-002__INV-2026-002_NEX', NOW))?.documentNumber).toBe('INV-2026-002');
    expect((await getQuote(fs, 'QUOTE-2026-003', NOW))?.clientCode).toBe('LUM');
    expect(await getQuote(fs, 'QUOTE-2026-999', NOW)).toBeNull();
  });

  it('numbers new documents after the highest existing number', async () => {
    const fs = vault();
    expect(await nextNumber(fs, 'invoice', NOW)).toBe('INV-2026-004');
    expect(await nextNumber(fs, 'quote', NOW)).toBe('QUOTE-2026-004');
    fs.put(`${INV}/INV-2026-010_ACME.md`, '---\nid: INV-2026-010\ndocumentNumber: INV-2026-010\ndate: 2026-09-01\n---\n');
    fs.put(`${QTE}/QTE-2026-007_NEX.md`, '---\ndocumentNumber: QTE-2026-007\ndate: 2026-09-01\n---\n');
    expect(await nextNumber(fs, 'invoice', NOW)).toBe('INV-2026-011');
    expect(await nextNumber(fs, 'quote', NOW)).toBe('QUOTE-2026-008');
    // A gap left by an archived document is not reused.
    await deleteQuote(fs, 'QTE-2026-007', NOW);
    expect(await nextNumber(fs, 'quote', NOW)).toBe('QUOTE-2026-004');
  });

  it('saves a new invoice as one canonical file stamped from the studio profile and client', async () => {
    const fs = vault();
    fs.put('_Team/_Config/studio_profile.json', JSON.stringify({
      studioName: 'Acme Atelier',
      email: 'studio@example.com',
      phone: '+1-555-0100',
      address: '1 Test Lane, Metropolis',
      bankName: 'Acme Test Bank',
      accountNumber: '1111-2222-3333',
      accountHolder: 'Acme Atelier LLC',
      registration_no: 'REG-2026-0042'
    }));
    const before = filesIn(fs, INV);
    const saved = await saveInvoice(fs, { clientCode: 'nex', items: [{ description: 'Key art', quantity: 2, unitPrice: 110 }], taxRatePercent: 10 }, NOW);
    const added = filesIn(fs, INV).filter((p) => !before.includes(p));
    expect(added).toEqual([`${INV}/INV-2026-004_NEX.md`]);
    expect(saved).toMatchObject({
      documentNumber: 'INV-2026-004',
      clientCode: 'NEX',
      clientName: 'Nexus Studio',
      clientContact: 'Marcus Vance',
      clientEmail: 'marcus@nexusstudio.io',
      hourlyRate: 110,
      date: '2026-09-15',
      dueDate: '2026-09-29',
      freelancerName: 'Acme Atelier',
      freelancerEmail: 'studio@example.com',
      freelancerAddress: '1 Test Lane, Metropolis',
      paymentBank: 'Acme Test Bank',
      paymentAccount: '1111-2222-3333',
      paymentAccountName: 'Acme Atelier LLC',
      tin: 'REG-2026-0042',
      subtotal: 220,
      taxAmount: 22,
      total: 242
    });
    const text = await fs.readText(added[0]);
    expect(text).toContain('freelancer_name: Acme Atelier');
    expect(text).toContain('payment_bank: Acme Test Bank');
    expect(text).toContain('# Invoice INV-2026-004: Nexus Studio');
  });

  it('keeps unknown frontmatter keys and the body when an existing document is saved', async () => {
    const fs = vault();
    const path = `${INV}/INV-2026-003_LUM.md`;
    fs.put(path, (await fs.readText(path)).replace('status: draft', 'status: draft\npo_number: PO-77'));
    const inv = (await getInvoice(fs, 'INV-2026-003', NOW))!;
    const saved = await saveInvoice(fs, { ...inv, status: 'sent' }, NOW);
    expect(saved.status).toBe('sent');
    const text = await fs.readText(path);
    expect(text).toContain('po_number: PO-77');
    expect(text).toContain('Machine learning UI design system and component library deliverables.');
    expect(text.match(/^# Invoice INV-2026-003: Lumina Labs$/gm)).toHaveLength(1);
    // Saving freezes the studio identity it was read with; a later profile change does not rewrite it.
    expect(text).toContain('freelancer_name: Acme Design Studio');
    fs.put('_Team/_Config/studio_profile.json', JSON.stringify({ studioName: 'Acme Renamed' }));
    const again = (await getInvoice(fs, 'INV-2026-003', NOW))!;
    expect(again.freelancerName).toBe('Acme Design Studio');
    await saveInvoice(fs, again, NOW);
    expect(await fs.readText(path)).toContain('freelancer_name: Acme Design Studio');
    expect(filesIn(fs, INV)).toHaveLength(3);
  });

  it('round-trips fiscal metadata, themes and stamps (server cases)', async () => {
    const fs = vault();
    await saveInvoice(fs, {
      documentNumber: 'INV-2026-999', clientCode: 'ACME', currency: 'EUR', taxLabel: 'VAT', taxRatePercent: 20,
      tin: 'C25891024090', sstRegistrationNo: 'W10-1808-32000012', buyerTin: 'C10293847560', buyerSstNo: 'B01-1904-41000088',
      theme: 'swiss', stamp: 'paid', showClientAccent: true,
      items: [{ description: 'Brand Identity Guidelines', quantity: 10, unitPrice: 160 }]
    }, NOW);
    expect(await getInvoice(fs, 'INV-2026-999', NOW)).toMatchObject({
      currency: 'EUR', taxLabel: 'VAT', tin: 'C25891024090', sstRegistrationNo: 'W10-1808-32000012',
      buyerTin: 'C10293847560', buyerSstNo: 'B01-1904-41000088', theme: 'swiss', stamp: 'paid', showClientAccent: true, total: 1920
    });
  });

  it('archives instead of deleting', async () => {
    const fs = vault();
    expect(await deleteQuote(fs, 'QUOTE-2026-002', NOW)).toMatch(/^_Archive\/.+\/_Finance\/Quotes\/QUOTE-2026-002_NEX\.md$/);
    expect(filesIn(fs, QTE)).toHaveLength(2);
    expect(await deleteQuote(fs, 'QUOTE-2026-002', NOW)).toBeNull();
  });
});

describe('finance conversions', () => {
  it('converts a quote to a draft invoice and links both', async () => {
    const fs = vault();
    const res = await convertQuoteToInvoice(fs, 'QUOTE-2026-002', NOW);
    expect(res.invoice).toMatchObject({
      documentNumber: 'INV-2026-004', type: 'invoice', status: 'draft', clientCode: 'NEX',
      linkedQuoteId: 'QUOTE-2026-002', total: 3850, date: '2026-09-15', dueDate: '2026-09-29'
    });
    expect(res.invoice.items).toHaveLength(2);
    expect(fs.paths()).toContain(`${INV}/INV-2026-004_NEX.md`);
    expect(await getQuote(fs, 'QUOTE-2026-002', NOW)).toMatchObject({ status: 'accepted', linkedInvoiceId: 'INV-2026-004' });
    await expect(convertQuoteToInvoice(fs, 'QUOTE-2026-404', NOW)).rejects.toThrow(/not found/);
  });

  it('converts a quote to a project folder plus a deposit invoice', async () => {
    const fs = vault();
    const res = await convertQuoteToProjectAndInvoice(fs, 'QUOTE-2026-001', { projectTitle: 'Mobile Design Sprint', depositPercentage: 50, deliverableType: 'UI/UX' }, NOW);
    const dir = res.project.targetDir;
    expect(dir).toBe('_Projects/2026/202609_0004D_ACME_Mobile_Design_Sprint');
    for (const sub of ['01_BRIEF', '02_SOURCE', '03_COPY', '04_WIP', '05_DELIVERABLES']) expect(fs.paths()).toContain(`${dir}/${sub}`);
    const readme = await fs.readText(`${dir}/README.md`);
    expect(readme).toContain('linkedQuoteId: QUOTE-2026-001');
    expect(readme).toContain(`linkedInvoiceId: ${res.invoice.documentNumber}`);
    expect(res.invoice).toMatchObject({ total: 2375, linkedQuoteId: 'QUOTE-2026-001', linkedProjectId: res.project.id, title: 'Mobile Design Sprint (Deposit 50%)' });
    expect(res.invoice.items).toHaveLength(1);
    expect(await getQuote(fs, 'QUOTE-2026-001', NOW)).toMatchObject({ status: 'accepted', linkedInvoiceId: res.invoice.documentNumber, linkedProjectId: res.project.id });
  });

  it('bills the full scope when no deposit is given', async () => {
    const fs = vault();
    const res = await convertQuoteToProjectAndInvoice(fs, 'QUOTE-2026-003', {}, NOW);
    expect(res.invoice.total).toBe(4900);
    expect(res.invoice.items).toHaveLength(2);
    expect(res.invoice.title).toBe('Sprint_QUOTE-2026-003');
  });

  it('appends a timer session to the client draft invoice', async () => {
    const fs = vault();
    const inv = await appendSessionToInvoice(fs, 'lum', { projectTitle: 'Brand Identity', note: 'Glyph pass', durationSeconds: 3600, durationFormatted: '01:00:00' }, NOW);
    expect(inv.documentNumber).toBe('INV-2026-003');
    expect(inv.items).toHaveLength(2);
    expect(inv.items[1]).toMatchObject({ description: 'Brand Identity: Glyph pass (01:00:00)', quantity: 1, unitPrice: 140, amount: 140 });
    expect(inv.total).toBe(2940);
    expect((await getInvoice(fs, 'INV-2026-003', NOW))!.items).toHaveLength(2);
    expect(filesIn(fs, INV)).toHaveLength(3);
  });

  it('creates a draft invoice when the client has none open', async () => {
    const fs = vault();
    const inv = await appendSessionToInvoice(fs, 'ACME', { durationSeconds: 1800, hourlyRate: 150 }, NOW);
    expect(inv).toMatchObject({ documentNumber: 'INV-2026-004', status: 'draft', clientName: 'Acme Corporation', total: 75, dueDate: '2026-09-30' });
    expect(fs.paths()).toContain(`${INV}/INV-2026-004_ACME.md`);
    await expect(appendSessionToInvoice(fs, '', { durationSeconds: 1 }, NOW)).rejects.toThrow(/required/);
  });
});

describe('finance html and summaries', () => {
  it('renders a standalone printable document', async () => {
    const fs = vault();
    const inv = (await getInvoice(fs, 'INV-2026-001', NOW))!;
    const html = renderDocumentHtml({ ...inv, stamp: 'paid', items: [{ ...inv.items[0], description: '3D & <Kinetic>' }] }, await getStudioProfile(fs), await getClient(fs, 'ACME'));
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('INV-2026-001');
    expect(html).toContain('$2,375.00');
    expect(html).toContain('Acme Corporation');
    expect(html).toContain('stamp-paid');
    expect(html).toContain('Client Palette:');
    expect(html).toContain('--client-accent: #0066FF');
    expect(html).toContain('3D &amp; &lt;Kinetic&gt;');
    expect(html).toContain('Remittance Instructions');
    expect(html).toContain('SWIFT: ACMEUS33');
    expect(html).toContain('@media print');
    expect(documentHtmlFilename(inv)).toBe('INV-2026-001_ACME.html');

    const quote = (await getQuote(fs, 'QUOTE-2026-003', NOW))!;
    const qhtml = renderDocumentHtml({ ...quote, taxRatePercent: 8, taxLabel: 'SST', taxAmount: 392, total: 5292 }, null, null);
    expect(qhtml).toContain('Valid Until');
    expect(qhtml).toContain('2026-10-03');
    expect(qhtml).toContain('SST (8%)');
    expect(qhtml).toContain('$5,292.00');
    expect(qhtml).not.toContain('class="tactile-stamp');
  });

  it('readInvoiceSummaries keeps only the telemetry fields', async () => {
    const fs = vault();
    const summaries = await readInvoiceSummaries(fs, NOW);
    expect(summaries.map((s) => s.documentNumber)).toEqual(['INV-2026-003', 'INV-2026-002', 'INV-2026-001']);
    expect(summaries[2]).toEqual({
      id: 'INV-2026-001__INV-2026-001_ACME',
      documentNumber: 'INV-2026-001',
      date: '2026-09-02',
      status: 'paid',
      clientCode: 'ACME',
      clientName: 'Acme Corporation',
      total: 2375,
      items: [{ quantity: 19 }]
    });
  });
});
