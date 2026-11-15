/**
 * Quote -> invoice, quote -> project + invoice, and timer session -> draft
 * invoice. Port of FinanceVaultService.convertQuoteToInvoice,
 * convertQuoteToProjectAndInvoice and appendSessionToInvoice.
 */

import type { VaultFs } from '$lib/vault/types';
import { getClient } from '../clients';
import { writeReadme } from '../projects';
import { scaffoldProject } from '../scaffold';
import { getQuote, listInvoices, nextNumber, saveInvoice, saveQuote } from './documents';
import { round2, type DocumentInput, type FinanceDocument } from './model';
import { addDays, isoDay } from './numbering';

const generatedNote = (quote: FinanceDocument) =>
  quote.notes ? `${quote.notes}\n\n(Generated from Quote ${quote.documentNumber})` : `Generated from Quote ${quote.documentNumber}`;

async function requireQuote(fs: VaultFs, quoteId: string, now: Date): Promise<FinanceDocument> {
  const quote = await getQuote(fs, quoteId, now);
  if (!quote) throw new Error(`Quote "${quoteId}" not found in _Finance/Quotes/.`);
  return quote;
}

async function dueDate(fs: VaultFs, clientCode: string, today: string): Promise<string> {
  const client = await getClient(fs, clientCode).catch(() => null);
  return addDays(today, client?.paymentTermsDays ?? 14);
}

export interface ConvertResult {
  success: true;
  quote: FinanceDocument;
  invoice: FinanceDocument;
}

/** New draft invoice with the quote's items, fiscal fields and look; the quote becomes accepted. */
export async function convertQuoteToInvoice(fs: VaultFs, quoteId: string, now: Date): Promise<ConvertResult> {
  const quote = await requireQuote(fs, quoteId, now);
  const today = isoDay(now);
  const invNumber = await nextNumber(fs, 'invoice', now);
  const invoice = await saveInvoice(fs, {
    ...quote,
    id: invNumber.toLowerCase(),
    type: 'invoice',
    documentNumber: invNumber,
    date: today,
    dueDate: await dueDate(fs, quote.clientCode, today),
    status: 'draft',
    linkedQuoteId: quote.documentNumber,
    notes: generatedNote(quote)
  }, now);
  const savedQuote = await saveQuote(fs, { ...quote, status: 'accepted', linkedInvoiceId: invoice.documentNumber }, now);
  return { success: true, quote: savedQuote, invoice };
}

export interface ConvertFullOptions {
  projectTitle?: string;
  depositPercentage?: number | string | null;
  deadline?: string;
  deliverableType?: string;
  description?: string;
}

export interface ConvertFullResult extends ConvertResult {
  project: Record<string, any> & { id: string; targetDir: string };
}

/**
 * Scaffolds the 5-folder project, writes a draft invoice (full scope, or one
 * deposit line when 0 < depositPercentage < 100) and links quote, invoice and
 * project README to each other.
 */
