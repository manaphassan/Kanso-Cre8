import { describe, expect, it } from 'vitest';
import { routeHarness } from '../testing';
import { journalRoutes } from './journal';

const B = '\u2022';

const DAY_0908 = `---
date: 2026-09-08
title: Tuesday, September 8, 2026
tags: [journal, bujo, daily]
---

# Tuesday, September 8, 2026

## Focus Intentions
- [x] Initial design sprint

## Rapid Log
${B} [x] Completed logo vectorization
${B} [ ] Unfinished packaging box dieline
* Priority: Client contract review call
o Meeting with Art Director
- Note: Color preference is sky blue
`;

const harness = (files?: Record<string, string>) => routeHarness([journalRoutes], { sample: true, files });

describe('journal daily notes', () => {
  it('parses BuJo symbols from the sample vault', async () => {
    const { call } = harness();
    const res = await call('GET', '/journal/daily/2026-09-14');
    expect(res.success).toBe(true);
    expect(res.date).toBe('2026-09-14');
    expect(res.note.title).toBe('Monday, September 14, 2026');
    expect(res.note.focusIntentions).toEqual(['Deep visual craft', 'Zero distraction sprint', 'On-time proof delivery']);
    expect(res.note.entries.map((e: any) => [e.type, e.completed])).toEqual([
      ['priority', false],
      ['task', false],
      ['task', false],
      ['event', false],
      ['note', false]
    ]);
    expect(res.note.entries[0]).toMatchObject({ id: 'entry_2026-09-14_1', text: 'Finalize mobile illustrations for Acme Corp' });
    expect(res.note.entries[4].text).toBe('Client preferred deeper cobalt blue on card gradients');
    expect(res.raw).toBe(res.note.rawMarkdown);
  });

  it('returns the default template for a missing day without writing it', async () => {
    const { call, fs } = harness();
    const res = await call('GET', '/journal/daily');
    expect(res.date).toBe('2026-09-15');
    expect(res.note.title).toBe('Tuesday, September 15, 2026');
    expect(res.note.entries.map((e: any) => e.type)).toEqual(['priority', 'task']);
    expect(res.note.updatedAt).toBe('2026-09-15T09:00:00.000Z');
    expect(fs.paths()).not.toContain('_Journal/Daily/2026-09-15.md');
  });

  it('saves a note, round-trips habits and emits journal:updated', async () => {
    const { call, fs, events } = harness();
    const res = await call('POST', '/journal/daily', {
      date: '2026-09-16',
      title: 'Wednesday Log',
      habits: ['focus_sprint', 'daily_sketch'],
      focusIntentions: ['Deep craft'],
      entries: [
        { id: 'e1', type: 'task', text: 'Design graph visualization', completed: false },
        { id: 'e2', type: 'task', text: 'Ship proofs', completed: true },
        { id: 'e3', type: 'priority', text: 'Client call' }
      ]
    });
    expect(res.note.habits).toEqual(['focus_sprint', 'daily_sketch']);
    expect(res.note.entries.map((e: any) => e.type)).toEqual(['task', 'done', 'priority']);
    const text = await fs.readText('_Journal/Daily/2026-09-16.md');
    expect(text).toContain("date: '2026-09-16'");
    expect(text).toContain('habits:\n  - focus_sprint\n  - daily_sketch');
    expect(text).toContain(`## Rapid Log\n${B} [ ] Design graph visualization\n${B} [x] Ship proofs\n* Priority: Client call\n`);
    expect(events.find((e) => e.event === 'journal:updated')?.data).toMatchObject({ date: '2026-09-16' });

    const back = await call('GET', '/journal/daily/2026-09-16');
    expect(back.note.title).toBe('Wednesday Log');
    expect(back.note.habits).toEqual(['focus_sprint', 'daily_sketch']);
  });

  it('lists daily notes newest first', async () => {
    const { call } = harness();
    const res = await call('GET', '/journal/daily-list');
    expect(res.notes.map((n: any) => n.date)).toEqual(['2026-09-18', '2026-09-16', '2026-09-14', '2026-09-13', '2026-09-10', '2026-09-09']);
    expect(res.notes[0]).toMatchObject({ filename: '2026-09-18.md' });
  });

  it('rejects bad dates and missing fields with 400', async () => {
    const { call, fs } = harness();
    await expect(call('GET', '/journal/daily/..%2F..%2Fescape')).rejects.toMatchObject({ status: 400 });
    await expect(call('GET', '/journal/daily/2026-02-30')).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/journal/daily', {})).rejects.toThrow('Valid date is required to save a daily note.');
    await expect(call('POST', '/journal/daily', { date: '../x' })).rejects.toMatchObject({ status: 400 });
    await expect(call('POST', '/journal/daily/2026-09-16/habits', {})).rejects.toThrow('habitId is required');
    expect(fs.paths().some((p) => p.includes('escape') || p === 'x.md')).toBe(false);
  });
});

