/**
 * Billable chronometer. Port of server/services/TimerService.js.
 *
 * The running timer lives in the Machine tier only (key `timer`), never in the
 * vault. `startedAt` is epoch ms and elapsed time is always computed from it,
 * so restarts stay accurate. These functions are pure state transitions; the
 * route module loads and saves the state. On stop the session is appended to
 * the client's draft invoice.
 */

import type { VaultFs } from '$lib/vault/types';
import { appendSessionToInvoice } from './finance/convert';
import type { FinanceDocument } from './finance/model';

export const TIMER_KEY = 'timer';
const DEFAULT_RATE = 150;
const DEFAULT_CLIENT = 'ACME';
/** Sessions shorter than this are not logged (as the server did). */
export const MIN_SESSION_SECONDS = 5;

/** Machine-tier record. Same shape TimerService stored, plus `accumulatedMs`. */
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  /** Epoch ms of the current running stretch, null when stopped or paused. */
  startedAt: number | null;
  /** Whole banked seconds (what the UI reads). */
  accumulatedSeconds: number;
  /**
   * Exact banked milliseconds, so repeated pause/resume does not drop the
   * sub-second remainder. Optional: states written by the server lack it.
   */
  accumulatedMs?: number;
  projectId: string;
  projectTitle: string;
  clientCode: string;
  hourlyRate: number;
  sessionNote: string;
}

/** What `GET /system/timer` returns as `timer`. */
export interface TimerView extends Omit<TimerState, 'accumulatedMs'> {
  elapsedSeconds: number;
  formattedTime: string;
  earnedAmount: number;
}

// A type alias (not an interface) so it is assignable to convert.ts SessionInput.
export type SessionLog = {
  id: string;
  projectId: string;
  projectTitle: string;
  clientCode: string;
  hourlyRate: number;
  durationSeconds: number;
  durationFormatted: string;
  earnedAmount: number;
  earnedFormatted: string;
  startedAt: string;
  endedAt: string;
  note: string;
  appendedToInvoice: boolean;
  invoiceDocumentNumber?: string | null;
};

export interface StartInput {
  projectId?: unknown;
  projectTitle?: unknown;
  clientCode?: unknown;
  hourlyRate?: unknown;
  sessionNote?: unknown;
  accumulatedSeconds?: unknown;
}

export interface StopOptions {
  appendToInvoice?: unknown;
  note?: unknown;
}