export async function convertQuoteToProjectAndInvoice(
  fs: VaultFs,
  quoteId: string,
  options: ConvertFullOptions,
  now: Date
): Promise<ConvertFullResult> {
  const quote = await requireQuote(fs, quoteId, now);
  const clientCode = String(quote.clientCode || 'ACME').toUpperCase().trim();
  const clientName = quote.clientName || clientCode;
  const title = String(options.projectTitle || quote.title || `Sprint_${quote.documentNumber}`).trim();
  const totalAmount = Number(quote.total) || 0;
  const currency = quote.currency || 'USD';
  const rawPct = options.depositPercentage;
  const depositPct = rawPct === undefined || rawPct === null || rawPct === '' || !Number.isFinite(Number(rawPct)) ? 100 : Number(rawPct);

  const scaffold = await scaffoldProject(fs, {
    title,
    clientCode,
    clientName,
    budget: totalAmount,
    currency,
    deadline: options.deadline || quote.validUntil || quote.dueDate,
    deliverableType: options.deliverableType || 'Brand Identity',
    description: options.description || quote.notes || `Scaffolded from Quote ${quote.documentNumber}`,
    linkedQuoteId: quote.documentNumber
  }, now);
  const project = scaffold.project;
  const projectId = project.id || project.jobId || scaffold.folderName;

  const isDeposit = depositPct > 0 && depositPct < 100;
  let items: DocumentInput['items'];
  if (isDeposit) {
    // Deposit of the subtotal; the quote's tax rate then applies once (the server
    // took the percentage of the taxed total and taxed it again).
    const deposit = round2((Number(quote.subtotal) || 0) * (depositPct / 100));
    items = [{ id: 'item-dep-1', description: `Initial Deposit (${depositPct}%) - ${title}`, quantity: 1, unitPrice: deposit, amount: deposit }];
  } else {
    items = quote.items.length
      ? quote.items.map((it) => ({ ...it }))
      : [{ id: 'item-1', description: title, quantity: 1, unitPrice: totalAmount, amount: totalAmount }];
  }

  const today = isoDay(now);
  const invNumber = await nextNumber(fs, 'invoice', now);
  const invoice = await saveInvoice(fs, {
    ...quote,
    id: invNumber.toLowerCase(),
    type: 'invoice',
    documentNumber: invNumber,
    title: isDeposit ? `${title} (Deposit ${depositPct}%)` : title,
    date: today,
    dueDate: await dueDate(fs, clientCode, today),
    status: 'draft',
    items,
    linkedQuoteId: quote.documentNumber,
    linkedProjectId: projectId,
    notes: generatedNote(quote)
  }, now);

  const savedQuote = await saveQuote(fs, {
    ...quote,
    status: 'accepted',
    linkedInvoiceId: invoice.documentNumber,
    linkedProjectId: projectId
  }, now);

  try {
    await writeReadme(fs, scaffold.targetDir, { linkedQuoteId: quote.documentNumber, linkedInvoiceId: invoice.documentNumber });
  } catch (err: any) {
    console.warn('[finance] Could not update project README links:', err?.message);
  }

  return {
    success: true,
    quote: savedQuote,
    project: { ...project, linkedQuoteId: quote.documentNumber, linkedInvoiceId: invoice.documentNumber, targetDir: scaffold.targetDir },
    invoice
  };
}

/** A finished timer session (timer.ts SessionLog, or the UI's TimeSessionLog). */
export interface SessionInput {
  projectTitle?: string;
  note?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  hourlyRate?: number;
  [key: string]: unknown;
}

/**
 * Adds the session as a line item to the client's newest draft or sent
 * invoice, or to a new draft invoice when there is none.
 */
export async function appendSessionToInvoice(fs: VaultFs, clientCode: string, session: SessionInput, now: Date): Promise<FinanceDocument> {
  if (!clientCode || !session) throw new Error('Client code and session log are required.');
  const code = String(clientCode).trim().toUpperCase();
  const invoices = await listInvoices(fs, now);
  let target: DocumentInput | undefined = invoices.find(
    (inv) => inv.clientCode.toUpperCase() === code && (inv.status === 'draft' || inv.status === 'sent')
  );

  if (!target) {
    const client = await getClient(fs, code).catch(() => null);
    const today = isoDay(now);
    const number = await nextNumber(fs, 'invoice', now);
    target = {
      id: number.toLowerCase(),
      documentNumber: number,
      date: today,
      dueDate: addDays(today, client?.paymentTermsDays ?? 14),
      status: 'draft',
      clientCode: code,
      clientName: client?.name || code,
      ...(client?.currency ? { currency: client.currency } : {}),
      hourlyRate: Number(session.hourlyRate) || client?.defaultHourlyRate || 125,
      items: [],
      taxRatePercent: 0,
      notes: 'Itemized creative work chronometer session log.'
    };
  }

  const rate = Number(session.hourlyRate) || Number(target.hourlyRate) || 125;
  const hours = Math.max(0.1, round2((Number(session.durationSeconds) || 0) / 3600));
  const items = [...(target.items || [])];
  items.push({
    id: `item_session_${now.getTime()}`,
    description: `${session.projectTitle || 'Creative Sprint'}: ${session.note || 'Focus chronometer session'} (${session.durationFormatted || `${hours}h`})`,
    quantity: hours,
    unitPrice: rate,
    amount: round2(hours * rate)
  });
  return saveInvoice(fs, { ...target, items }, now);
}
