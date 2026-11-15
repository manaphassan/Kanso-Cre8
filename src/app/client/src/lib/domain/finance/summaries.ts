/**
 * Invoice summaries for journal telemetry, built on the finance reader, so
 * the journal and the Invoice Studio read invoices the same way.
 */

import type { VaultFs } from '$lib/vault/types';
import { listInvoices } from './documents';

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

/** Every invoice in `_Finance/Invoices/` (one scan), newest first. */
export async function readInvoiceSummaries(fs: VaultFs, now: Date): Promise<InvoiceSummary[]> {
  // Empty studio defaults: summaries carry no studio fields, so the profile is not read.
  const invoices = await listInvoices(fs, now, {});
  return invoices.map((inv) => ({
    id: inv.id,
    documentNumber: inv.documentNumber,
    date: inv.date,
    status: inv.status,
    clientCode: inv.clientCode,
    clientName: inv.clientName,
    total: inv.total,
    items: inv.items.map((it) => ({ quantity: it.quantity }))
  }));
}