export interface StopResult {
  success: true;
  totalSeconds: number;
  sessionLog: SessionLog | null;
  invoice: FinanceDocument | null;
  state: TimerView;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function defaultTimerState(): TimerState {
  return {
    isRunning: false,
    isPaused: false,
    startedAt: null,
    accumulatedSeconds: 0,
    projectId: '',
    projectTitle: '',
    clientCode: DEFAULT_CLIENT,
    hourlyRate: DEFAULT_RATE,
    sessionNote: ''
  };
}

const finite = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

function toEpochMs(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = finite(v);
  if (n !== null) return n;
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Banked milliseconds; trusts `accumulatedMs` only while it agrees with `accumulatedSeconds`. */
function bankedMs(state: TimerState): number {
  const secs = Math.max(0, state.accumulatedSeconds || 0);
  const ms = finite(state.accumulatedMs);
  if (ms !== null && ms >= 0 && Math.floor(ms / 1000) === Math.floor(secs)) return ms;
  return secs * 1000;
}

/** Defaults merged with whatever the Machine tier holds (as TimerService.getState). */
export function normalizeTimerState(raw: unknown): TimerState {
  const base = defaultTimerState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const merged = { ...base, ...(raw as Partial<TimerState>) } as TimerState;
  merged.isRunning = Boolean(merged.isRunning);
  merged.isPaused = Boolean(merged.isPaused);
  merged.startedAt = toEpochMs(merged.startedAt);
  merged.accumulatedSeconds = Math.max(0, finite(merged.accumulatedSeconds) ?? 0);
  return merged;
}

function elapsedMs(state: TimerState, now: Date): number {
  let ms = bankedMs(state);
  if (state.isRunning && state.startedAt) ms += Math.max(0, now.getTime() - state.startedAt);
  return ms;
}

export function timerView(state: TimerState, now: Date): TimerView {
  const { accumulatedMs: _ms, ...rest } = state;
  const elapsedSeconds = Math.floor(elapsedMs(state, now) / 1000);
  return {
    ...rest,
    elapsedSeconds,
    formattedTime: formatSeconds(elapsedSeconds),
    earnedAmount: round2((elapsedSeconds / 3600) * (state.hourlyRate || DEFAULT_RATE))
  };
}

/** A new running timer; `accumulatedSeconds` lets the UI carry banked time over. */
export function startTimer(input: StartInput | null | undefined, now: Date): TimerState {
  const i = input || {};
  const banked = Math.max(0, Number(i.accumulatedSeconds) || 0);
  return {
    isRunning: true,
    isPaused: false,
    startedAt: now.getTime(),
    accumulatedSeconds: Math.floor(banked),
    accumulatedMs: Math.round(banked * 1000),
    projectId: String(i.projectId || ''),
    projectTitle: String(i.projectTitle || ''),
    clientCode: String(i.clientCode || DEFAULT_CLIENT).toUpperCase(),
    hourlyRate: Math.max(0, Number(i.hourlyRate) || DEFAULT_RATE),
    sessionNote: String(i.sessionNote || '')
  };
}

/** Banks the running stretch. Unchanged when not running. */
export function pauseTimer(state: TimerState, now: Date): TimerState {
  if (!state.isRunning) return state;
  const ms = elapsedMs(state, now);
  return {
    ...state,
    isRunning: false,
    isPaused: true,
    startedAt: null,
    accumulatedSeconds: Math.floor(ms / 1000),
    accumulatedMs: ms
  };
}

/** Starts a new running stretch on top of the banked time. Unchanged when not paused. */
export function resumeTimer(state: TimerState, now: Date): TimerState {
  if (!state.isPaused) return state;
  return { ...state, isRunning: true, isPaused: false, startedAt: now.getTime() };
}

/** Clears the timer without logging; keeps client and rate (TimerService.reset). */
export function resetTimer(state: TimerState): TimerState {
  return { ...defaultTimerState(), clientCode: state.clientCode, hourlyRate: state.hourlyRate };
}

/**
 * Logs the session (when >= 5 s), appends it to the client's draft invoice
 * unless `appendToInvoice === false`, and returns the reset state to save.
 * `fs` may be null when no vault is open: the append then fails softly,
 * as a failed append did on the server.
 */
export async function stopTimer(
  fs: VaultFs | null,
  state: TimerState,
  options: StopOptions | null | undefined,
  now: Date
): Promise<{ result: Omit<StopResult, 'state'>; next: TimerState }> {
  const opts = options || {};
  const current = timerView(state, now);
  const totalSeconds = current.elapsedSeconds;
  const note = opts.note !== null && opts.note !== undefined ? String(opts.note) : current.sessionNote;
  const append = opts.appendToInvoice !== false && opts.appendToInvoice !== 'false';

  let sessionLog: SessionLog | null = null;
  let invoice: FinanceDocument | null = null;

  if (totalSeconds >= MIN_SESSION_SECONDS) {
    const rate = current.hourlyRate || DEFAULT_RATE;
    const earned = round2((totalSeconds / 3600) * rate);
    sessionLog = {
      id: `log_${now.getTime()}`,
      projectId: current.projectId,
      projectTitle: current.projectTitle || (current.projectId ? `Project ${current.projectId}` : 'Creative Work'),
      clientCode: current.clientCode || DEFAULT_CLIENT,
      hourlyRate: rate,
      durationSeconds: totalSeconds,
      durationFormatted: current.formattedTime,
      earnedAmount: earned,
      earnedFormatted: `USD ${earned.toFixed(2)}`,
      // As the server: the current stretch's start when running, else back-dated from the total.
      startedAt: new Date(current.startedAt ?? now.getTime() - totalSeconds * 1000).toISOString(),
      endedAt: now.toISOString(),
      note,
      appendedToInvoice: false
    };

    if (append) {
      try {
        if (!fs) throw new Error('No vault is open.');
        invoice = await appendSessionToInvoice(fs, sessionLog.clientCode, sessionLog, now);
        sessionLog.appendedToInvoice = true;
        sessionLog.invoiceDocumentNumber = invoice ? invoice.documentNumber : null;
      } catch (err: any) {
        console.warn('[timer] Failed to append session to draft invoice:', err?.message);
      }
    }
  }

  const next: TimerState = {
    isRunning: false,
    isPaused: false,
    startedAt: null,
    accumulatedSeconds: 0,
    projectId: '',
    projectTitle: '',
    clientCode: current.clientCode || DEFAULT_CLIENT,
    hourlyRate: current.hourlyRate || DEFAULT_RATE,
    sessionNote: ''
  };

  return { result: { success: true, totalSeconds, sessionLog, invoice }, next };
}