describe('journal habits', () => {
  it('toggles habits and builds the weekly matrix and history', async () => {
    const { call, fs } = harness();
    const on = await call('POST', '/journal/daily/2026-09-16/habits', { habitId: 'inbox_zero' });
    expect(on.note.habits).toEqual(['inbox_zero']);
    await call('POST', '/journal/daily/2026-09-16/habits', { habitId: 'focus_sprint' });
    const off = await call('POST', '/journal/daily/2026-09-16/habits', { habitId: 'focus_sprint' });
    expect(off.note.habits).toEqual(['inbox_zero']);
    expect(await fs.readText('_Journal/Daily/2026-09-16.md')).toContain('habits:\n  - inbox_zero');

    const { matrix } = await call('GET', '/journal/habits/matrix?date=2026-09-16');
    expect(matrix.map((m: any) => `${m.dayName} ${m.date}`)).toEqual([
      'Mon 2026-09-14',
      'Tue 2026-09-15',
      'Wed 2026-09-16',
      'Thu 2026-09-17',
      'Fri 2026-09-18',
      'Sat 2026-09-19',
      'Sun 2026-09-20'
    ]);
    expect(matrix[2].habits).toEqual(['inbox_zero']);

    const history = await call('GET', '/journal/habits/history?days=3&date=2026-09-16');
    expect(history.daysCount).toBe(7);
    expect(history.history.at(-1)).toEqual({ date: '2026-09-16', dayName: 'Wed', dayNumber: 16, habits: ['inbox_zero'], count: 1 });
    expect(history.stats).toEqual({ totalCompletions: 1, currentStreak: 1, maxStreak: 1, avgPerDay: 0.1 });
  });
});

describe('journal rollover', () => {
  it('finds the latest earlier day with open tasks and migrates all of them', async () => {
    const { call, fs, events } = harness();
    const { rollover } = await call('GET', '/journal/rollover-check');
    expect(rollover).toMatchObject({ hasTasks: true, fromDate: '2026-09-14', count: 3 });

    const res = await call('POST', '/journal/migrate-tasks', {});
    expect(res).toMatchObject({ success: true, migratedCount: 3, message: 'Successfully migrated 3 task(s) from 2026-09-14 to 2026-09-15.' });
    expect(res.fromNote.entries.filter((e: any) => e.type === 'migrated')).toHaveLength(3);
    expect(res.toNote.entries.map((e: any) => e.id)).toContain('entry_2026-09-15_migrated_3');
    expect(events.map((e) => e.event)).toContain('journal:migrated');

    const source = await fs.readText('_Journal/Daily/2026-09-14.md');
    expect(source).toContain(`${B} [>] Finalize mobile illustrations for Acme Corp`);
    expect(source).toContain(`${B} [>] Export 4K PNG assets with transparent alpha`);
    const today = (await call('GET', '/journal/daily/2026-09-15')).note;
    expect(today.entries.map((e: any) => e.text)).toEqual(
      expect.arrayContaining(['Finalize mobile illustrations for Acme Corp', 'Export 4K PNG assets with transparent alpha', 'Send invoice draft INV-2026-001 to Nexus Studio'])
    );

    // 2026-09-14 is now clean, so the check walks back to 2026-09-13 (open priority).
    expect((await call('GET', '/journal/rollover-check?date=2026-09-15')).rollover).toMatchObject({ fromDate: '2026-09-13', count: 1 });
  });

  it('migrates only the selected tasks and skips duplicates (server cases)', async () => {
    const { call } = harness({ '_Journal/Daily/2026-09-08.md': DAY_0908 });
    const parsed = (await call('GET', '/journal/daily/2026-09-08')).note;
    expect(parsed.entries).toHaveLength(5);
    expect(parsed.entries.find((e: any) => e.type === 'done').completed).toBe(true);
    expect(parsed.entries.find((e: any) => e.type === 'priority').text).toBe('Client contract review call');
    expect(parsed.focusIntentions).toEqual(['Initial design sprint']);

    const priority = parsed.entries.find((e: any) => e.type === 'priority');
    const res = await call('POST', '/journal/migrate-tasks', { fromDate: '2026-09-08', toDate: '2026-09-09', selectedTaskIds: [priority.id] });
    expect(res.migratedCount).toBe(1);
    const day9 = (await call('GET', '/journal/daily/2026-09-09')).note;
    expect(day9.entries.filter((e: any) => e.text === 'Client contract review call')).toHaveLength(1);

    const again = await call('POST', '/journal/migrate-tasks', { fromDate: '2026-09-08', toDate: '2026-09-09' });
    expect(again).toMatchObject({ success: true, migratedCount: 1 });
    const none = await call('POST', '/journal/migrate-tasks', { fromDate: '2026-09-08', toDate: '2026-09-09' });
    expect(none).toMatchObject({ success: true, migratedCount: 0, message: 'All tasks for 2026-09-08 are already completed or migrated.' });
  });

  it('reports a missing source note with success false', async () => {
    const { call, events } = harness();
    const res = await call('POST', '/journal/migrate-tasks', { fromDate: '2026-09-01', toDate: '2026-09-02' });
    expect(res).toEqual({ success: false, migratedCount: 0, message: 'No source daily note found on disk for 2026-09-01.', migratedTasks: [] });
    expect(events.map((e) => e.event)).not.toContain('journal:migrated');
  });
});

