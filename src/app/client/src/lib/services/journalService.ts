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
  goals: string[];
  deliverablesSummary: string[];
  billableHours: number;
  reflections: string;
  rawMarkdown: string;
}

export interface YearlyReview {
  year: string; // YYYY
  vision: string;
  milestones: string[];
  revenueTarget: number;
  revenueActual: number;
  rawMarkdown: string;
}

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

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed;
        }
      } catch (e) {
        console.warn('[JournalService] Error parsing daily note:', e);
      }
    }

    // Default template for a new day
    const defaultNote = this.createDefaultDailyNote(targetDate);
    this.saveDailyNote(defaultNote);
    return defaultNote;
  }

  public saveDailyNote(note: DailyNote): void {
    if (typeof localStorage === 'undefined') return;
    try {
      note.updatedAt = new Date().toISOString();
      // Rebuild raw markdown
      note.rawMarkdown = this.serializeDailyNote(note);
      localStorage.setItem(`${DAILY_STORAGE_PREFIX}${note.date}`, JSON.stringify(note));
    } catch (e) {
      console.error('[JournalService] Error saving daily note:', e);
    }
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
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }

    const defaultMonthly: MonthlyReview = {
      month: targetMonth,
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
      rawMarkdown: ''
    };

    this.saveMonthlyReview(defaultMonthly);
    return defaultMonthly;
  }

  public saveMonthlyReview(review: MonthlyReview): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${MONTHLY_STORAGE_PREFIX}${review.month}`, JSON.stringify(review));
    } catch (e) {}
  }

  // --- YEARLY REVIEWS ---

  public getYearlyReview(yearStr?: string): YearlyReview {
    const targetYear = yearStr || new Date().getFullYear().toString();
    const key = `${YEARLY_STORAGE_PREFIX}${targetYear}`;

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }

    const defaultYearly: YearlyReview = {
      year: targetYear,
      vision: 'Independent Design Sanctuary: Focus exclusively on high-impact visual craft, 3D illustration, and boutique brand systems with zero agency middleman.',
      milestones: [
        'Transitioned 100% of client operations into Kanso Cre8 local vault',
        'Surpassed $120/hr effective billing rate across core retainer clients',
        'Achieved sub-2.0 average revision rounds across 40+ completed project vaults'
      ],
      revenueTarget: 150000,
      revenueActual: 84500,
      rawMarkdown: ''
    };

    this.saveYearlyReview(defaultYearly);
    return defaultYearly;
  }

  public saveYearlyReview(review: YearlyReview): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${YEARLY_STORAGE_PREFIX}${review.year}`, JSON.stringify(review));
    } catch (e) {}
  }
}

export const journalService = JournalService.getInstance();
