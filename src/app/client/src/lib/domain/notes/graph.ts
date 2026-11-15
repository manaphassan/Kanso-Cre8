/**
 * Knowledge graph topology: atomic notes, clients from `_Clients/<folder>/client.md`
 * and projects, joined by [[WikiLinks]]. Port of
 * NotesVaultService.getGraphTopology; client detection now uses the vault's
 * clients instead of fixed sample codes.
 */

import type { Project } from '../projects';
import type { AtomicNote } from './atomic';
import { clientLookup, linkTarget, type ClientRef } from './model';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  tags: string[];
  degree: number;
  radius: number;
  snippet?: string;
  name?: string;
  brand?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphTopology {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

type ProjectRef = Pick<Project, 'id' | 'folderName' | 'jobId' | 'title' | 'brand'>;

const PROJECT_LINK = /^\d{6}_/;

export function buildGraph(notes: AtomicNote[], clients: ClientRef[], projects: ProjectRef[]): GraphTopology {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const note of notes) {
    nodes.set(note.id, {
      id: note.id,
      label: note.title,
      type: note.type || 'permanent',
      category: note.type || 'permanent',
      tags: note.tags || [],
      degree: 0,
      radius: 7,
      snippet: (note.content || '').split('\n').filter((l) => l.trim() && !l.startsWith('#'))[0] || note.title
    });
  }

  const noteByName = new Map<string, string>();
  for (const note of notes) noteByName.set(note.title.toLowerCase(), note.id);
  for (const note of notes) if (!noteByName.has(note.id.toLowerCase())) noteByName.set(note.id.toLowerCase(), note.id);

  const clientByKey = clientLookup(clients);
  const projectByKey = new Map<string, ProjectRef>();
  for (const p of projects) {
    for (const k of [p.folderName, p.id, p.jobId]) if (k && !projectByKey.has(k.toLowerCase())) projectByKey.set(k.toLowerCase(), p);
  }

  const link = (source: string, target: string) => {
    if (source === target) return;
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target });
    for (const id of [source, target]) {
      const node = nodes.get(id);
      if (node) {
        node.degree += 1;
        node.radius = Math.min(18, 7 + node.degree * 1.5);
      }
    }
  };

  const clientNode = (c: ClientRef): string => {
    const id = `client_${c.code}`;
    if (!nodes.has(id)) {
      nodes.set(id, { id, label: c.code, name: c.name, type: 'client', category: 'client', tags: ['client'], degree: 0, radius: 9 });
    }
    return id;
  };

  const projectNode = (label: string, project?: ProjectRef): string => {
    const id = `project_${project ? project.folderName : label}`;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: project ? project.folderName : label,
        type: 'project',
        category: 'project',
        tags: ['project'],
        degree: 0,
        radius: 8,
        ...(project ? { name: project.title, brand: project.brand } : {})
      });
      const owner = project ? clientByKey.get(project.brand.toLowerCase()) : undefined;
      if (owner) link(id, clientNode(owner));
    }
    return id;
  };

  for (const note of notes) {
    for (const raw of note.links || []) {
      const target = linkTarget(raw);
      if (!target) continue;
      const key = target.toLowerCase();
      let targetId = noteByName.get(key);
      if (!targetId) {
        const client = clientByKey.get(key);
        const project = projectByKey.get(key);
        if (client) targetId = clientNode(client);
        else if (project) targetId = projectNode(target, project);
        else if (PROJECT_LINK.test(target)) targetId = projectNode(target);
      }
      if (targetId) link(note.id, targetId);
    }
  }

  return { nodes: [...nodes.values()], edges };
}
