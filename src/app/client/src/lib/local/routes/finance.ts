/**
 * Quotes and invoices (P2.6). Mirrors server/routes/finance.js except the
 * timer routes (routes/timer.ts). Every write emits 'finance:updated' plus the
 * server's own event name; quote -> project also emits 'workspace:updated'.
 */

import { getClient } from '$lib/domain/clients';
import { getStudioProfile } from '$lib/domain/config';
import { appendSessionToInvoice, convertQuoteToInvoice, convertQuoteToProjectAndInvoice } from '$lib/domain/finance/convert';
import { archiveDocument, getDocument, listDocuments, saveDocument } from '$lib/domain/finance/documents';
import { documentHtmlFilename, renderDocumentHtml } from '$lib/domain/finance/html';
import type { DocKind } from '$lib/domain/finance/numbering';
import type { LocalContext } from '../context';
import { requirePro } from '../plan';
import { badRequest, notFound, type LocalRouter } from '../router';

/** Domain errors become 400 (as the server); HTTP errors keep their status. */
async function as400<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err: any) {
    if (typeof err?.status === 'number') throw err;
    throw badRequest(err?.message || String(err));
  }
}

function changed(ctx: LocalContext, event: string, data: Record<string, unknown>): void {
  if (event !== 'finance:updated') ctx.bus.emit(event, data);
  ctx.bus.emit('finance:updated', data);
}

/** `invoice`, `invoices`, `inv...` -> invoice; `quote`, `quotes`, `qte` -> quote. */
function kindOf(type: string): DocKind | null {
  const t = String(type || '').toLowerCase();
  if (t.startsWith('inv')) return 'invoice';
  if (t.startsWith('quo') || t.startsWith('qte')) return 'quote';
  return null;
}

function documentRoutes(router: LocalRouter, kind: DocKind): void {
  const plural = kind === 'quote' ? 'quotes' : 'invoices';
  const label = kind === 'quote' ? 'Quote' : 'Invoice';

  router.get(`/finance/${plural}`, async ({ ctx }) => {
    return { success: true, [plural]: await listDocuments(await ctx.vault(), kind, ctx.now()) };
  });

  router.get(`/finance/${plural}/:id`, async ({ ctx, params }) => {
    const doc = await getDocument(await ctx.vault(), kind, params.id, ctx.now());
    if (!doc) throw notFound(`${label} not found on disk.`);
    return { success: true, [kind]: doc };
  });

  router.post(`/finance/${plural}`, ({ ctx, body }) =>
    as400(async () => {
      const fs = await ctx.vault();
      // Editing an existing document stays free; creating a new one is Pro.
      const ref = String(body?.id || body?.documentNumber || '');
      if (!ref || !(await getDocument(fs, kind, ref, ctx.now()))) await requirePro(ctx, `A new ${kind}`);
      const result = await saveDocument(fs, kind, body, ctx.now());
      changed(ctx, kind === 'quote' ? 'finance:quote-saved' : 'finance:updated', { [kind]: result.document });
      return { success: true, [kind]: result.document };
    })
  );

  router.delete(`/finance/${plural}/:id`, async ({ ctx, params }) => {
    const archivedTo = await archiveDocument(await ctx.vault(), kind, params.id, ctx.now());
    if (!archivedTo) throw notFound(`${label} not found to delete.`);
    changed(ctx, `finance:${kind}-deleted`, { id: params.id, archivedTo });
    return { success: true, deleted: true, archivedTo };
  });
}

export function financeRoutes(router: LocalRouter): void {
  documentRoutes(router, 'invoice');
  documentRoutes(router, 'quote');

  router.post('/finance/append-session', ({ ctx, body }) =>
    as400(async () => {
      const sessionLog = body?.sessionLog ?? body?.session;
      const clientCode = body?.clientCode || sessionLog?.clientCode;
      if (!clientCode || !sessionLog) throw badRequest('clientCode and sessionLog are required.');
      await requirePro(ctx, 'Adding time to an invoice');
      const invoice = await appendSessionToInvoice(await ctx.vault(), clientCode, sessionLog, ctx.now());
      changed(ctx, 'finance:session-appended', { invoice });
      return { success: true, invoice };
    })
  );

  router.post('/finance/convert-quote', ({ ctx, body }) =>
    as400(async () => {
      const quoteId = body?.quoteId || body?.id || body?.documentNumber;
      if (!quoteId) throw badRequest('quoteId is required.');
      await requirePro(ctx, 'Turning a quote into an invoice');
      const result = await convertQuoteToInvoice(await ctx.vault(), String(quoteId), ctx.now());
      changed(ctx, 'finance:quote-converted', { ...result });
      return result;
    })
  );

  router.post('/finance/convert-quote-full', ({ ctx, body }) =>
    as400(async () => {
      const { quoteId, projectTitle, depositPercentage, deadline, deliverableType, description } = body || {};
      if (!quoteId) throw badRequest('quoteId is required.');
      await requirePro(ctx, 'Turning a quote into a project');
      const result = await convertQuoteToProjectAndInvoice(
        await ctx.vault(),
        String(quoteId),
        { projectTitle, depositPercentage, deadline, deliverableType, description },
        ctx.now()
      );
      changed(ctx, 'finance:quote-converted-full', { ...result });
      ctx.bus.emit('workspace:updated', { projectId: result.project.id, action: 'created', timestamp: ctx.now().toISOString() });
      return result;
    })
  );

  /** The server sent raw HTML; the desktop app returns it as JSON for the view to save. */
  router.get('/finance/:type/:id/export-html', async ({ ctx, params }) => {
    const kind = kindOf(params.type);
    if (!kind) throw notFound('Document not found');
    const fs = await ctx.vault();
    const doc = await getDocument(fs, kind, params.id, ctx.now());
    if (!doc) throw notFound('Document not found');
    const studio = await getStudioProfile(fs).catch(() => ({}));
    const client = await getClient(fs, doc.clientCode).catch(() => null);
    return { success: true, html: renderDocumentHtml(doc, studio, client), filename: documentHtmlFilename(doc) };
  });
}
