/**
 * Weekly reviews (`_Journal/Weekly/YYYY-Www.md`), monthly reviews
 * (`_Journal/Monthly/YYYY-MM.md`) and yearly indexes (`_Journal/Yearly/YYYY.md`).
 * Port of the review part of JournalVaultService.js. Missing files return the
 * same templates the server returned; nothing is written on read.
 */

import yaml from 'js-yaml';
import { getPreferences } from '../config';
import type { VaultFs } from '$lib/vault/types';
import { JournalInputError, assertMonth, assertWeek, assertYear, isoWeekMonday } from './dates';
import { MONTHLY_DIR, WEEKLY_DIR, YEARLY_DIR, splitFrontmatter } from './daily';
import { readInvoiceSummaries } from '../finance/summaries';
import { weeklyTelemetry } from './telemetry';

export interface WeeklyReview {
  week: string;
  title: string;
  startDate: string;
  endDate: string;
  shippedDeliverables: string[];
  hoursLogged: number;
  unbilledHours: number;
  nextWeekTop3: string[];
  reflections: string;
  tags: string[];
  rawMarkdown: string;
}

export interface MonthlyReview {
  month: string;
  title: string;
  goals: string[];
  deliverablesSummary: string[];
  billableHours: number;
  reflections: string;
  tags: string[];
  rawMarkdown: string;
}

export interface YearlyReview {
  year: string;
  title: string;
  vision: string;
  milestones: string[];
  revenueTarget: number;
  revenueActual: number;
  clientHighlights: string[];
  tags: string[];
  rawMarkdown: string;
}

const tags = (kind: string) => ['journal', 'bujo', kind];

