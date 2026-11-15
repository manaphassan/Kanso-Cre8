/**
 * Deliverable listing for a project. Port of DeliverableService.getProjectDeliverables.
 * Preview and download URLs come from `fileUrl` (the Tauri asset protocol in
 * the desktop app) instead of the server's /api/deliverables endpoints.
 */

import type { VaultEntry, VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';

const CATEGORIES = [
  { names: ['05_DELIVERABLES', '05_Deliverables', 'Deliverables', '05. Deliverables', '5_Deliverables', '05_Final_Exports', 'Final_Exports', '_Review', 'Review'], label: 'Final Deliverables & Master Exports' },
  { names: ['04_Production', 'Production', '4_Production', '04. Production', '04_Final_Exports', 'Export', 'Exports', 'Final_Exports', '04_Exports', '04_Final'], label: 'Production & Master Exports' },
  { names: ['04_WORK_IN_PROGRESS', '04_WIP', '04. Work In Progress', '02_Artwork_Mockup', 'Artwork Mockup', '2_Artwork_Mockup', '02. Artwork Mockup', 'Mockup', '02_Mockup', '04_Mockup', 'WIP'], label: 'Work In Progress & Visual Mockups' },
  { names: ['Client_Revisions', 'Revisions', '05_Revisions', '04_Revisions'], label: 'Revision Files' }
];

const IMAGE = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff'];
const VIDEO = ['.mp4', '.webm', '.mov', '.mkv', '.avi'];
const AUDIO = ['.mp3', '.wav', '.ogg', '.m4a'];
const MEDIA = [...IMAGE, ...VIDEO, '.pdf', ...AUDIO];

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${sizes[i]}`;
}

/** Stable id for a vault-relative path (base64url, as the server used). */
export function encodeDeliverableId(rel: string): string {
  const bytes = new TextEncoder().encode(rel);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeDeliverableId(id: string): string {
  const b64 = id.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function describeDeliverable(entry: VaultEntry, folder: string, label: string, url: string) {
  const name = baseName(entry.path);
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  const vMatch = /_v(\d+)/i.exec(name);
  const version = vMatch ? parseInt(vMatch[1], 10) : /final/i.test(name) ? 99 : 1;
  const previewType = IMAGE.includes(ext) ? 'image' : VIDEO.includes(ext) ? 'video' : ext === '.pdf' ? 'pdf' : AUDIO.includes(ext) ? 'audio' : 'generic';
  const formats: Record<string, string> = { '.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG', '.webp': 'WEBP', '.svg': 'SVG', '.mp4': 'MP4', '.pdf': 'PDF' };
  const mediaClass = VIDEO.includes(ext) ? 'video_master' : ext === '.pdf' ? 'print_pdf' : ext === '.svg' ? 'vector_graphics' : AUDIO.includes(ext) ? 'audio_track' : 'raster_image';
  const lower = name.toLowerCase();
  const aspectRatioEstimate = /1x1|square|feed|box/.test(lower) ? '1:1'
    : /9x16|story|reel|tiktok|vertical|status/.test(lower) ? '9:16'
    : /16x9|landscape|youtube|display|banner|wide/.test(lower) ? '16:9'
    : /4x5|portrait/.test(lower) ? '4:5' : 'standard';
  const size = entry.size;
  const sizeTier = size > 100 * 2 ** 20 ? 'master' : size > 25 * 2 ** 20 ? 'large' : size > 2 * 2 ** 20 ? 'medium' : 'small';
  const id = encodeDeliverableId(entry.path);
  return {
    id,
    filename: name,
    folder,
    folderLabel: label,
    isDeliverable: true,
    extension: ext,
    ext: ext.replace('.', ''),
    format: formats[ext] ?? ext.replace('.', '').toUpperCase(),
    previewType,
    mediaClass,
    aspectRatioEstimate,
    sizeTier,
    isImage: previewType === 'image',
    isVideo: previewType === 'video',
    isPdf: previewType === 'pdf',
    isAudio: previewType === 'audio',
    sizeBytes: size,
    sizeFormatted: formatBytes(size),
    modified: new Date(entry.modifiedMs ?? 0).toISOString(),
    version,
    relativePath: entry.path,
    downloadUrl: url,
    streamUrl: previewType === 'video' || previewType === 'audio' ? url : null,
    previewUrl: previewType === 'generic' ? null : url
  };
}

export type Deliverable = ReturnType<typeof describeDeliverable>;

export async function listDeliverables(
  fs: VaultFs,
  projectPath: string,
  fileUrl: (rel: string) => Promise<string>
): Promise<Deliverable[]> {
  let children: VaultEntry[];
  try {
    children = await fs.listDir(projectPath);
  } catch {
    return [];
  }
  const dirs = new Map(children.filter((c) => c.isDir).map((c) => [baseName(c.path), c.path]));
  const out: Deliverable[] = [];
  for (const cat of CATEGORIES) {
    const folder = cat.names.find((n) => dirs.has(n));
    if (!folder) continue;
    for (const entry of await fs.listDir(dirs.get(folder)!)) {
      const name = baseName(entry.path);
      if (entry.isDir || name.startsWith('.') || name.startsWith('~') || name.toLowerCase() === 'thumbs.db') continue;
      const dot = name.lastIndexOf('.');
      if (!MEDIA.includes(dot >= 0 ? name.slice(dot).toLowerCase() : '')) continue;
      out.push(describeDeliverable(entry, folder, cat.label, await fileUrl(entry.path)));
    }
  }
  return out;
}
