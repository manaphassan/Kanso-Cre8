/**
 * Weekly, monthly and yearly creative-operations telemetry built from daily
 * notes, invoices and projects. Port of the *TelemetryRollup functions in
 * JournalVaultService.js.
 */

import type { Project } from '../projects';
import type { VaultFs } from '$lib/vault/types';
import { DAY_LABELS, MONTH_LABELS, assertDate, assertMonth, assertYear, weekDates } from './dates';
import { getDailyNote, readDailyIndex } from './daily';
import type { InvoiceSummary } from '../finance/summaries';

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const hoursOf = (invs: InvoiceSummary[]) => invs.reduce((s, inv) => s + (inv.items || []).reduce((h, it) => h + Number(it.quantity || 0), 0), 0);
const sumTotals = (invs: InvoiceSummary[]) => invs.reduce((s, i) => s + (i.total || 0), 0);

function revenue(invs: InvoiceSummary[]) {
  const paid = sumTotals(invs.filter((i) => i.status === 'paid'));
  const pending = sumTotals(invs.filter((i) => i.status !== 'paid'));
  return { paid, pending, total: paid + pending };
}

const COMPLETED = new Set(['completed', 'delivered', 'archived']);
/** The server read `p.folder`, which its project items never had; the folder name is `folderName`. */
const folderOf = (p: Project) => String(p.folder ?? p.folderName ?? '');
const avgRevisions = (ps: Project[]) => (ps.length > 0 ? r1(ps.reduce((s, p) => s + (p.revision || 1), 0) / ps.length) : 1.0);

export interface DailyCadencePoint {
  date: string;
  dayName: string;
  tasksTotal: number;
  tasksCompleted: number;
  tasksMigrated: number;
  rate: number;
}

export interface WeeklyTelemetry {
  weekStart: string;
  weekEnd: string;
  tasksTotal: number;
  tasksCompleted: number;
  tasksMigrated: number;
  completionRate: number;
  billableHours: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  activeClients: string[];
  dailyCadence: DailyCadencePoint[];
}

export async function weeklyTelemetry(fs: VaultFs, date: string, invoices: InvoiceSummary[], now: Date): Promise<WeeklyTelemetry> {
  const dates = weekDates(assertDate(date));
  const weekStart = dates[0];
  const weekEnd = dates[6];
  const index = await readDailyIndex(fs);
  let tasksTotal = 0;
  let tasksCompleted = 0;
  let tasksMigrated = 0;
  const dailyCadence: DailyCadencePoint[] = [];

  for (let i = 0; i < dates.length; i++) {
    let total = 0;
    let done = 0;
    let migrated = 0;
    if (index.has(dates[i])) {
      for (const e of (await getDailyNote(fs, dates[i], now, index)).entries) {
        if (e.type === 'task' || e.type === 'priority') {
          total++;
          if (e.completed) done++;
        } else if (e.type === 'done') {
          total++;
          done++;
        } else if (e.type === 'migrated') {
          migrated++;
        }
      }
    }
    tasksTotal += total;
    tasksCompleted += done;
    tasksMigrated += migrated;
    dailyCadence.push({
      date: dates[i],
      dayName: DAY_LABELS[i],
      tasksTotal: total,
      tasksCompleted: done,
      tasksMigrated: migrated,
      rate: total > 0 ? Math.round((done / total) * 100) : 0
    });
  }

  const week = invoices.filter((inv) => inv.date && inv.date >= weekStart && inv.date <= weekEnd);
  const money = revenue(week);
  const clients = new Set<string>();
  for (const inv of week) if (inv.clientCode) clients.add(inv.clientCode);

  return {
    weekStart,
    weekEnd,
    tasksTotal,
    tasksCompleted,
    tasksMigrated,
    completionRate: tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 100,
    billableHours: r1(hoursOf(week)),
    totalRevenue: r2(money.total),
    paidRevenue: r2(money.paid),
    pendingRevenue: r2(money.pending),
    activeClients: [...clients],
    dailyCadence
  };
}

export interface MonthlyTelemetry {
  month: string;
  billableHours: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  projectsCount: number;
  completedProjects: number;
  deliverablesCount: number;
  activeClients: string[];
  avgRevisionRounds: number;
}

