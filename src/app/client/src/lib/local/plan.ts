/**
 * What the free Kanso Zen tier includes and what needs Kanso Studio Pro (D3).
 *
 * Rule: a missing or lapsed licence never locks you out of your own data.
 * Reading, editing, printing and exporting what already exists stays free;
 * only creating new commercial work is gated.
 *
 * Pro: new quotes and invoices, quote conversion (to an invoice or to a
 * project with an invoice), adding timer sessions to invoices, the client
 * handover ZIP, and more than FREE_CLIENT_LIMIT clients.
 */

import type { LocalContext } from './context';
import { LocalHttpError } from './router';

export const FREE_CLIENT_LIMIT = 3;

export const proMessage = (what: string) => `${what} needs Kanso Studio Pro. Add your licence key in Settings > About.`;

/** 402 Payment Required, with a sentence the views show as is. */
export const proRequired = (what: string) => new LocalHttpError(402, proMessage(what));

export async function isPro(ctx: LocalContext): Promise<boolean> {
  return (await ctx.licenseTier()) === 'pro';
}

export async function requirePro(ctx: LocalContext, what: string): Promise<void> {
  if (!(await isPro(ctx))) throw proRequired(what);
}
