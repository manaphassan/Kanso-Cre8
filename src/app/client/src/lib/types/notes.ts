/**
 * Kanso Cre8 — Zettelkasten & Atomic Knowledge Types
 */

export type NoteType = 'fleeting' | 'literature' | 'permanent';
export type ZettelType = NoteType;

export interface NoteItem {
  id: string; // e.g. "note_20260909_001"
  title: string;
  type: NoteType;
  content: string;
  tags: string[];
  created: string;
  updated: string;
  relatedLinks: string[]; // e.g. ["[[b2b_saas_hero_formula]]"]
  linkedClients?: string[]; // e.g. ["[[ACME]]", "[[NEX]]"]
  linkedProjects?: string[]; // e.g. ["[[202609_0001_ACME_MobileAppIllustration]]"]
  extractedTasks?: NoteTask[];
}
export type ZettelNote = NoteItem;

export interface NoteTask {
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
export type ZettelTask = NoteTask;

export interface BacklinkItem {
  note: NoteItem;
  snippet: string;
}

export type GraphNodeType = 'permanent' | 'fleeting' | 'literature' | 'client' | 'project';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  category?: string;
  radius: number;
  degree: number;
  tags?: string[];
  snippet?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}

export interface GraphTopology {
  nodes: GraphNode[];
  edges: GraphEdge[];
}