export function monthlyTelemetry(month: string, invoices: InvoiceSummary[], projects: Project[]): MonthlyTelemetry {
  const target = assertMonth(month);
  const monthInvoices = invoices.filter((inv) => inv.date && inv.date.startsWith(target));
  const money = revenue(monthInvoices);
  const compact = target.replace('-', '');
  const monthProjects = projects.filter(
    (p) => (p.created && String(p.created).startsWith(target)) || (p.deadline && String(p.deadline).startsWith(target)) || folderOf(p).includes(compact)
  );
  const deliverablesCount = monthProjects.reduce(
    (s, p) => s + (Array.isArray(p.deliverables) ? p.deliverables.length : Number(p.deliverableCount || 0)),
    0
  );
  const clients = new Set<string>();
  for (const inv of monthInvoices) if (inv.clientCode) clients.add(inv.clientCode);
  for (const p of monthProjects) if (p.brand) clients.add(p.brand);

  return {
    month: target,
    billableHours: r1(hoursOf(monthInvoices)),
    totalRevenue: r2(money.total),
    paidRevenue: r2(money.paid),
    pendingRevenue: r2(money.pending),
    projectsCount: monthProjects.length,
    completedProjects: monthProjects.filter((p) => COMPLETED.has(p.status)).length,
    deliverablesCount,
    activeClients: [...clients],
    avgRevisionRounds: avgRevisions(monthProjects)
  };
}

export interface ClientShare {
  clientCode: string;
  clientName: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface MonthlyCurvePoint {
  month: string;
  label: string;
  revenue: number;
  hours: number;
  projects: number;
}

export interface YearlyTelemetry {
  year: string;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalHours: number;
  effectiveRate: number;
  projectsCount: number;
  completedProjects: number;
  clientDistribution: ClientShare[];
  monthlyCurve: MonthlyCurvePoint[];
  avgRevisionRounds: number;
}

export function yearlyTelemetry(year: string, invoices: InvoiceSummary[], projects: Project[]): YearlyTelemetry {
  const target = assertYear(year);
  const yearInvoices = invoices.filter((inv) => inv.date && inv.date.startsWith(target));
  const money = revenue(yearInvoices);
  const totalHours = hoursOf(yearInvoices);
  const yearProjects = projects.filter(
    (p) => p.year === target || (p.created && String(p.created).startsWith(target)) || folderOf(p).startsWith(target)
  );

  const monthlyCurve: MonthlyCurvePoint[] = MONTH_LABELS.map((label, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const key = `${target}-${mm}`;
    const invs = yearInvoices.filter((inv) => inv.date && inv.date.startsWith(key));
    const count = yearProjects.filter((p) => (p.created && String(p.created).startsWith(key)) || folderOf(p).includes(`${target}${mm}`)).length;
    return { month: key, label, revenue: r2(sumTotals(invs)), hours: r1(hoursOf(invs)), projects: count };
  });

  const byClient = new Map<string, { clientCode: string; clientName: string; revenue: number; count: number }>();
  for (const inv of yearInvoices) {
    const code = inv.clientCode || 'OTHER';
    const entry = byClient.get(code) ?? { clientCode: code, clientName: inv.clientName || code, revenue: 0, count: 0 };
    entry.revenue += inv.total || 0;
    entry.count += 1;
    byClient.set(code, entry);
  }
  const clientDistribution = [...byClient.values()]
    .map((c) => ({ ...c, revenue: r2(c.revenue), percentage: money.total > 0 ? Math.round((c.revenue / money.total) * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    year: target,
    totalRevenue: r2(money.total),
    paidRevenue: r2(money.paid),
    pendingRevenue: r2(money.pending),
    totalHours: r1(totalHours),
    effectiveRate: totalHours > 0 ? Math.round(money.total / totalHours) : 125,
    projectsCount: yearProjects.length,
    completedProjects: yearProjects.filter((p) => COMPLETED.has(p.status)).length,
    clientDistribution,
    monthlyCurve,
    avgRevisionRounds: avgRevisions(yearProjects)
  };
}
