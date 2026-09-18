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
  linkedClients?: string[]; // e.g. ["[[ACME]]", "[[NEX]]"]
  linkedProjects?: string[]; // e.g. ["[[202609_0001_ACME_MobileAppIllustration]]"]
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

export interface BacklinkItem {
  note: ZettelNote;
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


