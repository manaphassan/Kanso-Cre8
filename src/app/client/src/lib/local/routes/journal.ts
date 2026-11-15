/**
 * Bullet Journal routes (P2.3). Mirrors server/routes/journal.js: same paths,
 * body fields, response keys and event names. "Today" is the local calendar
 * date of `ctx.now()`.
 */

import { JournalInputError, addDays, assertDate, isoWeek, localDate, localMonth, localYear } from '$lib/domain/journal/dates';
import { getDailyNote, listDailyNotes, saveDailyNote } from '$lib/domain/journal/daily';
import { getHabitHistory, getHabitWeeklyMatrix, toggleDailyHabit } from '$lib/domain/journal/habits';
import { readInvoiceSummaries } from '$lib/domain/finance/summaries';
import { getPendingRollover, migrateTasks } from '$lib/domain/journal/migration';
import {
  getMonthlyReview,
  getMonthlyReviews,
  getWeeklyReview,
  getWeeklyReviews,
  getYearlyIndex,
  getYearlyIndexes,
  saveMonthlyReview,
  saveWeeklyReview,
  saveYearlyIndex
} from '$lib/domain/journal/reviews';
import { monthlyTelemetry, weeklyTelemetry, yearlyTelemetry } from '$lib/domain/journal/telemetry';
import { allProjects } from '../projectIndex';
import { badRequest, type Handler, type LocalRouter } from '../router';

/** Maps journal input errors (bad date, missing field) to HTTP 400. */
const guard =
  (handler: Handler): Handler =>
  async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof JournalInputError) throw badRequest(err.message);
      throw err;
    }
  };

export function journalRoutes(router: LocalRouter): void {
  const get = (p: string | string[], h: Handler) => router.get(p, guard(h));
  const post = (p: string | string[], h: Handler) => router.post(p, guard(h));

  // --- Daily ----------------------------------------------------------------

  get(['/journal/daily', '/journal/daily/:date'], async ({ ctx, params }) => {
    const date = params.date || localDate(ctx.now());
    const note = await getDailyNote(await ctx.vault(), date, ctx.now());
    return { success: true, date, note, raw: note.rawMarkdown };
  });

  get('/journal/daily-list', async ({ ctx }) => ({ success: true, notes: await listDailyNotes(await ctx.vault()) }));

  post('/journal/daily', async ({ ctx, body }) => {
    const saved = await saveDailyNote(await ctx.vault(), body, ctx.now());
    ctx.bus.emit('journal:updated', { date: saved.date, note: saved });
    return { success: true, note: saved };
  });

  post('/journal/daily/:date/habits', async ({ ctx, params, body }) => {
    const habitId = body?.habitId;
    if (!habitId) throw badRequest('habitId is required');
    const note = await toggleDailyHabit(await ctx.vault(), params.date, String(habitId), ctx.now());
    ctx.bus.emit('journal:updated', { note });
    return { success: true, note };
  });

  get('/journal/habits/matrix', async ({ ctx, query }) => {
    const ref = query.date || query.endDate || localDate(ctx.now());
    return { success: true, matrix: await getHabitWeeklyMatrix(await ctx.vault(), ref, ctx.now()) };
  });

  get('/journal/habits/history', async ({ ctx, query }) => {
    const days = parseInt(query.days, 10) || 30;
    const ref = query.date || localDate(ctx.now());
    return { success: true, ...(await getHabitHistory(await ctx.vault(), days, ref, ctx.now())) };
  });

  // --- Rollover -------------------------------------------------------------

  get('/journal/rollover-check', async ({ ctx, query }) => {
    const today = query.date ? assertDate(query.date) : localDate(ctx.now());
    return { success: true, rollover: await getPendingRollover(await ctx.vault(), today, ctx.now()) };
  });

  post('/journal/migrate-tasks', async ({ ctx, body }) => {
    const { fromDate, toDate, taskIndices, selectedTaskIds } = body || {};
    const to = toDate ? assertDate(toDate) : localDate(ctx.now());
    const from = fromDate || addDays(to, -1);
    const result = await migrateTasks(await ctx.vault(), from, to, taskIndices || selectedTaskIds || null, ctx.now());
    if (result.success) ctx.bus.emit('journal:migrated', { result });
    return { success: true, ...result };
  });

  // --- Monthly --------------------------------------------------------------

  get('/journal/monthly', async ({ ctx }) => ({ success: true, reviews: await getMonthlyReviews(await ctx.vault()) }));

  get('/journal/monthly/:month', async ({ ctx, params }) => {
    const month = params.month || localMonth(ctx.now());
    return { success: true, month, review: await getMonthlyReview(await ctx.vault(), month) };
  });

  post('/journal/monthly', async ({ ctx, body }) => {
    const review = await saveMonthlyReview(await ctx.vault(), body);
    ctx.bus.emit('journal:monthly:saved', { review });
    return { success: true, review };
  });

  get('/journal/monthly/:month/telemetry', async ({ ctx, params }) => {
    const month = params.month || localMonth(ctx.now());
    const fs = await ctx.vault();
    const telemetry = monthlyTelemetry(month, await readInvoiceSummaries(fs, ctx.now()), await allProjects(ctx));
    return { success: true, month, telemetry };
  });

  // --- Yearly ---------------------------------------------------------------

  get('/journal/yearly', async ({ ctx }) => {
    const indexes = await getYearlyIndexes(await ctx.vault());
    return { success: true, reviews: indexes, indexes };
  });

  get('/journal/yearly/:year', async ({ ctx, params }) => {
    const year = params.year || localYear(ctx.now());
    return { success: true, year, review: await getYearlyIndex(await ctx.vault(), year) };
  });

  post('/journal/yearly', async ({ ctx, body }) => {
    const review = await saveYearlyIndex(await ctx.vault(), body);
    ctx.bus.emit('journal:yearly:saved', { review });
    return { success: true, review };
  });

  get('/journal/yearly/:year/telemetry', async ({ ctx, params }) => {
    const year = params.year || localYear(ctx.now());
    const fs = await ctx.vault();
    const telemetry = yearlyTelemetry(year, await readInvoiceSummaries(fs, ctx.now()), await allProjects(ctx));
    return { success: true, year, telemetry };
  });

  // --- Weekly ---------------------------------------------------------------

  get('/journal/weekly', async ({ ctx, query }) => {
    const date = query.date || localDate(ctx.now());
    const fs = await ctx.vault();
    return { success: true, telemetry: await weeklyTelemetry(fs, date, await readInvoiceSummaries(fs, ctx.now()), ctx.now()) };
  });

  get('/journal/weekly-reviews', async ({ ctx }) => ({ success: true, reviews: await getWeeklyReviews(await ctx.vault(), ctx.now()) }));

  get(['/journal/weekly-review', '/journal/weekly-review/:week'], async ({ ctx, params, query }) => {
    const week = params.week || query.week || isoWeek(localDate(ctx.now()));
    return { success: true, week, review: await getWeeklyReview(await ctx.vault(), week, ctx.now()) };
  });

  post('/journal/weekly-review', async ({ ctx, body }) => {
    const review = await saveWeeklyReview(await ctx.vault(), body, ctx.now());
    ctx.bus.emit('journal:weekly:saved', { review });
    return { success: true, review };
  });
}
