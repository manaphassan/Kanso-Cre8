/**
 * Quote and invoice documents: parse and write one Markdown file with YAML
 * frontmatter. Port of FinanceVaultService.parseInvoiceMarkdown and
 * serializeDocument. Pure functions (no fs).
 *
 * Read shape = the server's JSON shape (camelCase) plus `title`.
 * Written frontmatter = the server's snake_case keys; money is a number plus
 * `currency`, dates are `YYYY-MM-DD`. Unknown keys of an existing file are kept.
 */

import yaml from 'js-yaml';
import { serializeFrontmatter, validateFrontmatter } from '../frontmatter';
import { addDays, isoDay, type DocKind } from './numbering';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// A type alias, not an interface: aliases get an implicit index signature,
// so a FinanceDocument is assignable to DocumentInput.
export type FinanceDocument = {
  id: string;
  type: DocKind;
  documentNumber: string;
  /** Short description of the job (frontmatter `title:`). */
  title: string;
  date: string;
  dueDate: string;
  validUntil: string;
  status: string;
  clientCode: string;
  clientName: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;
  freelancerName: string;
  freelancerEmail: string;
  freelancerPhone: string;
  freelancerAddress: string;
  paymentBank: string;
  paymentAccount: string;
  paymentAccountName: string;
  currency: string;
  hourlyRate: number;
  items: LineItem[];
  taxRatePercent: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  taxLabel: string;
  tin: string;
  sstRegistrationNo: string;
  buyerTin: string;
  buyerSstNo: string;
  theme: string;
  stamp: string;
  showClientAccent: boolean;
  notes: string;
  linkedProjectId: string;
  linkedQuoteId: string;
  linkedInvoiceId: string;
  rawMarkdown: string;
};

export type ItemInput = Partial<LineItem> & { hours?: number | string; rate?: number | string; unit_price?: number | string };

/** What the UI posts: any subset of the read shape. */
export type DocumentInput = Partial<Omit<FinanceDocument, 'items'>> & { items?: ItemInput[]; [key: string]: unknown };

/** Studio fields used when a file has none (read) or a new document is saved (stamp). */
export type StudioDefaults = Partial<
  Pick<FinanceDocument, 'freelancerName' | 'freelancerEmail' | 'freelancerPhone' | 'freelancerAddress' | 'paymentBank' | 'paymentAccount' | 'paymentAccountName' | 'tin'>
>;

/** Last-resort values, as the server (sample identity, example.com). */
const FALLBACK: Required<Omit<StudioDefaults, 'tin'>> = {
  freelancerName: 'Acme Design Studio',
  freelancerEmail: 'billing@example.com',
  freelancerPhone: '+1-555-0100',
  freelancerAddress: '',
  paymentBank: 'Acme Federal Bank',
  paymentAccount: '0000-0000-0000',
  paymentAccountName: 'Acme Design Studio'
};