/** Frontmatter plus the body without its first heading; null when the YAML is broken. */
function readDoc(raw: string): { fm: Record<string, any>; text: string } | null {
  const split = splitFrontmatter(raw);
  if (!split.matched) return { fm: {}, text: raw.trim() };
  if (!split.data) return null;
  return { fm: split.data, text: split.body.replace(/^#\s+[^\n]*\n+/m, '').trim() };
}

const isoDay = (v: unknown) => (v instanceof Date ? v.toISOString().split('T')[0] : v ? String(v) : '');

async function readOptional(fs: VaultFs, path: string): Promise<string | null> {
  try {
    return await fs.readText(path);
  } catch {
    return null;
  }
}

/** `.md` files directly in a journal folder, with their text, from one scan. */
async function listDocs(fs: VaultFs, dir: string): Promise<Array<{ key: string; raw: string }>> {
  let entries: Awaited<ReturnType<VaultFs['scan']>> = [];
  try {
    entries = await fs.scan(dir);
  } catch {
    return [];
  }
  const out: Array<{ key: string; raw: string }> = [];
  for (const e of entries) {
    const name = e.path.slice(dir.length + 1);
    if (e.isDir || name.includes('/') || !name.endsWith('.md')) continue;
    const raw = e.text ?? (await readOptional(fs, e.path));
    if (raw !== null) out.push({ key: name.slice(0, -3), raw });
  }
  return out;
}

const dump = (fm: Record<string, any>) => `---\n${yaml.dump(fm).trim()}\n---\n\n`;

// --- Weekly -----------------------------------------------------------------

function weeklyFromText(raw: string, week: string): WeeklyReview | null {
  const doc = readDoc(raw);
  if (!doc) return null;
  const { fm, text } = doc;
  return {
    week,
    title: fm.title || `Weekly Review: ${week}`,
    startDate: isoDay(fm.startDate || fm.start_date),
    endDate: isoDay(fm.endDate || fm.end_date),
    shippedDeliverables: fm.shippedDeliverables || fm.shipped_deliverables || [],
    hoursLogged: fm.hoursLogged || fm.hours_logged || 0,
    unbilledHours: fm.unbilledHours || fm.unbilled_hours || 0,
    nextWeekTop3: fm.nextWeekTop3 || fm.next_week_top_3 || [],
    reflections: fm.reflections || text,
    tags: fm.tags || tags('weekly'),
    rawMarkdown: raw
  };
}

export async function getWeeklyReview(fs: VaultFs, week: string, now: Date): Promise<WeeklyReview> {
  const target = assertWeek(week);
  const raw = await readOptional(fs, `${WEEKLY_DIR}/${target}.md`);
  const review = raw === null ? null : weeklyFromText(raw, target);
  if (review) return review;

  // Scaffold from the target week's telemetry (the server used the current week).
  const telemetry = await weeklyTelemetry(fs, isoWeekMonday(target), await readInvoiceSummaries(fs, now), now);
  const demo = (await getPreferences(fs)).demo_data === true;
  return {
    week: target,
    title: `Weekly Review: ${target}`,
    startDate: telemetry.weekStart,
    endDate: telemetry.weekEnd,
    shippedDeliverables: demo ? ['Mobile App Illustration 3D Key Visuals (ACME)'] : [],
    hoursLogged: telemetry.billableHours || (demo ? 38.5 : 0),
    unbilledHours: demo ? 1.5 : 0,
    nextWeekTop3: demo
      ? ['Finalize Acme Corp motion onboarding sequence', 'Deliver Lumina Labs vector asset library', 'Calibrate client retainer agreements']
      : [],
    reflections: demo ? 'Mindful creative cadence maintained. Core milestones shipped on schedule.' : '',
    tags: tags('weekly'),
    rawMarkdown: ''
  };
}

export async function getWeeklyReviews(fs: VaultFs, now: Date): Promise<WeeklyReview[]> {
  const out: WeeklyReview[] = [];
  for (const { key, raw } of await listDocs(fs, WEEKLY_DIR)) {
    out.push(weeklyFromText(raw, key) ?? (await getWeeklyReview(fs, key, now).catch(() => null)));
  }
  return out.filter(Boolean).sort((a, b) => b.week.localeCompare(a.week));
}

export async function saveWeeklyReview(fs: VaultFs, data: Partial<WeeklyReview>, now: Date): Promise<WeeklyReview> {
  if (!data || !data.week) throw new JournalInputError('Valid week identifier (YYYY-Www) is required.');
  const week = assertWeek(data.week, 'Valid week identifier (YYYY-Www) is required.');
  const fm = {
    week,
    title: data.title || `Weekly Review: ${week}`,
    start_date: data.startDate || '',
    end_date: data.endDate || '',
    shipped_deliverables: data.shippedDeliverables || [],
    hours_logged: Number(data.hoursLogged || 0),
    unbilled_hours: Number(data.unbilledHours || 0),
    next_week_top_3: data.nextWeekTop3 || [],
    tags: data.tags || tags('weekly'),
    reflections: data.reflections || ''
  };
  await fs.writeText(`${WEEKLY_DIR}/${week}.md`, `${dump(fm)}# Weekly Review: ${week}\n\n${data.reflections || ''}\n`);
  return getWeeklyReview(fs, week, now);
}

// --- Monthly ----------------------------------------------------------------

function defaultMonthly(month: string): MonthlyReview {
  return {
    month,
    title: `Monthly Review: ${month}`,
    goals: ['Deliver high-impact visual design sprint', 'Maintain sub-2.0 revision cycles'],
    deliverablesSummary: ['3x 4K Master Renders', 'Design Tokens Spec Guide'],
    billableHours: 64,
    reflections: 'Clean cadence and prompt deliverable sign-offs across all client sprints.',
    tags: tags('monthly'),
    rawMarkdown: ''
  };
}

function monthlyFromText(raw: string, month: string): MonthlyReview {
  const doc = readDoc(raw);
  if (!doc) return defaultMonthly(month);
  const { fm, text } = doc;
  return {
    month,
    title: fm.title || `Monthly Review: ${month}`,
    goals: fm.goals || [],
    deliverablesSummary: fm.deliverablesSummary || fm.deliverables || [],
    billableHours: fm.billableHours || 0,
    reflections: fm.reflections || text,
    tags: fm.tags || tags('monthly'),
    rawMarkdown: raw
  };
}

export async function getMonthlyReview(fs: VaultFs, month: string): Promise<MonthlyReview> {
  const target = assertMonth(month);
  const raw = await readOptional(fs, `${MONTHLY_DIR}/${target}.md`);
  return raw === null ? defaultMonthly(target) : monthlyFromText(raw, target);
}

export async function getMonthlyReviews(fs: VaultFs): Promise<MonthlyReview[]> {
  return (await listDocs(fs, MONTHLY_DIR)).map(({ key, raw }) => monthlyFromText(raw, key)).sort((a, b) => b.month.localeCompare(a.month));
}

export async function saveMonthlyReview(fs: VaultFs, data: Partial<MonthlyReview>): Promise<MonthlyReview> {
  if (!data || !data.month) throw new JournalInputError('Valid month (YYYY-MM) is required.');
  const month = assertMonth(data.month, 'Valid month (YYYY-MM) is required.');
  const fm = {
    month,
    title: data.title || `Monthly Review: ${month}`,
    goals: data.goals || [],
    deliverablesSummary: data.deliverablesSummary || [],
    billableHours: data.billableHours || 0,
    tags: data.tags || tags('monthly'),
    reflections: data.reflections || ''
  };
  await fs.writeText(`${MONTHLY_DIR}/${month}.md`, `${dump(fm)}# Monthly Review: ${month}\n\n${data.reflections || ''}\n`);
  return getMonthlyReview(fs, month);
}

// --- Yearly -----------------------------------------------------------------

function defaultYearly(year: string): YearlyReview {
  return {
    year,
    title: `${year} Studio Vision & Annual Index`,
    vision:
      'Independent Design Sanctuary: Focus exclusively on high-impact visual craft, 3D illustration, and boutique brand systems with zero agency middleman.',
    milestones: [
      'Transitioned 100% of client operations into Kanso Cre8 local vault',
      'Surpassed $120/hr effective billing rate across core retainer clients',
      'Achieved sub-2.0 average revision rounds across 40+ completed project vaults'
    ],
    revenueTarget: 150000,
    revenueActual: 84500,
    clientHighlights: ['Acme Corp (Retainer)', 'Nexus Studio (Motion)', 'Lumina Labs (Identity)'],
    tags: tags('yearly'),
    rawMarkdown: ''
  };
}

function yearlyFromText(raw: string, year: string): YearlyReview {
  const doc = readDoc(raw);
  if (!doc) return defaultYearly(year);
  const { fm, text } = doc;
  return {
    year,
    title: fm.title || `${year} Studio Vision & Annual Index`,
    vision: fm.vision || text,
    milestones: fm.milestones || [],
    revenueTarget: fm.revenueTarget || fm.revenue_target || 150000,
    revenueActual: fm.revenueActual || fm.revenue_actual || 0,
    clientHighlights: fm.clientHighlights || fm.client_highlights || [],
    tags: fm.tags || tags('yearly'),
    rawMarkdown: raw
  };
}

export async function getYearlyIndex(fs: VaultFs, year: string): Promise<YearlyReview> {
  const target = assertYear(year);
  const raw = await readOptional(fs, `${YEARLY_DIR}/${target}.md`);
  return raw === null ? defaultYearly(target) : yearlyFromText(raw, target);
}

export async function getYearlyIndexes(fs: VaultFs): Promise<YearlyReview[]> {
  return (await listDocs(fs, YEARLY_DIR)).map(({ key, raw }) => yearlyFromText(raw, key)).sort((a, b) => b.year.localeCompare(a.year));
}

export async function saveYearlyIndex(fs: VaultFs, data: Partial<Omit<YearlyReview, 'year'>> & { year?: string | number }): Promise<YearlyReview> {
  if (!data || !data.year) throw new JournalInputError('Valid year (YYYY) is required.');
  const year = assertYear(String(data.year), 'Valid year (YYYY) is required.');
  const fm = {
    year,
    title: data.title || `${year} Studio Vision & Annual Index`,
    revenue_target: data.revenueTarget || 150000,
    revenue_actual: data.revenueActual || 0,
    milestones: data.milestones || [],
    client_highlights: data.clientHighlights || [],
    tags: data.tags || tags('yearly'),
    vision: data.vision || ''
  };
  await fs.writeText(`${YEARLY_DIR}/${year}.md`, `${dump(fm)}# Annual Vision & Retrospective: ${year}\n\n${data.vision || ''}\n`);
  return getYearlyIndex(fs, year);
}
