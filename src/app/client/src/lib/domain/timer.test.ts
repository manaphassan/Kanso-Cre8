import { describe, expect, it } from 'vitest';
import { MemoryVaultFs } from '$lib/vault/memoryVaultFs';
import {
  defaultTimerState,
  formatSeconds,
  normalizeTimerState,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerView
} from './timer';

const T0 = Date.UTC(2026, 8, 15, 9, 0, 0);
const at = (ms: number) => new Date(T0 + ms);

describe('timer state transitions', () => {
  it('formats seconds as HH:MM:SS', () => {
    expect(formatSeconds(0)).toBe('00:00:00');
    expect(formatSeconds(3725.9)).toBe('01:02:05');
    expect(formatSeconds(-4)).toBe('00:00:00');
  });

  it('starts with epoch ms startedAt and normalised fields', () => {
    const s = startTimer({ clientCode: 'lum', hourlyRate: '140', accumulatedSeconds: 60, projectId: 7 }, at(0));
    expect(s).toMatchObject({
      isRunning: true, isPaused: false, startedAt: T0, accumulatedSeconds: 60,
      clientCode: 'LUM', hourlyRate: 140, projectId: '7', projectTitle: '', sessionNote: ''
    });
    expect(startTimer({ hourlyRate: 0 }, at(0)).hourlyRate).toBe(150);
    expect(startTimer(null, at(0)).clientCode).toBe('ACME');
  });

  it('computes elapsed and earnings from startedAt', () => {
    const s = startTimer({ hourlyRate: 150, accumulatedSeconds: 1800 }, at(0));
    const v = timerView(s, at(30 * 60 * 1000 + 999));
    expect(v.elapsedSeconds).toBe(3600);
    expect(v.formattedTime).toBe('01:00:00');
    expect(v.earnedAmount).toBe(150);
    expect(v).not.toHaveProperty('accumulatedMs');
    expect(timerView(s, at(-5000)).elapsedSeconds).toBe(1800);
  });

  it('keeps sub-second remainders across pause and resume', () => {
    let s = startTimer({}, at(0));
    s = pauseTimer(s, at(1600));
    expect(s).toMatchObject({ isRunning: false, isPaused: true, startedAt: null, accumulatedSeconds: 1 });
    s = resumeTimer(s, at(10_000));
    expect(s).toMatchObject({ isRunning: true, isPaused: false, startedAt: T0 + 10_000 });
    s = pauseTimer(s, at(11_600));
    // 1.6 s + 1.6 s = 3.2 s, not 1 + 1 = 2.
    expect(s.accumulatedSeconds).toBe(3);
    expect(timerView(s, at(99_000)).elapsedSeconds).toBe(3);
  });

  it('ignores pause when not running and resume when not paused', () => {
    const idle = defaultTimerState();
    expect(pauseTimer(idle, at(0))).toBe(idle);
    const running = startTimer({}, at(0));
    expect(resumeTimer(running, at(5000))).toBe(running);
  });

  it('normalises server-written and corrupt machine state', () => {
    expect(normalizeTimerState(null)).toEqual(defaultTimerState());
    expect(normalizeTimerState('x')).toEqual(defaultTimerState());
    const legacy = normalizeTimerState({ isRunning: true, startedAt: new Date(T0).toISOString(), accumulatedSeconds: 10 });
    expect(legacy.startedAt).toBe(T0);
    expect(timerView(legacy, at(5000)).elapsedSeconds).toBe(15);
    // accumulatedMs that disagrees with accumulatedSeconds is ignored.
    const edited = normalizeTimerState({ isPaused: true, accumulatedSeconds: 20, accumulatedMs: 3200 });
    expect(timerView(edited, at(0)).elapsedSeconds).toBe(20);
  });

  it('reset keeps client and rate', () => {
    const s = startTimer({ clientCode: 'NEX', hourlyRate: 110, projectId: 'p' }, at(0));
    expect(resetTimer(s)).toEqual({ ...defaultTimerState(), clientCode: 'NEX', hourlyRate: 110 });
  });
});

describe('stopTimer', () => {
  it('does not log sessions under 5 seconds', async () => {
    const fs = new MemoryVaultFs();
    const { result, next } = await stopTimer(fs, startTimer({ clientCode: 'NEX', hourlyRate: 110 }, at(0)), {}, at(4999));
    expect(result).toEqual({ success: true, totalSeconds: 4, sessionLog: null, invoice: null });
    expect(next).toMatchObject({ isRunning: false, startedAt: null, accumulatedSeconds: 0, clientCode: 'NEX', hourlyRate: 110 });
    expect(fs.paths().some((p) => p.startsWith('_Finance'))).toBe(false);
  });

  it('logs without appending when appendToInvoice is false', async () => {
    const fs = new MemoryVaultFs();
    const s = startTimer({ projectId: 'P1', sessionNote: 'sketch' }, at(0));
    const { result } = await stopTimer(fs, s, { appendToInvoice: false }, at(90_000));
    expect(result.sessionLog).toMatchObject({
      id: `log_${T0 + 90_000}`, projectTitle: 'Project P1', durationSeconds: 90, durationFormatted: '00:01:30',
      earnedAmount: 3.75, earnedFormatted: 'USD 3.75', note: 'sketch', appendedToInvoice: false,
      startedAt: new Date(T0).toISOString(), endedAt: at(90_000).toISOString()
    });
    expect(result.invoice).toBeNull();
    expect(fs.paths().some((p) => p.startsWith('_Finance'))).toBe(false);
  });

  it('fails softly when no vault is open', async () => {
    const { result } = await stopTimer(null, startTimer({}, at(0)), { note: '' }, at(60_000));
    expect(result.sessionLog).toMatchObject({ appendedToInvoice: false, note: '' });
    expect(result.sessionLog).not.toHaveProperty('invoiceDocumentNumber');
    expect(result.invoice).toBeNull();
  });

  it('back-dates startedAt from the total when paused', async () => {
    let s = startTimer({}, at(0));
    s = pauseTimer(s, at(120_000));
    const { result } = await stopTimer(null, s, { appendToInvoice: false }, at(500_000));
    expect(result.sessionLog.startedAt).toBe(at(500_000 - 120_000).toISOString());
  });
});
