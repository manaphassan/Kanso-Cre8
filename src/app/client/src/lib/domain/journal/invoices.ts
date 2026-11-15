/**
 * Minimal invoice reader for journal telemetry. Mirrors the fields
 * FinanceVaultService.parseInvoiceMarkdown / getInvoices computed (date,
 * status, client, total, line-item quantity). Private to the journal until the
 * finance domain lands; the coordinator can swap `readInvoiceSummaries` for it.
 */

import { parseFrontmatter } from '../frontmatter';
import type { VaultFs } from '$lib/vault/types';
import { localDate } from './dates';

export const INVOICES_DIR = '_Finance/Invoices';

export interface InvoiceSummary {
  id: string;
  documentNumber: string;
  date: string;
  status: string;
  clientCode: string;
  clientName: string;
  total: number;
  /** Line items with `quantity` read as the server did (quantity, else hours, else 1). */
  items: Array<{ quantity: number }>;
}

function normalizeDate(value: unknown, fallback: string): string {
  if (!value) return fallback;
  if (value instanceof Date) return isNaN(value.getTime()) ? fallback : value.toISOString().split('T')[0];
  const s = String(value).trim();
  return s.includes('T') ? s.split('T')[0] : s;
}

const num = (v: unknown, fallback: number) => Number(v !== undefined ? v : fallback);

export function summarizeInvoice(raw: string, filename: string, now: Date): InvoiceSummary {
  const fm = parseFrontmatter(raw).frontmatter as Record<string, any>;
  const fileBase = filename.replace(/\.md$/, '');
  const documentNumber = String(fm.documentNumber || fm.id || fileBase);
  const rawItems: any[] = Array.isArray(fm.items) ? fm.items : [];
  const items = rawItems.map((it) => ({
    quantity: Number(it?.quantity !== undefined ? it.quantity : it?.hours !== undefined ? it.hours : 1),
    amount: Number(it?.amount !== undefined ? it.amount : 0)
  }));
  const subtotal = num(fm.subtotal, items.reduce((s, it) => s + it.amount, 0));
  const taxRate = num(fm.taxRatePercent, num(fm.tax_percent, 0));
  const taxAmount = num(fm.taxAmount, num(fm.tax_amount, (subtotal * taxRate) / 100));
  const total = num(fm.total, subtotal + taxAmount);
  const rawId = String(fm.id || documentNumber.toLowerCase());

  return {
    id: fileBase && fileBase !== rawId ? `${rawId}__${fileBase}` : rawId,
    documentNumber,
    date: normalizeDate(fm.date, localDate(now)),
    status: fm.status || 'draft',
    clientCode: fm.clientCode || fm.client_code || 'ACME',
    clientName: fm.clientName || fm.client_name || 'Acme Corporation',
    total,
    items: items.map(({ quantity }) => ({ quantity }))
  };
}

/** Every invoice in `_Finance/Invoices/` (one scan), newest first. */
export async function readInvoiceSummaries(fs: VaultFs, now: Date): Promise<InvoiceSummary[]> {
  let entries: Awaited<ReturnType<VaultFs['scan']>> = [];
  try {
    entries = await fs.scan(INVOICES_DIR);
  } catch {
    return [];
  }
  const out: InvoiceSummary[] = [];
  for (const e of entries) {
    const filename = e.path.slice(INVOICES_DIR.length + 1);
    if (e.isDir || filename.includes('/') || !filename.endsWith('.md')) continue;
    try {
      const raw = e.text ?? (await fs.readText(e.path));
      out.push(summarizeInvoice(raw, filename, now));
    } catch {
      // Unreadable invoice: skipped, as the server did.
    }
  }
  return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
