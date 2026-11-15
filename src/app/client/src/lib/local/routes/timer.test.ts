import { describe, expect, it } from 'vitest';
import { routeHarness, TEST_NOW } from '../testing';
import { timerRoutes } from './timer';

const ACME_PROJECT = '202609_0001D_ACME_MobileAppIllustration';

function harness() {
  const h = routeHarness([timerRoutes], { sample: true });
  const advance = (ms: number) => {
    const d = new Date(TEST_NOW.getTime() + ms);
    h.fs.now = () => d;
    h.ctx.now = () => d;
  };
  return { ...h, advance };
}

const invoicePaths = (fs: { paths(): string[] }) => fs.paths().filter((p) => /^_Finance\/Invoices\/.+\.md$/.test(p));

describe('timer routes on the sample vault', () => {
  it('returns the default state when nothing is stored, on both paths', async () => {
    const { call } = harness();
    const res = await call('GET', '/system/timer');
    expect(res).toEqual({
      success: true,
      timer: {
        isRunning: false, isPaused: false, startedAt: null, accumulatedSeconds: 0, projectId: '', projectTitle: '',
        clientCode: 'ACME', hourlyRate: 150, sessionNote: '', elapsedSeconds: 0, formattedTime: '00:00:00', earnedAmount: 0
      }
    });
    expect(await call('GET', '/timer')).toEqual(res);
  });

  it('runs the server lifecycle: machine tier only, pause/resume, stop appends to a draft invoice', async () => {
    const { call, ctx, fs, events, advance } = harness();
    const before = invoicePaths(fs);

    const started = await call('POST', '/system/timer/start', {
      projectId: ACME_PROJECT,
      projectTitle: 'Mobile App 3D Assets',
      clientCode: 'ACME',
      hourlyRate: 150,
      sessionNote: 'Isometric icon rendering',
      accumulatedSeconds: 1800
    });
    expect(started.success).toBe(true);
    expect(started.timer).toMatchObject({ isRunning: true, startedAt: TEST_NOW.getTime(), elapsedSeconds: 1800, formattedTime: '00:30:00', earnedAmount: 75 });

    const machine = await ctx.machine.get<any>('timer');
    expect(machine).toMatchObject({ isRunning: true, startedAt: started.timer.startedAt, accumulatedSeconds: 1800 });
    expect(fs.paths().some((p) => /timer\.json$/i.test(p))).toBe(false);

    // A restart reads startedAt back from the machine tier.
    advance(10 * 60 * 1000 + 500);
    const live = await call('GET', '/system/timer');
    expect(live.timer.elapsedSeconds).toBe(2400);
    expect(live.timer.earnedAmount).toBe(100);

    const paused = await call('POST', '/system/timer/pause');
    expect(paused.timer).toMatchObject({ isRunning: false, isPaused: true, startedAt: null, accumulatedSeconds: 2400 });

    advance(60 * 60 * 1000); // time while paused does not count
    expect((await call('GET', '/timer')).timer.elapsedSeconds).toBe(2400);

    const resumed = await call('POST', '/timer/resume');
    expect(resumed.timer).toMatchObject({ isRunning: true, isPaused: false, startedAt: TEST_NOW.getTime() + 3_600_000 });

    advance(60 * 60 * 1000 + 20 * 60 * 1000 + 500); // +20 min, plus the earlier 0.5 s remainder
    const stopped = await call('POST', '/system/timer/stop', { appendToInvoice: true, note: 'Final sprint sign-off' });
    expect(stopped.success).toBe(true);
    expect(stopped.totalSeconds).toBe(3601);
    expect(stopped.sessionLog).toMatchObject({
      projectId: ACME_PROJECT, projectTitle: 'Mobile App 3D Assets', clientCode: 'ACME', hourlyRate: 150,
      durationSeconds: 3601, durationFormatted: '01:00:01', note: 'Final sprint sign-off', appendedToInvoice: true
    });
    // ACME's only sample invoice is paid, so a new draft is created.
    expect(stopped.invoice).toMatchObject({ documentNumber: 'INV-2026-004', status: 'draft', clientCode: 'ACME' });
    expect(stopped.sessionLog.invoiceDocumentNumber).toBe('INV-2026-004');
    expect(stopped.state).toMatchObject({ isRunning: false, isPaused: false, startedAt: null, elapsedSeconds: 0, clientCode: 'ACME', hourlyRate: 150 });

    const created = invoicePaths(fs).filter((p) => !before.includes(p));
    expect(created).toHaveLength(1);
    const text = await fs.readText(created[0]);
    expect(text).toContain('Mobile App 3D Assets: Final sprint sign-off (01:00:01)');

    expect(await ctx.machine.get('timer')).toMatchObject({ isRunning: false, startedAt: null, accumulatedSeconds: 0, projectId: '' });
    expect(events.map((e) => e.event)).toEqual(['timer:started', 'timer:paused', 'timer:resumed', 'timer:stopped', 'finance:session-appended']);
    expect(events[3].data).toMatchObject({ timer: { isRunning: false }, sessionLog: { appendedToInvoice: true } });
    expect(events[4].data).toMatchObject({ invoice: { documentNumber: 'INV-2026-004' } });
  });

  it('appends to the client\'s existing draft invoice', async () => {
    const { call, fs, advance } = harness();
    const before = invoicePaths(fs);
    await call('POST', '/timer/start', { clientCode: 'lum', hourlyRate: 140, projectTitle: 'Design System' });
    advance(30 * 60 * 1000);
    const res = await call('POST', '/timer/stop', {});
    expect(res.invoice.documentNumber).toBe('INV-2026-003');
    expect(res.invoice.items).toHaveLength(2);
    expect(res.invoice.items[1]).toMatchObject({ quantity: 0.5, unitPrice: 140, amount: 70 });
    expect(invoicePaths(fs)).toEqual(before);
    expect(await fs.readText('_Finance/Invoices/INV-2026-003_LUM.md')).toContain('Design System: Focus chronometer session (00:30:00)');
  });

  it('stops without touching invoices when appendToInvoice is false or the session is short', async () => {
    const { call, fs, events, advance } = harness();
    const snapshot = async () => Promise.all(invoicePaths(fs).map((p) => fs.readText(p)));
    const before = await snapshot();

    await call('POST', '/system/timer/start', { clientCode: 'NEX', hourlyRate: 110 });
    advance(120_000);
    const kept = await call('POST', '/system/timer/stop', { appendToInvoice: false });
    expect(kept.sessionLog).toMatchObject({ durationSeconds: 120, appendedToInvoice: false, clientCode: 'NEX' });
    expect(kept.invoice).toBeNull();

    await call('POST', '/system/timer/start', { clientCode: 'NEX' });
    advance(123_000);
    const short = await call('POST', '/system/timer/stop');
    expect(short).toMatchObject({ success: true, totalSeconds: 3, sessionLog: null, invoice: null });
    // The reset state keeps the client and rate for the next session.
    expect(short.state).toMatchObject({ clientCode: 'NEX', hourlyRate: 150 });

    expect(await snapshot()).toEqual(before);
    expect(events.some((e) => e.event === 'finance:session-appended')).toBe(false);
  });

  it('serialises calls fired without awaiting', async () => {
    const { call, advance } = harness();
    const start = call('POST', '/system/timer/start', { accumulatedSeconds: 10 });
    const pause = call('POST', '/system/timer/pause');
    const state = call('GET', '/system/timer');
    await start;
    advance(5000);
    expect((await pause).timer).toMatchObject({ isPaused: true });
    expect((await state).timer).toMatchObject({ isPaused: true, isRunning: false });
  });

  it('pause and resume are no-ops in the wrong state', async () => {
    const { call, ctx } = harness();
    expect((await call('POST', '/system/timer/pause')).timer).toMatchObject({ isRunning: false, isPaused: false });
    expect((await call('POST', '/system/timer/resume')).timer).toMatchObject({ isRunning: false, isPaused: false });
    expect(await ctx.machine.get('timer')).toBeNull();
  });
});
