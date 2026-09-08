/**
 * Kanso Cre8 — Zettelkasten & Atomic Knowledge Service
 * In-memory indexer for [[WikiLinks]], backlinks, and inline `- [ ] #task` extraction.
 */

import type { ZettelNote, ZettelTask, ZettelType } from '../types/zettel';

const STORAGE_KEY = 'kanso_cre8_zettelkasten';

export const DEFAULT_ZETTEL_NOTES: ZettelNote[] = [
  {
    id: 'zettel_001',
    title: 'The Curiosity Gap Hook Formula',
    type: 'permanent',
    tags: ['copywriting', 'viral-hooks', 'social-ads'],
    created: '2026-09-09',
    updated: '2026-09-09',
    relatedLinks: ['[[b2b_saas_hero_formula]]'],
    linkedClients: ['[[Govicle]]', '[[Jomparking]]'],
    linkedProjects: ['[[202609_0001_GOV_FleetApp]]'],
    content: `# The Curiosity Gap Hook Formula

State an unexpected, counter-intuitive result in line 1 without revealing the catalyst until line 3.

### 3 Actionable Patterns:
1. **The Negative Result**: Show the worst-case scenario first (e.g. *"90% of logistics fleets leak RM 12,000 monthly in untracked idle fuel..."*).
2. **The Fast Cutaway**: High-contrast graphic transition within 1.2 seconds.
3. **The Contrast Statement**: *"Stop buying GPS trackers. Start using live fleet intelligence."*

### Proven Client Tests:
- Tested on [[Govicle]] Fleet Dashboard hero copy.
- Tested on [[Jomparking]] promotional reels.`
  },
  {
    id: 'zettel_002',
    title: 'The 60-30-10 Creative Color Rule',
    type: 'permanent',
    tags: ['design-theory', 'color-systems', 'branding'],
    created: '2026-09-08',
    updated: '2026-09-08',
    relatedLinks: ['[[The Curiosity Gap Hook Formula]]'],
    linkedClients: ['[[SuamiSihat]]', '[[Govicle]]'],
    content: `# The 60-30-10 Creative Color Rule

A timeless interior and graphic design ratio to balance palette harmony:

- **60% Dominant Surface**: Canvas background, negative space (e.g. Obsidian #09090B or Clean Slate #F8FAFC).
- **30% Secondary Structure**: Card containers, navigation headers, dark panels.
- **10% Accent Intent**: High-saturation action buttons, badges, key figures (e.g. Electric Sky #38BDF8).

*Rule of thumb: Never let your accent color exceed 10% of total visible viewport.*`
  },
  {
    id: 'zettel_003',
    title: 'Client Intake Call: Amirul ([[Govicle]])',
    type: 'fleeting',
    tags: ['client-meeting', 'brief-intake', 'fleet-app'],
    created: '2026-09-09',
    updated: '2026-09-09',
    relatedLinks: [],
    linkedClients: ['[[Govicle]]'],
    linkedProjects: ['[[202609_0001_GOV_FleetApp]]'],
    content: `# Client Intake Call: Amirul ([[Govicle]])

Met with Amirul via Google Meet regarding the new Enterprise Fleet Management 3D hero assets.

### Action Items & Deliverables:
- [ ] #task 3D chassis blockout in Blender for [[202609_0001_GOV_FleetApp]] 📅 2026-09-14 ⏫ high
- [ ] #task Export transparent 4K PNG renders to 04_WIP/ 📅 2026-09-18
- [ ] #task Send revised quote [[QUOTE-2026-001]] to Amirul
- [ ] Verify font licensing for [[Govicle]] typography assets

### Notes on Preferences:
Amirul likes bold, high-contrast dark enterprise UI with subtle 1px cyan borders. Avoid playful cartoonish 3D; keep it clean and industrial.`
  }
];

export class ZettelService {
  private static instance: ZettelService;
  private notes: ZettelNote[] = [];

  private constructor() {
    this.loadNotes();
  }

  public static getInstance(): ZettelService {
    if (!ZettelService.instance) {
      ZettelService.instance = new ZettelService();
    }
    return ZettelService.instance;
  }

