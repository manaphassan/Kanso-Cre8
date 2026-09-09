/**
 * Kanso Cre8 — Bullet Journal (BuJo) Service
 * Manages Daily Rapid Logs, Monthly Reviews, and Yearly Indexes
 * adhering to the canonical _Journal/ vault layout.
 */

export interface BujoEntry {
  id: string;
  type: 'task' | 'done' | 'migrated' | 'event' | 'note' | 'priority';
  raw: string;
  text: string;
  completed?: boolean;
  time?: string;
  tags?: string[];
}

export interface DailyNote {
  date: string; // YYYY-MM-DD
  title: string;
  focusIntentions: string[];
  entries: BujoEntry[];
  rawMarkdown: string;
  updatedAt: string;
}

export interface MonthlyReview {
  month: string; // YYYY-MM
  title?: string;
  goals: string[];
  deliverablesSummary: string[];
  billableHours: number;
  reflections: string;
  tags?: string[];
  rawMarkdown: string;
}

export interface YearlyReview {
  year: string; // YYYY
  title?: string;
  vision: string;
  milestones: string[];
  revenueTarget: number;
  revenueActual: number;
  clientHighlights?: string[];
  tags?: string[];
  rawMarkdown: string;
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

import { ApiClient } from './api';

const DAILY_STORAGE_PREFIX = 'kanso_bujo_daily_';
const MONTHLY_STORAGE_PREFIX = 'kanso_bujo_monthly_';
const YEARLY_STORAGE_PREFIX = 'kanso_bujo_yearly_';

export class JournalService {
  private static instance: JournalService;

  public static getInstance(): JournalService {
    if (!JournalService.instance) {
      JournalService.instance = new JournalService();
    }
    return JournalService.instance;
  }

  // --- DAILY NOTES ---

  public getDailyNote(dateStr?: string): DailyNote {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const key = `${DAILY_STORAGE_PREFIX}${targetDate}`;

    let cachedNote: DailyNote | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          cachedNote = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('[JournalService] Error parsing daily note:', e);
      }
    }

    // Trigger async disk sync in background to align with physical vault
    this.fetchDiskNote(targetDate);

    if (cachedNote) {
      return cachedNote;
    }

