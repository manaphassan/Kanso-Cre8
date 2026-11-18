/**
 * Local routes for the Creative AI assistant and Settings > AI (P3.3).
 * The key goes to Rust once (`POST /ai/config`) and never comes back:
 * status only says whether a key is configured.
 */

import { formatUltraPrompt, hooksPrompt, imagePromptsPrompt, scriptPrompt } from '$lib/domain/ai';
import type { AiRequest, AiStatus } from '../ai';
import type { LocalContext } from '../context';
import { badRequest, type LocalRouter } from '../router';

/** Status in the shape the assistant modal reads, plus the new fields. */
const view = (s: AiStatus) => ({ ...s, preferredModel: s.model, availableModels: s.models });

async function plain<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err: any) {
    if (typeof err?.status === 'number') throw err;
    throw badRequest(err?.message || String(err));
  }
}

const generate = (ctx: LocalContext, request: AiRequest) => plain(async () => (await ctx.ai.complete(request)).text);

export function aiRoutes(router: LocalRouter): void {
  router.get('/ai/status', async ({ ctx }) => ({ success: true, ...view(await ctx.ai.status()) }));

  router.post(['/ai/config', '/ai/key'], ({ ctx, body }) =>
    plain(async () => {
      const key = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
      const model = typeof body?.preferredModel === 'string' ? body.preferredModel : body?.model;
      let status = await ctx.ai.status();
      if (key) status = await ctx.ai.setKey(key);
      if (typeof model === 'string' && model && model !== status.model) status = await ctx.ai.setModel(model);
      return { success: true, status: view(status) };
    })
  );

  router.delete(['/ai/config', '/ai/key'], ({ ctx }) =>
    plain(async () => ({ success: true, status: view(await ctx.ai.clearKey()) }))
  );

  router.post('/ai/test', ({ ctx }) => plain(async () => ({ success: true, ...(await ctx.ai.test()) })));

  router.post('/ai/generate-hooks', async ({ ctx, body }) => ({ success: true, hooks: await generate(ctx, hooksPrompt(body ?? {})) }));

  router.post('/ai/generate-script', async ({ ctx, body }) => ({ success: true, script: await generate(ctx, scriptPrompt(body ?? {})) }));

  router.post('/ai/generate-image-prompts', async ({ ctx, body }) => ({
    success: true,
    prompts: await generate(ctx, imagePromptsPrompt(body ?? {}))
  }));

  router.post('/ai/format-prompt', ({ body }) => ({ success: true, prompt: formatUltraPrompt(body ?? {}) }));
}
