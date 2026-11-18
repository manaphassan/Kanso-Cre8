/**
 * The four Creative AI assistant actions as prompt templates (P3.3). Port of
 * server/services/GeminiService.js. Hooks, script and image prompts are sent
 * to the model through `ctx.ai.complete`; the formatted prompt is a template
 * the user copies into any AI chat, so it makes no request.
 */

import type { AiRequest } from '$lib/local/ai';

const text = (v: unknown, fallback: string) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return (s || fallback).slice(0, 2000);
};

export interface HooksInput {
  brand?: string;
  product?: string;
  audience?: string;
  angle?: string;
  language?: string;
}

export function hooksPrompt(input: HooksInput = {}): AiRequest {
  const malay = String(input.language || '').toLowerCase() === 'malay';
  return {
    system: [
      'You are a world-class direct-response copywriter for a freelance design studio.',
      'Write advertising hooks that capture attention within the first 3 seconds on TikTok, LinkedIn, Meta and X.',
      `Language: ${malay ? 'relaxed, persuasive, natural Bahasa Melayu' : 'high-impact persuasive English with sharp clarity'}.`,
      'Always give 5 hooks, one per category:',
      '1. Curiosity / pattern interrupt',
      '2. Pain point / agitation',
      '3. Social proof / transformation',
      '4. Urgency / FOMO',
      '5. Relatable storytelling',
      '',
      'Format as clean, ready-to-use Markdown bullets.'
    ].join('\n'),
    prompt: [
      `Client / Brand: ${text(input.brand, 'ACME')}`,
      `Product / Campaign: ${text(input.product, 'Digital Asset Platform')}`,
      `Target Audience: ${text(input.audience, 'Founders and Product Leads')}`,
      `Primary Angle: ${text(input.angle, 'Pain Point')}`,
      '',
      'Write the 5 categorized hooks now:'
    ].join('\n')
  };
}

export interface ScriptInput {
  brand?: string;
  product?: string;
  hook?: string;
  platform?: string;
  language?: string;
}

export function scriptPrompt(input: ScriptInput = {}): AiRequest {
  const platform = text(input.platform, 'Meta Feed');
  return {
    system: [
      'You are an elite creative director and conversion copywriter for a freelance design studio.',
      `Write a full, ready-to-run advertising script for ${platform}. Include:`,
      '- Opening hook (with on-screen text cues)',
      '- Agitation and problem breakdown',
      '- Solution and how it works',
      '- Quality and licensing standards',
      '- One strong call to action',
      '',
      `Language: ${text(input.language, 'English')}. Use clean Markdown that can go straight into 03_COPY/COPY.md.`
    ].join('\n'),
    prompt: [
      `Client / Brand: ${text(input.brand, 'ACME')}`,
      `Product / Asset: ${text(input.product, 'Creative Assets')}`,
      `Opening Hook: ${text(input.hook, 'Write a strong hook')}`,
      `Platform: ${platform}`,
      '',
      'Write the complete script:'
    ].join('\n')
  };
}

export interface ImagePromptsInput {
  product?: string;
  style?: string;
  environment?: string;
  brandColors?: string;
}

export function imagePromptsPrompt(input: ImagePromptsInput = {}): AiRequest {
  return {
    system: [
      'You are a commercial studio photographer and prompt engineer for image models such as Midjourney and Imagen.',
      'Write 4 distinct, photorealistic commercial photography prompts for ad mockups, social banners and design deliverables.',
      'For each prompt include:',
      '- The prompt text (lighting, lens such as 85mm f/1.4, render details)',
      '- An aspect ratio tag (--ar 1:1, --ar 9:16 or --ar 16:9)',
      '- Short visual style notes'
    ].join('\n'),
    prompt: [
      `Product / Subject: ${text(input.product, 'Creative asset packaging')}`,
      `Style: ${text(input.style, 'Photorealistic Studio')}`,
      `Environment / Backdrop: ${text(input.environment, 'Minimalist dark studio')}`,
      `Brand Color Accents: ${text(input.brandColors, 'Sky cyan, dark zinc')}`,
      '',
      'Write the 4 prompt variations:'
    ].join('\n')
  };
}

export interface UltraPromptInput {
  brand?: string;
  title?: string;
  audience?: string;
  goal?: string;
}

/** A complete campaign brief to paste into any AI chat (no request is made). */
export function formatUltraPrompt(input: UltraPromptInput = {}): string {
  const brand = text(input.brand, 'ACME');
  return `# KANSO CRE8 CAMPAIGN PROMPT

You are the Lead Creative Director for **${brand}**.

## Project Context
- **Campaign Title**: ${text(input.title, 'Product Campaign')}
- **Brand / Client**: ${brand}
- **Target Audience**: ${text(input.audience, 'B2B Buyers and Designers')}
- **Primary Objective**: ${text(input.goal, 'High CTR Direct Response')}

## Studio Guidelines
1. **Tone**: Confident, tactile, authoritative yet conversational. Minimal and uncluttered.
2. **Format**: Plain Markdown, high contrast, easy to scan.
3. **Pacing**: Hook within the first 3 seconds, short agitation, clear transformation, one frictionless CTA.

## Request
Please write:
1. **5 Opening Hooks** (Curiosity, Pain Point, Proof, Urgency, Story).
2. **A Full Video or Feed Script** with scene directions [Scene: ...] and voiceover.
3. **3 Closing Messages** with clear call-to-action choices.
`;
}
