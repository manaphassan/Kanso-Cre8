/**
 * Frontmatter: parse and write Markdown files with YAML frontmatter.
 * Port of server/services/FrontmatterService.js. Unknown keys are always kept.
 */

import yaml from 'js-yaml';

const DELIMITER = '---';

export interface Parsed<T = Record<string, any>> {
  frontmatter: T;
  body: string;
}

export function parseFrontmatter<T = Record<string, any>>(raw: string): Parsed<T> {
  if (!raw || typeof raw !== 'string') return { frontmatter: {} as T, body: '' };
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== DELIMITER) return { frontmatter: {} as T, body: raw.trim() };

  const end = lines.findIndex((l, i) => i > 0 && l.trim() === DELIMITER);
  if (end === -1) return { frontmatter: {} as T, body: raw.trim() };

  const block = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n').replace(/^[\r\n]+/, '');
  let frontmatter: Record<string, any> = {};
  try {
    const loaded = yaml.load(block);
    frontmatter = loaded && typeof loaded === 'object' && !Array.isArray(loaded) ? (loaded as Record<string, any>) : {};
  } catch {
    // Same fallback as the server: plain `key: value` lines.
    for (const line of lines.slice(1, end)) {
      const colon = line.indexOf(':');
      if (colon > 0) frontmatter[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
  }

  if (typeof frontmatter.tags === 'string') {
    frontmatter.tags = frontmatter.tags
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
  } else if (!Array.isArray(frontmatter.tags)) {
    frontmatter.tags = [];
  }
  if (frontmatter.revision !== undefined) {
    frontmatter.revision = parseInt(String(frontmatter.revision), 10) || 0;
  }
  return { frontmatter: frontmatter as T, body };
}

export function serializeFrontmatter(frontmatter: Record<string, any>, body: string): string {
  const yamlText = yaml
    .dump(frontmatter, { indent: 2, lineWidth: -1, noRefs: true, quotingType: '"', forceQuotes: false })
    .trim();
  return `${DELIMITER}\n${yamlText}\n${DELIMITER}\n\n${(body || '').trimStart()}`;
}

export type DocType = 'project' | 'client' | 'quote' | 'invoice' | 'journal_day' | 'note' | string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (v: unknown) => typeof v === 'string' && ISO_DATE.test(v.trim());

/** Schema checks per document type (docs/SCHEMA.md). Never drops keys. */
export function validateFrontmatter(type: DocType, data: unknown): {
  valid: boolean;
  errors: string[];
  data: Record<string, any>;
} {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Frontmatter data must be a non-null object'], data: (data as any) || {} };
  }
  const v: Record<string, any> = { ...(data as Record<string, any>) };
  const errors: string[] = [];

  switch (String(type || '').toLowerCase()) {
    case 'project': {
      const statuses = ['backlog', 'in-progress', 'in_progress', 'review', 'revision', 'approved', 'archived', 'done', 'completed'];
      if (v.status && !statuses.includes(String(v.status).toLowerCase())) {
        errors.push(`Invalid project status: "${v.status}". Expected one of: ${statuses.join(', ')}`);
      }
      if (v.revision !== undefined) {
        const rev = Number(v.revision);
        if (isNaN(rev) || rev < 0) errors.push(`Project revision must be a non-negative integer, got: ${v.revision}`);
        else v.revision = Math.floor(rev);
      }
      if (v.deadline && !isIsoDate(v.deadline)) errors.push(`Project deadline must be an ISO date (YYYY-MM-DD), got: ${v.deadline}`);
      if (v.created && !isIsoDate(v.created)) errors.push(`Project created date must be an ISO date (YYYY-MM-DD), got: ${v.created}`);
      if (v.tags) {
        if (typeof v.tags === 'string') v.tags = v.tags.replace(/^\[|\]$/g, '').split(',').map((t: string) => t.trim()).filter(Boolean);
        else if (!Array.isArray(v.tags)) errors.push('Project tags must be an array of strings');
      }
      break;
    }
    case 'client': {
      if (!v.code) errors.push('Client code is required');
      else if (!/^[A-Za-z0-9_-]{2,8}$/.test(String(v.code).trim())) errors.push(`Client code should be 2-8 alphanumeric characters, got: "${v.code}"`);
      if (!v.name) errors.push('Client name is required');
      if (v.default_hourly_rate !== undefined && (isNaN(Number(v.default_hourly_rate)) || Number(v.default_hourly_rate) < 0)) {
        errors.push('Client default_hourly_rate must be a non-negative number');
      }
      if (v.payment_terms_days !== undefined && (isNaN(Number(v.payment_terms_days)) || Number(v.payment_terms_days) < 0)) {
        errors.push('Client payment_terms_days must be a non-negative integer');
      }
      break;
    }
    case 'quote':
    case 'invoice': {
      const label = type === 'quote' ? 'Quote' : 'Invoice';
      if (!(v.documentNumber || v.id)) errors.push(`${label} requires a documentNumber or id`);
      if (v.date && !isIsoDate(v.date)) errors.push(`${label} date must be an ISO date (YYYY-MM-DD), got: ${v.date}`);
      const until = type === 'quote' ? 'valid_until' : 'due_date';
      if (v[until] && !isIsoDate(v[until])) errors.push(`${label} ${until} must be an ISO date (YYYY-MM-DD), got: ${v[until]}`);
      if (v.items && !Array.isArray(v.items)) errors.push(`${label} items must be an array`);
      break;
    }
    case 'journal_day':
    case 'journal_daily':
    case 'daily':
    case 'daily_log': {
      if (!v.date) errors.push('Daily journal note requires a date');
      else if (!isIsoDate(v.date)) errors.push(`Daily journal date must be an ISO date (YYYY-MM-DD), got: ${v.date}`);
      if (v.habits && !Array.isArray(v.habits)) errors.push('habits must be an array of strings');
      break;
    }
    case 'note':
    case 'atomic_note': {
      if (!v.title && !v.id) errors.push('Atomic note requires a title or id');
      const cat = v.category || v.type;
      if (cat && !['fleeting', 'literature', 'permanent'].includes(String(cat).toLowerCase())) {
        errors.push(`Invalid note category: "${cat}". Expected one of: fleeting, literature, permanent`);
      }
      break;
    }
  }
  return { valid: errors.length === 0, errors, data: v };
}

/** Short content hash for optimistic concurrency checks (`versionHash`). */
export async function contentHash(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
  }
  // FNV-1a fallback when SubtleCrypto is unavailable (non-secure context).
  let h = 0x811c9dc5;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}
