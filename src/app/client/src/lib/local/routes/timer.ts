/**
 * Local routes for the billable chronometer (P2.7). Mirrors the timer routes
 * in server/routes/finance.js. State lives in the Machine tier only.
 */

import {
  TIMER_KEY,
  normalizeTimerState,
  pauseTimer,
  resumeTimer,
  startTimer,
  stopTimer,
  timerView,
  type TimerState
} from '$lib/domain/timer';
import type { LocalContext } from '../context';
import type { LocalRouter } from '../router';

// Header clicks fire start/pause/stop without awaiting; run them one at a time
// so a read never sees a half-finished write.
const queues = new WeakMap<object, Promise<unknown>>();

function serial<T>(ctx: LocalContext, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(ctx.machine) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  queues.set(ctx.machine, next);
  return next;
}

const load = async (ctx: LocalContext) => normalizeTimerState(await ctx.machine.get(TIMER_KEY));
const save = (ctx: LocalContext, state: TimerState) => ctx.machine.set(TIMER_KEY, state);

export function timerRoutes(router: LocalRouter): void {
  router.get(['/system/timer', '/timer'], ({ ctx }) =>
    serial(ctx, async () => ({ success: true, timer: timerView(await load(ctx), ctx.now()) }))
  );

  router.post(['/system/timer/start', '/timer/start'], ({ ctx, body }) =>
    serial(ctx, async () => {
      const now = ctx.now();
      const state = startTimer(body, now);
      await save(ctx, state);
      const timer = timerView(state, now);
      ctx.bus.emit('timer:started', { timer });
      return { success: true, timer };
    })
  );

  router.post(['/system/timer/pause', '/timer/pause'], ({ ctx }) =>
    serial(ctx, async () => {
      const now = ctx.now();
      const current = await load(ctx);
      const state = pauseTimer(current, now);
      if (state !== current) await save(ctx, state);
      const timer = timerView(state, now);
      ctx.bus.emit('timer:paused', { timer });
      return { success: true, timer };
    })
  );

  router.post(['/system/timer/resume', '/timer/resume'], ({ ctx }) =>
    serial(ctx, async () => {
      const now = ctx.now();
      const current = await load(ctx);
      const state = resumeTimer(current, now);
      if (state !== current) await save(ctx, state);
      const timer = timerView(state, now);
      ctx.bus.emit('timer:resumed', { timer });
      return { success: true, timer };
    })
  );

  router.post(['/system/timer/stop', '/timer/stop'], ({ ctx, body }) =>
    serial(ctx, async () => {
      const now = ctx.now();
      const current = await load(ctx);
      const wantsInvoice = body?.appendToInvoice !== false && body?.appendToInvoice !== 'false';
      const fs = wantsInvoice ? await ctx.vault().catch(() => null) : null;
      const { result, next } = await stopTimer(fs, current, body, now);
      await save(ctx, next);
      const state = timerView(next, now);
      ctx.bus.emit('timer:stopped', { timer: state, sessionLog: result.sessionLog });
      if (result.invoice) ctx.bus.emit('finance:session-appended', { invoice: result.invoice });
      return { ...result, state };
    })
  );
}
