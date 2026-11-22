/**
 * Client hub routes (P2.4). Mirrors server/routes/clients.js. Every response
 * carries both the `client(s)` and the `company`/`companies` keys because
 * ApiClient.getCompanies/getCompany read the alias from GET /clients.
 */

import { deleteClient, getClient, listClients, saveClient, type ClientInput } from '$lib/domain/clients';
import type { LocalContext } from '../context';
import { FREE_CLIENT_LIMIT, isPro, proRequired } from '../plan';
import { badRequest, notFound, type LocalRouter } from '../router';

async function save(ctx: LocalContext, input: ClientInput, action: 'created' | 'updated') {
  const fs = await ctx.vault();
  if (action === 'created') {
    const existing = await listClients(fs);
    const code = String(input.code || '').trim().toUpperCase();
    const isNew = !existing.some((c) => c.code === code);
    if (isNew && existing.length >= FREE_CLIENT_LIMIT && !(await isPro(ctx))) {
      throw proRequired(`A client beyond the first ${FREE_CLIENT_LIMIT}`);
    }
  }
  let client;
  try {
    client = await saveClient(fs, input, ctx.now());
  } catch (err: any) {
    throw badRequest(err.message);
  }
  ctx.bus.emit('company:updated', { client, action });
  ctx.bus.emit('client:updated', { client, action });
  return { success: true, client, company: client };
}

export function clientRoutes(router: LocalRouter): void {
  router.get(['/clients', '/companies'], async ({ ctx }) => {
    const clients = await listClients(await ctx.vault());
    return { success: true, clients, companies: clients };
  });

  router.get(['/clients/:code', '/companies/:code'], async ({ ctx, params }) => {
    const client = await getClient(await ctx.vault(), params.code);
    if (!client) throw notFound('Client not found');
    return { success: true, client, company: client };
  });

  router.post(['/clients', '/companies'], ({ ctx, body }) => save(ctx, body || {}, 'created'));

  router.put(['/clients/:code', '/companies/:code'], ({ ctx, params, body }) =>
    save(ctx, { ...(body || {}), code: params.code }, 'updated')
  );

  router.delete(['/clients/:code', '/companies/:code'], async ({ ctx, params }) => {
    const fs = await ctx.vault();
    let result;
    try {
      result = await deleteClient(fs, params.code);
    } catch (err: any) {
      throw badRequest(err.message);
    }
    ctx.bus.emit('company:updated', { code: result.deletedCode, action: 'deleted' });
    ctx.bus.emit('client:updated', { code: result.deletedCode, action: 'deleted' });
    return { ...result, success: true };
  });
}