    // Default template for a new day
    const defaultNote = this.createDefaultDailyNote(targetDate);
    this.saveDailyNote(defaultNote);
    return defaultNote;
  }

  public async fetchDiskNote(dateStr: string): Promise<DailyNote | null> {
    try {
      const res = await ApiClient.getDailyNote(dateStr);
      if (res && res.success && res.note) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`${DAILY_STORAGE_PREFIX}${dateStr}`, JSON.stringify(res.note));
        }
        return res.note as DailyNote;
      }
    } catch (e) {
      // Offline fallback is normal in pure local mode
    }
    return null;
  }

  public saveDailyNote(note: DailyNote): void {
    if (typeof localStorage === 'undefined') return;
    try {
      note.updatedAt = new Date().toISOString();
      // Rebuild raw markdown
      note.rawMarkdown = this.serializeDailyNote(note);
      localStorage.setItem(`${DAILY_STORAGE_PREFIX}${note.date}`, JSON.stringify(note));

      // Asynchronously persist to physical vault on disk
      ApiClient.saveDailyNote(note).catch(() => {});
    } catch (e) {
      console.error('[JournalService] Error saving daily note:', e);
    }
  }

  /**
   * Checks if yesterday (or the preceding day) has incomplete tasks
   */
  public hasUnfinishedPreviousTasks(currentDate?: string): boolean {
    const today = currentDate || new Date().toISOString().split('T')[0];
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    if (typeof localStorage === 'undefined') return false;
    try {
      const stored = localStorage.getItem(`${DAILY_STORAGE_PREFIX}${yesterdayStr}`);
      if (stored) {
        const parsed: DailyNote = JSON.parse(stored);
        return parsed.entries.some(e => (e.type === 'task' || e.type === 'priority') && !e.completed);
      }
    } catch (e) {}
    return false;
  }

  /**
   * Migrates unfinished tasks from yesterday's daily log to today's log
   */
  public async migratePreviousTasks(targetDate?: string): Promise<{ success: boolean; migratedCount: number; message: string; note: DailyNote }> {
    const today = targetDate || new Date().toISOString().split('T')[0];
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    try {
      const res = await ApiClient.migrateDailyTasks(yesterdayStr, today);
      if (res && res.success) {
        if (res.fromNote) {
          localStorage.setItem(`${DAILY_STORAGE_PREFIX}${yesterdayStr}`, JSON.stringify(res.fromNote));
        }
        if (res.toNote) {
          localStorage.setItem(`${DAILY_STORAGE_PREFIX}${today}`, JSON.stringify(res.toNote));
          return {
            success: true,
            migratedCount: res.migratedCount,
            message: res.message,
            note: res.toNote
          };
        }
      }
    } catch (err) {
      console.warn('[JournalService] Disk migration API failed, using local fallback:', err);
    }

    // Client-side local fallback
    const yesterdayNote = this.getDailyNote(yesterdayStr);
    const todayNote = this.getDailyNote(today);

    const incomplete = yesterdayNote.entries.filter(e => (e.type === 'task' || e.type === 'priority') && !e.completed);
    if (incomplete.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        message: 'No pending tasks to migrate from yesterday.',
        note: todayNote
      };
    }

    // Update yesterday
    yesterdayNote.entries = yesterdayNote.entries.map(e => {
      if ((e.type === 'task' || e.type === 'priority') && !e.completed) {
        return { ...e, type: 'migrated', raw: `• [>] ${e.text}` };
      }
      return e;
    });
    this.saveDailyNote(yesterdayNote);

    // Append to today
    const existingTexts = new Set(todayNote.entries.map(e => e.text.trim().toLowerCase()));
    let count = 0;
    for (const task of incomplete) {
      if (!existingTexts.has(task.text.trim().toLowerCase())) {
        todayNote.entries.push({
          id: `migrated_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: task.type,
          text: task.text,
          raw: task.type === 'priority' ? `* Priority: ${task.text}` : `• [ ] ${task.text}`,
          completed: false
        });
        count++;
      }
    }
    this.saveDailyNote(todayNote);

    return {
      success: true,
      migratedCount: count,
      message: `Migrated ${count} task(s) from yesterday.`,
      note: todayNote
    };
  }

  private createDefaultDailyNote(date: string): DailyNote {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const entries: BujoEntry[] = [
      { id: '1', type: 'priority', raw: '* Finalize mobile illustrations for Acme Corp', text: 'Finalize mobile illustrations for Acme Corp' },
      { id: '2', type: 'task', raw: '• [ ] Export 4K PNG assets with transparent alpha', text: 'Export 4K PNG assets with transparent alpha', completed: false },
      { id: '3', type: 'task', raw: '• [ ] Send invoice draft INV-2026-001 to Nexus Studio', text: 'Send invoice draft INV-2026-001 to Nexus Studio', completed: false },
      { id: '4', type: 'event', raw: 'o 2:00 PM - Art Director preflight review call', text: '2:00 PM - Art Director preflight review call', time: '14:00' },
      { id: '5', type: 'note', raw: '- Note: Client preferred deeper cobalt blue on card gradients', text: 'Client preferred deeper cobalt blue on card gradients' }
    ];

    const note: DailyNote = {
      date,
      title: formattedDate,
      focusIntentions: ['Deep visual craft', 'Zero distraction sprint', 'On-time proof delivery'],
      entries,
      rawMarkdown: '',
      updatedAt: new Date().toISOString()
    };

    note.rawMarkdown = this.serializeDailyNote(note);
    return note;
  }

  private serializeDailyNote(note: DailyNote): string {
    let md = `---
type: bujo_daily
date: ${note.date}
tags: [journal, bujo, daily]
---

# ${note.title}

## 🎯 Daily Intentions
${note.focusIntentions.map(i => `- ${i}`).join('\n')}

## ⚡ Rapid Log
`;

    for (const e of note.entries) {
      if (e.type === 'task') {
        md += `• [${e.completed ? 'x' : ' '}] ${e.text}\n`;
      } else if (e.type === 'done') {
        md += `• [x] ${e.text}\n`;
      } else if (e.type === 'migrated') {
        md += `• [>] ${e.text}\n`;
      } else if (e.type === 'event') {
        md += `o ${e.text}\n`;
      } else if (e.type === 'note') {
        md += `- ${e.text}\n`;
      } else if (e.type === 'priority') {
        md += `* ${e.text}\n`;
      } else {
        md += `• ${e.text}\n`;
      }
    }

    return md;
  }

  public getTodayTasks(): BujoEntry[] {
    const today = this.getDailyNote();
    return today.entries.filter(e => e.type === 'task' || e.type === 'priority');
  }

  public toggleTask(noteDate: string, taskId: string): DailyNote {
    const note = this.getDailyNote(noteDate);
    const entry = note.entries.find(e => e.id === taskId);
    if (entry) {
      if (entry.type === 'task' || entry.type === 'priority') {
        entry.completed = !entry.completed;
      }
      this.saveDailyNote(note);
    }
    return note;
  }

  public addEntry(noteDate: string, type: BujoEntry['type'], text: string): DailyNote {
    const note = this.getDailyNote(noteDate);
    const newEntry: BujoEntry = {
      id: `bujo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      raw: text,
      text,
      completed: false
    };
    note.entries = [...note.entries, newEntry];
    this.saveDailyNote(note);
    return note;
  }

  public deleteEntry(noteDate: string, taskId: string): DailyNote {
    const note = this.getDailyNote(noteDate);
    note.entries = note.entries.filter(e => e.id !== taskId);
    this.saveDailyNote(note);
    return note;
  }

  // --- MONTHLY REVIEWS ---

  public getMonthlyReview(monthStr?: string): MonthlyReview {
    const targetMonth = monthStr || new Date().toISOString().slice(0, 7); // YYYY-MM
    const key = `${MONTHLY_STORAGE_PREFIX}${targetMonth}`;

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.fetchDiskMonthlyReview(targetMonth);
          return parsed;
        }
      } catch (e) {}
    }

    const defaultMonthly: MonthlyReview = {
      month: targetMonth,
      title: `Monthly Review: ${targetMonth}`,
      goals: [
        'Deliver Acme Corp Mobile Banking Illustration Suite',
        'Complete Lumina Labs Synthetic Brand System',
        'Maintain >90% first-time-right signoff rate'
      ],
      deliverablesSummary: [
        '3x 4K Isometric 3D Renders (Acme)',
        '16x Vector App Icon Suite (Acme)',
        'Brand Guidelines Specification PDF (Lumina)'
      ],
      billableHours: 68.5,
      reflections: 'Strong creative output this month. Setting client hourly rates cleanly and keeping 01_BRIEF organized prevented revision creep.',
      tags: ['journal', 'bujo', 'monthly'],
      rawMarkdown: ''
    };

    this.saveMonthlyReview(defaultMonthly);
    this.fetchDiskMonthlyReview(targetMonth);
    return defaultMonthly;
  }

  public async fetchDiskMonthlyReview(monthStr: string): Promise<MonthlyReview | null> {
    try {
      const res = await ApiClient.getMonthlyReview(monthStr);
      if (res && res.success && res.review) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`${MONTHLY_STORAGE_PREFIX}${monthStr}`, JSON.stringify(res.review));
        }
        return res.review as MonthlyReview;
      }
    } catch (e) {}
    return null;
  }

  public saveMonthlyReview(review: MonthlyReview): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${MONTHLY_STORAGE_PREFIX}${review.month}`, JSON.stringify(review));
      } catch (e) {}
    }
    ApiClient.saveMonthlyReview(review).catch(() => {});
  }

  public async getMonthlyTelemetry(monthStr?: string): Promise<MonthlyTelemetry | null> {
    const targetMonth = monthStr || new Date().toISOString().slice(0, 7);
    try {
      const res = await ApiClient.getMonthlyTelemetry(targetMonth);
      if (res && res.success && res.telemetry) {
        return res.telemetry as MonthlyTelemetry;
      }
    } catch (e) {}

    // Fallback baseline telemetry
    return {
      month: targetMonth,
      billableHours: 64,
      totalRevenue: 8500,
      paidRevenue: 5000,
      pendingRevenue: 3500,
      projectsCount: 3,
      completedProjects: 2,
      deliverablesCount: 5,
      activeClients: ['ACME', 'NEX', 'LUM'],
      avgRevisionRounds: 1.5
    };
  }

  // --- YEARLY REVIEWS ---

  public getYearlyReview(yearStr?: string): YearlyReview {
    const targetYear = yearStr || new Date().getFullYear().toString();
    const key = `${YEARLY_STORAGE_PREFIX}${targetYear}`;

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.fetchDiskYearlyReview(targetYear);
          return parsed;
        }
      } catch (e) {}
    }

    const defaultYearly: YearlyReview = {
      year: targetYear,
      title: `${targetYear} Studio Vision & Annual Index`,
      vision: 'Independent Design Sanctuary: Focus exclusively on high-impact visual craft, 3D illustration, and boutique brand systems with zero agency middleman.',
      milestones: [
        'Transitioned 100% of client operations into Kanso Cre8 local vault',
        'Surpassed $120/hr effective billing rate across core retainer clients',
        'Achieved sub-2.0 average revision rounds across 40+ completed project vaults'
      ],
      revenueTarget: 150000,
      revenueActual: 84500,
      clientHighlights: ['Acme Corp (Retainer)', 'Nexus Studio (Motion)', 'Lumina Labs (Identity)'],
      tags: ['journal', 'bujo', 'yearly'],
      rawMarkdown: ''
    };

    this.saveYearlyReview(defaultYearly);
    this.fetchDiskYearlyReview(targetYear);
    return defaultYearly;
  }

  public async fetchDiskYearlyReview(yearStr: string): Promise<YearlyReview | null> {
    try {
      const res = await ApiClient.getYearlyReview(yearStr);
      if (res && res.success && res.review) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`${YEARLY_STORAGE_PREFIX}${yearStr}`, JSON.stringify(res.review));
        }
        return res.review as YearlyReview;
      }
    } catch (e) {}
    return null;
  }

  public saveYearlyReview(review: YearlyReview): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${YEARLY_STORAGE_PREFIX}${review.year}`, JSON.stringify(review));
      } catch (e) {}
    }
    ApiClient.saveYearlyReview(review).catch(() => {});
  }

  public async getYearlyTelemetry(yearStr?: string): Promise<YearlyTelemetry | null> {
    const targetYear = yearStr || String(new Date().getFullYear());
    try {
      const res = await ApiClient.getYearlyTelemetry(targetYear);
      if (res && res.success && res.telemetry) {
        return res.telemetry as YearlyTelemetry;
      }
    } catch (e) {}

    // Fallback baseline annual telemetry
    return {
      year: targetYear,
      totalRevenue: 98000,
      paidRevenue: 84500,
      pendingRevenue: 13500,
      totalHours: 720,
      effectiveRate: 136,
      projectsCount: 28,
      completedProjects: 24,
      clientDistribution: [
        { clientCode: 'ACME', clientName: 'Acme Corporation', revenue: 48000, count: 12, percentage: 49 },
        { clientCode: 'NEX', clientName: 'Nexus Studio', revenue: 32000, count: 9, percentage: 33 },
        { clientCode: 'LUM', clientName: 'Lumina Labs', revenue: 18000, count: 7, percentage: 18 }
      ],
      monthlyCurve: [
        { month: `${targetYear}-01`, label: 'Jan', revenue: 7200, hours: 55, projects: 2 },
        { month: `${targetYear}-02`, label: 'Feb', revenue: 8100, hours: 60, projects: 2 },
        { month: `${targetYear}-03`, label: 'Mar', revenue: 9500, hours: 68, projects: 3 },
        { month: `${targetYear}-04`, label: 'Apr', revenue: 6800, hours: 50, projects: 2 },
        { month: `${targetYear}-05`, label: 'May', revenue: 10200, hours: 72, projects: 3 },
        { month: `${targetYear}-06`, label: 'Jun', revenue: 8400, hours: 62, projects: 2 },
        { month: `${targetYear}-07`, label: 'Jul', revenue: 7900, hours: 58, projects: 2 },
        { month: `${targetYear}-08`, label: 'Aug', revenue: 9100, hours: 65, projects: 3 },
        { month: `${targetYear}-09`, label: 'Sep', revenue: 8800, hours: 64, projects: 3 },
        { month: `${targetYear}-10`, label: 'Oct', revenue: 7500, hours: 56, projects: 2 },
        { month: `${targetYear}-11`, label: 'Nov', revenue: 8200, hours: 60, projects: 2 },
        { month: `${targetYear}-12`, label: 'Dec', revenue: 6300, hours: 50, projects: 2 }
      ],
      avgRevisionRounds: 1.4
    };
  }
}

export const journalService = JournalService.getInstance();