  public loadNotes(): ZettelNote[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.notes = parsed;
          this.reindexAll();
          return this.notes;
        }
      }
    } catch (e) {
      console.warn('[ZettelService] Load error, using default notes:', e);
    }
    this.notes = [...DEFAULT_ZETTEL_NOTES];
    this.reindexAll();
    this.saveNotes();
    return this.notes;
  }

  public saveNotes(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    } catch (e) {
      console.error('[ZettelService] Save error:', e);
    }
  }

  public getNotes(): ZettelNote[] {
    if (this.notes.length === 0) {
      this.loadNotes();
    }
    return this.notes;
  }

  public getNoteById(id: string): ZettelNote | undefined {
    return this.notes.find(n => n.id === id);
  }

  public getNoteByTitle(title: string): ZettelNote | undefined {
    return this.notes.find(n => n.title.toLowerCase() === title.toLowerCase());
  }

  public saveNote(note: ZettelNote): void {
    note.updated = new Date().toISOString().split('T')[0];
    this.indexNote(note);

    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = note;
    } else {
      this.notes.unshift(note);
    }
    this.saveNotes();
  }

  public deleteNote(id: string): void {
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveNotes();
  }

  /**
   * Parses [[WikiLinks]] and extracts `- [ ] #task` checkboxes from note content
   */
  public indexNote(note: ZettelNote): void {
    const wikiRegex = /\[\[(.*?)\]\]/g;
    const matches = Array.from(note.content.matchAll(wikiRegex), m => `[[${m[1]}]]`);
    const uniqueLinks = Array.from(new Set(matches));

    note.relatedLinks = uniqueLinks.filter(l => !l.startsWith('[[client_') && !l.startsWith('[[2026'));
    note.linkedClients = uniqueLinks.filter(l => l.includes('Govicle') || l.includes('Jomparking') || l.includes('SuamiSihat'));
    note.linkedProjects = uniqueLinks.filter(l => l.match(/\[\[\d{6}_/));

    // Extract inline tasks: - [ ] #task Description 📅 YYYY-MM-DD ⏫ priority
    const taskRegex = /- \[([ xX])\]\s*(?:#task)?\s*(.*?)(?:\s*📅\s*(\d{4}-\d{2}-\d{2}))?(?:\s*⏫\s*(high|urgent|low))?$/gm;
    const tasks: ZettelTask[] = [];

    for (const match of note.content.matchAll(taskRegex)) {
      const isChecked = match[1].toLowerCase() === 'x';
      const desc = match[2]?.trim();
      const dueDate = match[3];
      const priority = match[4] as any;

      if (desc) {
        tasks.push({
          id: `${note.id}_${tasks.length}`,
          sourceNoteId: note.id,
          sourceNoteTitle: note.title,
          rawText: match[0],
          description: desc,
          completed: isChecked,
          dueDate,
          priority: priority || 'normal'
        });
      }
    }

    note.extractedTasks = tasks;
  }

  public reindexAll(): void {
    this.notes.forEach(note => this.indexNote(note));
  }

  /**
   * Retrieves all tasks extracted from across all notes in the vault
   */
  public getAllTasks(): ZettelTask[] {
    const allTasks: ZettelTask[] = [];
    this.notes.forEach(note => {
      if (note.extractedTasks && note.extractedTasks.length > 0) {
        allTasks.push(...note.extractedTasks);
      }
    });
    return allTasks;
  }

  /**
   * Toggles completion of a task directly in the note Markdown content
   */
  public toggleTask(task: ZettelTask): void {
    const note = this.getNoteById(task.sourceNoteId);
    if (!note) return;

    const oldCheckbox = task.completed ? '- [x]' : '- [ ]';
    const newCheckbox = task.completed ? '- [ ]' : '- [x]';

    // Update in markdown string
    note.content = note.content.replace(
      new RegExp(`- \\[([ xX])\\]\\s*#task\\s*${this.escapeRegExp(task.description)}`),
      `${newCheckbox} #task ${task.description}`
    );

    task.completed = !task.completed;
    this.saveNote(note);
  }

  /**
   * Finds all backlinks pointing to a given title or client
   */
  public getBacklinks(target: string): ZettelNote[] {
    const term = target.startsWith('[[') ? target : `[[${target}]]`;
    return this.notes.filter(n => n.content.includes(term));
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const zettelService = ZettelService.getInstance();