describe('journal reviews', () => {
  it('reads, saves and lists monthly reviews', async () => {
    const { call, fs, events } = harness();
    const sample = (await call('GET', '/journal/monthly/2026-09')).review;
    expect(sample).toMatchObject({ month: '2026-09', billableHours: 68.5, title: 'Monthly Review: 2026-09' });
    expect(sample.goals).toHaveLength(3);
    expect(sample.reflections).toMatch(/^Strong creative output/);

    const res = await call('POST', '/journal/monthly', {
      month: '2026-08',
      title: 'August 2026 Creative Retrospective',
      goals: ['Ship Design Tokens', 'Reduce revision rounds'],
      deliverablesSummary: ['3D Asset Pack', 'Identity Guidelines'],
      billableHours: 56,
      reflections: 'Sublime focus cadence.'
    });
    expect(res.review).toMatchObject({ month: '2026-08', billableHours: 56, reflections: 'Sublime focus cadence.' });
    const disk = await fs.readText('_Journal/Monthly/2026-08.md');
    expect(disk).toContain('August 2026 Creative Retrospective');
    expect(disk).toContain('# Monthly Review: 2026-08\n\nSublime focus cadence.\n');
    expect(events.map((e) => e.event)).toContain('journal:monthly:saved');

    expect((await call('GET', '/journal/monthly')).reviews.map((r: any) => r.month)).toEqual(['2026-09', '2026-08']);
    expect((await call('GET', '/journal/monthly/2026-01')).review.billableHours).toBe(64);
    await expect(call('POST', '/journal/monthly', { month: 'Sept' })).rejects.toMatchObject({ status: 400 });
  });

  it('reads, saves and lists yearly indexes', async () => {
    const { call, fs } = harness();
    expect((await call('GET', '/journal/yearly/2026')).review).toMatchObject({ year: '2026', revenueTarget: 150000, revenueActual: 84500 });
    const res = await call('POST', '/journal/yearly', {
      year: 2027,
      vision: 'Pure minimalist craft.',
      milestones: ['Built Kanso Cre8 studio engine', 'Retainer with Acme Corp'],
      revenueTarget: 180000,
      revenueActual: 95000,
      clientHighlights: ['Acme Corp', 'Nexus Studio']
    });
    expect(res.review).toMatchObject({ year: '2027', revenueTarget: 180000, title: '2027 Studio Vision & Annual Index' });
    expect(res.review.milestones).toHaveLength(2);
    const disk = await fs.readText('_Journal/Yearly/2027.md');
    expect(disk).toContain('revenue_target: 180000');
    expect(disk).toContain('Built Kanso Cre8 studio engine');
    const list = await call('GET', '/journal/yearly');
    expect(list.indexes.map((i: any) => i.year)).toEqual(['2027', '2026']);
    expect(list.reviews).toEqual(list.indexes);
  });

  it('scaffolds, saves and lists weekly reviews', async () => {
    const { call, fs, events } = harness();
    const scaffold = await call('GET', '/journal/weekly-review');
    expect(scaffold.week).toBe('2026-W38');
    expect(scaffold.review).toMatchObject({ startDate: '2026-09-14', endDate: '2026-09-20', shippedDeliverables: [], nextWeekTop3: [], hoursLogged: 0 });
    expect((await call('GET', '/journal/weekly-review/2026-W42')).review).toMatchObject({ startDate: '2026-10-12', endDate: '2026-10-18' });

    const res = await call('POST', '/journal/weekly-review', {
      week: '2026-W42',
      startDate: '2026-10-12',
      endDate: '2026-10-18',
      shippedDeliverables: ['Mobile App Illustration 3D Key Visuals (ACME)', 'Brand Guidelines v2 (LUM)'],
      hoursLogged: 42.5,
      unbilledHours: 2,
      nextWeekTop3: ['Acme Corp motion onboarding sequence'],
      reflections: 'Zero friction week.'
    });
    expect(res.review).toMatchObject({ week: '2026-W42', hoursLogged: 42.5, unbilledHours: 2, startDate: '2026-10-12', reflections: 'Zero friction week.' });
    expect(res.review.shippedDeliverables).toHaveLength(2);
    expect(await fs.readText('_Journal/Weekly/2026-W42.md')).toContain('hours_logged: 42.5');
    expect(events.map((e) => e.event)).toContain('journal:weekly:saved');

    const list = await call('GET', '/journal/weekly-reviews');
    expect(list.reviews.map((r: any) => r.week)).toEqual(['2026-W42']);
  });
});

