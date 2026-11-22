/**
 * Local routes for the client handover package and the full-vault export
 * (P2.8). Port of the export endpoints in server/routes/projects.js and
 * system.js. The server streamed ZIP downloads; here the view asks for a save
 * location and POSTs it as `dest`, and Rust writes the ZIP there.
 */

import { getClient } from '$lib/domain/clients';
import { getStudioProfile } from '$lib/domain/config';
import { readReadme } from '$lib/domain/projects';
import {
  exportHandover,
  planHandover,
  suggestedHandoverFilename,
  type HandoverOptions,
  type HandoverPlan
} from '$lib/domain/export/handover';
import { clientCodeFor } from '$lib/domain/export/manifest';
import { exportVault, planVaultExport, suggestedVaultFilename } from '$lib/domain/export/vaultExport';
import type { LocalContext } from '../context';
import { requireProject } from '../projectIndex';
import { requirePro } from '../plan';
import { badRequest, type LocalRouter } from '../router';

type Input = Record<string, any>;

function bool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return undefined;
}

/** First defined flag among the long (body) and short (query string) names. */
function flag(input: Input, long: string, short: string): boolean | undefined {
  return bool(input[long]) ?? bool(input[short]);
}

function fileList(value: unknown): string[] | null {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const clean = list.map((s) => String(s).trim()).filter(Boolean);
  return clean.length ? clean : null;
}

/** Accepts the server's query names (wip, brief, copy, manifest, files) and the long body names. */
export function handoverOptions(input: Input = {}): HandoverOptions {
  return {
    includeWip: flag(input, 'includeWip', 'wip') === true,
    includeBrief: flag(input, 'includeBrief', 'brief') !== false,
    includeCopy: flag(input, 'includeCopy', 'copy') !== false,
    includeManifest: flag(input, 'includeManifest', 'manifest') !== false,
    selectedFiles: fileList(input.selectedFiles ?? input.files)
  };
}

function destination(body: Input): string {
  const dest = typeof body?.dest === 'string' ? body.dest.trim() : '';
  if (!dest) throw badRequest('Choose where to save the ZIP file.');
  if (!dest.toLowerCase().endsWith('.zip')) throw badRequest('The export file must end in .zip.');
  return dest;
}

const fileNameOf = (dest: string): string => dest.split(/[\\/]/).pop() || dest;

async function planFor(ctx: LocalContext, id: string, input: Input): Promise<{ plan: HandoverPlan; filename: string }> {
  const project = await requireProject(ctx, id);
  const fs = await ctx.vault();
  const studio = await getStudioProfile(fs).catch(() => ({}));
  const { frontmatter } = await readReadme(fs, project.fullPath);
  const client = await getClient(fs, clientCodeFor(frontmatter, project)).catch(() => null);
  const plan = await planHandover(fs, project, handoverOptions(input), studio, client, ctx.now());
  return { plan, filename: suggestedHandoverFilename(project, ctx.now()) };
}

export function exportRoutes(router: LocalRouter): void {
  router.get('/projects/:id/export/preview', async ({ ctx, params, query }) => {
    const { plan, filename } = await planFor(ctx, params.id, query);
    return { success: true, preview: plan.preview, filename };
  });

  router.post(['/projects/:id/export', '/projects/:id/export/zip'], async ({ ctx, params, body }) => {
    await requirePro(ctx, 'The client handover package');
    const dest = destination(body);
    const { plan } = await planFor(ctx, params.id, body ?? {});
    const result = await exportHandover(await ctx.vault(), plan, dest);
    return { ...result, filename: fileNameOf(dest) };
  });

  router.get('/system/export-vault/preview', async ({ ctx }) => {
    const plan = await planVaultExport(await ctx.vault(), ctx.now());
    return { success: true, preview: plan.preview, filename: suggestedVaultFilename(ctx.now()) };
  });

  router.post('/system/export-vault', async ({ ctx, body }) => {
    const dest = destination(body);
    const fs = await ctx.vault();
    const result = await exportVault(fs, await planVaultExport(fs, ctx.now()), dest);
    return { ...result, filename: fileNameOf(dest) };
  });
}
