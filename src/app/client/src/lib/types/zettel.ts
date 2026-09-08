/**
 * Kanso Cre8 — Zettelkasten & Atomic Knowledge Types
 */

export type ZettelType = 'fleeting' | 'literature' | 'permanent';

export interface ZettelNote {
  id: string; // e.g. "zettel_20260909_001"
  title: string;
  type: ZettelType;
  content: string;
  tags: string[];
  created: string;
  updated: string;
  relatedLinks: string[]; // e.g. ["[[b2b_saas_hero_formula]]"]
  linkedClients?: string[]; // e.g. ["[[Govicle]]"]
  linkedProjects?: string[]; // e.g. ["[[202609_0001_GOV_FleetApp]]"]
  extractedTasks?: ZettelTask[];
}

export interface ZettelTask {
  id: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  rawText: string;
  description: string;
  completed: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  dueDate?: string;
  linkedProject?: string;
}