describe('journal telemetry', () => {
  it('rolls up a week of daily notes and invoices', async () => {
    const { call } = harness();
    const { telemetry } = await call('GET', '/journal/weekly?date=2026-09-10');
    expect(telemetry).toMatchObject({
      weekStart: '2026-09-07',
      weekEnd: '2026-09-13',
      tasksTotal: 7,
      tasksCompleted: 3,
      tasksMigrated: 3,
      completionRate: 43,
      billableHours: 20,
      totalRevenue: 2800,
      paidRevenue: 0,
      pendingRevenue: 2800,
      activeClients: ['LUM']
    });
    expect(telemetry.dailyCadence).toHaveLength(7);
    expect(telemetry.dailyCadence[2]).toEqual({ date: '2026-09-09', dayName: 'Wed', tasksTotal: 1, tasksCompleted: 1, tasksMigrated: 3, rate: 100 });
    expect((await call('GET', '/journal/weekly')).telemetry).toMatchObject({ weekStart: '2026-09-14', tasksTotal: 3, completionRate: 0, totalRevenue: 0 });
  });

  it('rolls up a month from invoices and projects', async () => {
    const { call } = harness();
    const res = await call('GET', '/journal/monthly/2026-09/telemetry');
    expect(res.month).toBe('2026-09');
    expect(res.telemetry).toMatchObject({
      month: '2026-09',
      billableHours: 59,
      totalRevenue: 7375,
      paidRevenue: 4575,
      pendingRevenue: 2800,
      projectsCount: 3,
      completedProjects: 0,
      avgRevisionRounds: 1.3
    });
    expect(res.telemetry.deliverablesCount).toBeGreaterThanOrEqual(3);
    expect([...res.telemetry.activeClients].sort()).toEqual(['ACME', 'LUM', 'NEX']);
    expect((await call('GET', '/journal/monthly/2026-08/telemetry')).telemetry).toMatchObject({ totalRevenue: 0, projectsCount: 0, avgRevisionRounds: 1 });
  });

  it('rolls up a year with the monthly curve and client distribution', async () => {
    const { call } = harness();
    const { year, telemetry } = await call('GET', '/journal/yearly/2026/telemetry');
    expect(year).toBe('2026');
    expect(telemetry).toMatchObject({ year: '2026', totalRevenue: 7375, totalHours: 59, effectiveRate: 125, projectsCount: 3 });
    expect(telemetry.monthlyCurve).toHaveLength(12);
    expect(telemetry.monthlyCurve[8]).toEqual({ month: '2026-09', label: 'Sep', revenue: 7375, hours: 59, projects: 3 });
    expect(telemetry.clientDistribution.map((c: any) => [c.clientCode, c.revenue, c.percentage])).toEqual([
      ['LUM', 2800, 38],
      ['ACME', 2375, 32],
      ['NEX', 2200, 30]
    ]);
    expect(telemetry.clientDistribution[1]).toMatchObject({ clientName: 'Acme Corporation', count: 1 });
  });
});