/** Canonical studio profile (domain/config getStudioProfile) -> document fields. */
export function studioDefaults(studio: Record<string, any> | null | undefined): StudioDefaults {
  const s = studio || {};
  return {
    freelancerName: s.studioName || s.freelancerName || '',
    freelancerEmail: s.email || '',
    freelancerPhone: s.phone || '',
    freelancerAddress: s.address || '',
    paymentBank: s.bankName || '',
    paymentAccount: s.accountNumber || '',
    paymentAccountName: s.accountHolder || s.studioName || '',
    tin: s.registration_no || ''
  };
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** `2026-09-02T00:00:00.000Z`, a YAML Date or `2026-09-02` -> `2026-09-02`. */
export function normalizeDate(value: unknown, fallback: string): string {
  if (!value) return fallback;
  if (value instanceof Date) return isNaN(value.getTime()) ? fallback : value.toISOString().split('T')[0];
  const s = String(value).trim();
  return s.includes('T') ? s.split('T')[0] : s;
}

/** Composite read id `rawId__fileBase` -> the id stored in the file. */
export const storedId = (id: unknown) => (id ? String(id).split('__')[0] : '');

/** The parsed document id, as the server built it. */
export function documentId(rawId: string, fileBase: string): string {
  return fileBase && fileBase !== rawId ? `${rawId}__${fileBase}` : rawId;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/** Splits frontmatter and body; repairs unquoted colons in item descriptions like the server. */
export function splitDocument(raw: string): { frontmatter: Record<string, any>; body: string; hasFrontmatter: boolean } {
  const text = String(raw || '').replace(/^\uFEFF/, '');
  const m = FM_RE.exec(text);
  if (!m) return { frontmatter: {}, body: text, hasFrontmatter: false };
  const load = (src: string) => {
    const v = yaml.load(src);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, any>) : {};
  };
  let frontmatter: Record<string, any> = {};
  try {
    frontmatter = load(m[1]);
  } catch {
    try {
      frontmatter = load(
        m[1].replace(/^( +-\s*description:\s*)(.*)$/gm, (all, head, value) => {
          const t = String(value).trim();
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return all;
          return `${head}"${t.replace(/"/g, '\\"')}"`;
        })
      );
    } catch {
      frontmatter = {};
    }
  }
  return { frontmatter, body: m[2] || '', hasFrontmatter: true };
}

const first = (...values: unknown[]) => values.find((v) => v !== undefined && v !== null);
const num = (...values: unknown[]) => Number(first(...values) ?? 0);

export function parseDocument(raw: string, filename: string, now: Date, defaults: StudioDefaults = {}): FinanceDocument {
  const { frontmatter: fm, body } = splitDocument(raw);
  const fileBase = String(filename || '').split('/').pop()!.replace(/\.md$/, '');
  const documentNumber = String(fm.documentNumber || fm.id || fileBase);
  const items: LineItem[] = (Array.isArray(fm.items) ? fm.items : []).map((it: any, idx: number) => ({
    id: String(it?.id || `item_${idx + 1}`),
    description: String(it?.description || 'Creative Services'),
    quantity: Number(first(it?.quantity, it?.hours) ?? 1),
    unitPrice: num(it?.unitPrice, it?.unit_price, it?.rate),
    amount: num(it?.amount)
  }));
  const subtotal = Number(first(fm.subtotal) ?? items.reduce((s, it) => s + it.amount, 0));
  const taxRatePercent = num(fm.taxRatePercent, fm.tax_percent);
  const taxAmount = Number(first(fm.taxAmount, fm.tax_amount) ?? (subtotal * taxRatePercent) / 100);
  const total = Number(first(fm.total) ?? subtotal + taxAmount);
  const date = normalizeDate(fm.date, isoDay(now));
  const rawId = String(fm.id || documentNumber.toLowerCase());
  const pick = (key: keyof typeof FALLBACK, ...values: unknown[]) =>
    String(values.find((v) => v) || defaults[key] || FALLBACK[key]);
  const accent = first(fm.show_client_accent, fm.showClientAccent);

  return {
    id: documentId(rawId, fileBase),
    type: fm.type || (/^(QTE|QUOTE)/i.test(documentNumber) ? 'quote' : 'invoice'),
    documentNumber,
    title: String(fm.title || ''),
    date,
    dueDate: normalizeDate(fm.dueDate || fm.due_date || fm.validUntil || fm.valid_until, date),
    validUntil: normalizeDate(fm.validUntil || fm.valid_until || fm.dueDate || fm.due_date, date),
    status: String(fm.status || 'draft'),
    clientCode: String(fm.clientCode || fm.client_code || 'ACME'),
    clientName: String(fm.clientName || fm.client_name || 'Acme Corporation'),
    clientContact: String(fm.clientContact || fm.client_contact || ''),
    clientEmail: String(fm.clientEmail || fm.client_email || ''),
    clientAddress: String(fm.clientAddress || fm.client_address || ''),
    // The server wrote snake_case but read camelCase only; both are read here.
    freelancerName: pick('freelancerName', fm.freelancerName, fm.freelancer_name),
    freelancerEmail: pick('freelancerEmail', fm.freelancerEmail, fm.freelancer_email),
    freelancerPhone: pick('freelancerPhone', fm.freelancerPhone, fm.freelancer_phone),
    freelancerAddress: pick('freelancerAddress', fm.freelancerAddress, fm.freelancer_address),
    paymentBank: pick('paymentBank', fm.paymentBank, fm.payment_bank),
    paymentAccount: pick('paymentAccount', fm.paymentAccount, fm.payment_account),
    paymentAccountName: pick('paymentAccountName', fm.paymentAccountName, fm.payment_account_name),
    currency: String(fm.currency || 'USD'),
    hourlyRate: Number(fm.hourlyRate || fm.hourly_rate || 125),
    items,
    taxRatePercent,
    subtotal,
    taxAmount,
    total,
    taxLabel: String(fm.tax_label || fm.taxLabel || 'Tax'),
    tin: String(fm.tin || fm.freelancer_tin || fm.freelancerTin || ''),
    sstRegistrationNo: String(fm.sst_registration_no || fm.sstRegistrationNo || ''),
    buyerTin: String(fm.buyer_tin || fm.buyerTin || ''),
    buyerSstNo: String(fm.buyer_sst_no || fm.buyerSstNo || ''),
    theme: String(fm.theme || 'geist'),
    stamp: String(fm.stamp || 'none'),
    showClientAccent: accent !== undefined ? Boolean(accent) : true,
    notes: String(fm.notes || body.trim()),
    linkedProjectId: String(fm.linkedProjectId || fm.linked_project_id || ''),
    linkedQuoteId: String(fm.linkedQuoteId || fm.linked_quote_id || ''),
    linkedInvoiceId: String(fm.linkedInvoiceId || fm.linked_invoice_id || ''),
    rawMarkdown: raw
  };
}

/** Every key `parseDocument` reads. They are rewritten on save; any other key is kept. */
const KNOWN_KEYS = new Set([
  'id', 'documentNumber', 'type', 'title', 'date', 'dueDate', 'due_date', 'validUntil', 'valid_until', 'status',
  'clientCode', 'client_code', 'clientName', 'client_name', 'clientContact', 'client_contact', 'clientEmail',
  'client_email', 'clientAddress', 'client_address', 'freelancerName', 'freelancer_name', 'freelancerEmail',
  'freelancer_email', 'freelancerPhone', 'freelancer_phone', 'freelancerAddress', 'freelancer_address',
  'paymentBank', 'payment_bank', 'paymentAccount', 'payment_account', 'paymentAccountName', 'payment_account_name',
  'currency', 'hourlyRate', 'hourly_rate', 'items', 'subtotal', 'taxRatePercent', 'tax_percent', 'taxAmount',
  'tax_amount', 'total', 'taxLabel', 'tax_label', 'tin', 'freelancer_tin', 'freelancerTin', 'sst_registration_no',
  'sstRegistrationNo', 'buyer_tin', 'buyerTin', 'buyer_sst_no', 'buyerSstNo', 'theme', 'stamp',
  'show_client_accent', 'showClientAccent', 'notes', 'linkedProjectId', 'linked_project_id', 'linkedQuoteId',
  'linked_quote_id', 'linkedInvoiceId', 'linked_invoice_id'
]);

function itemQuantity(it: ItemInput): number {
  const q = first(it.quantity, it.hours);
  return q === undefined || q === '' ? 1 : Number(q) || 0;
}

/** Line items as written: amount is always quantity x rate, rounded to cents. */
export function normalizeItems(items: ItemInput[] | undefined): Array<{ description: string; hours: number; rate: number; amount: number }> {
  return (Array.isArray(items) ? items : []).map((it) => {
    const hours = itemQuantity(it || {});
    const rate = num(it?.unitPrice, it?.unit_price, it?.rate);
    return { description: String(it?.description || 'Creative Services'), hours, rate, amount: round2(hours * rate) };
  });
}

export interface Existing {
  frontmatter: Record<string, any>;
  body: string;
}

/**
 * Document -> file text. Totals are recomputed from the items and the tax rate.
 * `existing` (the file being replaced) supplies unknown keys and the body;
 * only its first heading is regenerated.
 */
export function serializeDocument(doc: DocumentInput, kind: DocKind, now: Date, existing?: Existing | null): string {
  const items = normalizeItems(doc.items);
  const subtotal = items.length ? round2(items.reduce((s, it) => s + it.amount, 0)) : round2(Number(doc.subtotal) || 0);
  const taxRatePercent = Number(doc.taxRatePercent) || 0;
  const taxAmount = round2((subtotal * taxRatePercent) / 100);
  const total = round2(subtotal + taxAmount);
  const documentNumber = String(doc.documentNumber || storedId(doc.id));
  const date = normalizeDate(doc.date, isoDay(now));
  const clientCode = String(doc.clientCode || 'ACME');
  const clientName = String(doc.clientName || clientCode);

  const fm: Record<string, any> = {
    id: storedId(doc.id) || documentNumber,
    documentNumber,
    type: kind,
    ...(doc.title ? { title: String(doc.title) } : {}),
    client_code: clientCode,
    client_name: clientName,
    client_email: String(doc.clientEmail || ''),
    date,
    due_date: normalizeDate(doc.dueDate || doc.validUntil, addDays(date, 14)),
    status: String(doc.status || 'draft'),
    currency: String(doc.currency || 'USD'),
    hourly_rate: Number(doc.hourlyRate) || 125,
    items,
    subtotal,
    tax_percent: taxRatePercent,
    tax_amount: taxAmount,
    tax_label: String(doc.taxLabel || 'Tax'),
    total,
    notes: String(doc.notes || ''),
    linked_project_id: String(doc.linkedProjectId || ''),
    theme: String(doc.theme || 'geist')
  };
  const optional: Array<[string, unknown]> = [
    ['client_contact', doc.clientContact], ['client_address', doc.clientAddress], ['tin', doc.tin],
    ['sst_registration_no', doc.sstRegistrationNo], ['buyer_tin', doc.buyerTin], ['buyer_sst_no', doc.buyerSstNo],
    ['freelancer_name', doc.freelancerName], ['freelancer_email', doc.freelancerEmail],
    ['freelancer_phone', doc.freelancerPhone], ['freelancer_address', doc.freelancerAddress],
    ['payment_bank', doc.paymentBank], ['payment_account', doc.paymentAccount],
    ['payment_account_name', doc.paymentAccountName], ['linked_quote_id', doc.linkedQuoteId],
    ['linked_invoice_id', doc.linkedInvoiceId], ['stamp', doc.stamp]
  ];
  for (const [key, value] of optional) if (value) fm[key] = String(value);
  if (doc.validUntil) fm.valid_until = normalizeDate(doc.validUntil, date);
  if (doc.showClientAccent !== undefined) fm.show_client_accent = Boolean(doc.showClientAccent);

  for (const [key, value] of Object.entries(existing?.frontmatter || {})) {
    if (!KNOWN_KEYS.has(key) && !(key in fm) && value !== undefined) fm[key] = value;
  }

  const data = validateFrontmatter(kind, fm).data; // warnings only, as the server
  const heading = `# ${kind === 'quote' ? 'Quote' : 'Invoice'} ${documentNumber}: ${clientName}`;
  let body: string;
  const kept = (existing?.body || '').replace(/^\s+/, '');
  if (kept) body = /^# /.test(kept) ? kept.replace(/^# [^\n]*/, heading) : `${heading}\n\n${kept}`;
  else body = `${heading}\n\n${doc.notes ? `${doc.notes}\n` : ''}`;
  return serializeFrontmatter(data, body.endsWith('\n') ? body : `${body}\n`);
}
