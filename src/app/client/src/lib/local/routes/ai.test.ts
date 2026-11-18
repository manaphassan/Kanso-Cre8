import { describe, expect, it } from 'vitest';
import { formatUltraPrompt, hooksPrompt, imagePromptsPrompt, scriptPrompt } from '$lib/domain/ai';
import { routeHarness } from '../testing';
import { aiRoutes } from './ai';

const KEY = 'AIzaTestKey0123456789abcdefghijklmnop';
const harness = () => routeHarness([aiRoutes]);

describe('ai routes', () => {
  it('reports status without the key and saves key and model through the backend', async () => {
    const { call, ctx } = harness();
    expect(await call('GET', '/ai/status')).toMatchObject({ success: true, configured: false, preferredModel: 'gemini-2.5-flash', storage: null });
    const saved = await call('POST', '/ai/config', { apiKey: `  ${KEY}  `, preferredModel: 'gemini-2.5-pro' });
    expect(saved.status).toMatchObject({ configured: true, model: 'gemini-2.5-pro', preferredModel: 'gemini-2.5-pro', storage: 'keychain' });
    expect(ctx.ai.key).toBe(KEY);
    expect(JSON.stringify(await call('GET', '/ai/status'))).not.toContain('AIza');
    expect((await call('DELETE', '/ai/config')).status.configured).toBe(false);
  });

  it('changes only the model when no key is posted', async () => {
    const { call, ctx } = harness();
    await call('POST', '/ai/config', { apiKey: KEY });
    await call('POST', '/ai/config', { preferredModel: 'gemini-2.5-flash-lite' });
    expect(ctx.ai.key).toBe(KEY);
    expect(ctx.ai.model).toBe('gemini-2.5-flash-lite');
  });

  it('turns backend errors into 400s with the plain sentence', async () => {
    const { call, ctx } = harness();
    await expect(call('POST', '/ai/generate-hooks', { product: 'Launch' })).rejects.toMatchObject({
      status: 400,
      message: 'Add your API key in Settings > AI first.'
    });
    await call('POST', '/ai/config', { apiKey: KEY });
    ctx.ai.error = 'Your Gemini quota is used up. Try again later.';
    await expect(call('POST', '/ai/test')).rejects.toMatchObject({ message: 'Your Gemini quota is used up. Try again later.' });
    await expect(call('POST', '/ai/config', { apiKey: 'short' })).rejects.toMatchObject({ status: 400 });
  });

  it('sends each assistant action as one prompt and returns the field the modal reads', async () => {
    const { call, ctx } = harness();
    await call('POST', '/ai/config', { apiKey: KEY });
    ctx.ai.reply = '- Hook one';
    expect(await call('POST', '/ai/generate-hooks', { brand: 'NEX', product: 'Studio relaunch', language: 'Malay' })).toEqual({ success: true, hooks: '- Hook one' });
    expect((await call('POST', '/ai/generate-script', { brand: 'LUM' })).script).toBe('- Hook one');
    expect((await call('POST', '/ai/generate-image-prompts', {})).prompts).toBe('- Hook one');
    expect(ctx.ai.requests).toHaveLength(3);
    expect(ctx.ai.requests[0].prompt).toContain('Client / Brand: NEX');
    expect(ctx.ai.requests[0].system).toContain('Bahasa Melayu');
    const formatted = await call('POST', '/ai/format-prompt', { brand: 'ACME', title: 'Spring launch' });
    expect(formatted.prompt).toContain('**Campaign Title**: Spring launch');
    expect(ctx.ai.requests).toHaveLength(3);
  });
});

describe('ai prompt templates', () => {
  it('are ASCII only and fill defaults from the sample clients', () => {
    const all = [hooksPrompt(), scriptPrompt(), imagePromptsPrompt()].flatMap((r) => [r.system, r.prompt]).concat(formatUltraPrompt());
    for (const t of all) expect(t).toMatch(/^[\x09\x0a\x20-\x7e]*$/);
    expect(hooksPrompt().prompt).toContain('Client / Brand: ACME');
    expect(scriptPrompt({ platform: 'TikTok' }).system).toContain('for TikTok');
  });
});
