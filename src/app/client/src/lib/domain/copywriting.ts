/**
 * Project copy in `<project>/03_COPY/COPY.md` (never `03_COPYWRITING`).
 * Port of server/services/CopywritingService.js. An empty or missing file is
 * seeded with a neutral template so it exists for the user to edit.
 * The server's `_Team/copywriting/<id>.md` fallback for unknown projects is
 * dropped: callers resolve the project first.
 */

import type { VaultFs } from '$lib/vault/types';
import { baseName } from '$lib/vault/paths';

export const COPY_DIR = '03_COPY';
export const COPY_FILE = 'COPY.md';
export const copyPath = (projectPath: string) => `${projectPath}/${COPY_DIR}/${COPY_FILE}`;

export interface CopyStats {
  words: number;
  chars: number;
  readingTimeMin: number;
}

export interface Copywriting {
  /** Vault-relative path of COPY.md. */
  filePath: string;
  body: string;
  stats: CopyStats;
  lastUpdated: string | null;
  updatedBy: string;
}

export function copyStats(body: string): CopyStats {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return { words, chars: body.length, readingTimeMin: Math.max(1, Math.ceil(words / 200)) };
}

export function defaultCopyTemplate(projectTitle = 'Project Copywriting'): string {
  return `# Copywriting & Script Studio: ${projectTitle}

## Target Audience & Hook Strategy
- **Core Audience**: Who this campaign speaks to and what they care about.
- **Tone of Voice**: Three words that describe how the brand sounds.
- **Primary Angle**: The single benefit or promise the copy leads with.

---

## Ad Copy Variants

### Angle 1: Direct Benefit
> **Headline**: "Lead with the clearest benefit in under ten words."
> **Primary Text**: Two or three sentences that expand the promise and answer one objection.
> **CTA**: [ Primary call to action ]

### Angle 2: Social Proof & Urgency
> **Headline**: "Show who already trusts the brand."
> **Primary Text**: A short proof point, testimonial or number, then a reason to act now.
> **CTA**: [ Secondary call to action ]

---

## Video Script (9:16)

| Scene | Visual / On-Screen Action | Audio / Voiceover |
| :--- | :--- | :--- |
| **00:00 - 00:03** | Hook shot | *Opening line that stops the scroll.* |
| **00:03 - 00:07** | Product or service in use | *The problem and the promise.* |
| **00:07 - 00:12** | Proof or detail close-up | *Why it works.* |
| **00:12 - 00:15** | End card with CTA | *Call to action.* |

---

## Claims & Compliance Checklist
- [ ] Every claim can be backed up by the client
- [ ] Platform and legal requirements reviewed
- [ ] Final copy approved by the client
`;
}

async function modifiedAt(fs: VaultFs, path: string): Promise<string | null> {
  try {
    const parent = path.slice(0, path.lastIndexOf('/'));
    const entry = (await fs.listDir(parent)).find((e) => baseName(e.path) === baseName(path));
    return entry?.modifiedMs != null ? new Date(entry.modifiedMs).toISOString() : null;
  } catch {
    return null;
  }
}

/** Reads COPY.md; seeds and saves the template when it is missing or blank. */
export async function getCopywriting(fs: VaultFs, projectPath: string, projectTitle: string, now: Date): Promise<Copywriting> {
  const filePath = copyPath(projectPath);
  let body = '';
  let lastUpdated: string | null = null;
  try {
    body = await fs.readText(filePath);
    lastUpdated = await modifiedAt(fs, filePath);
  } catch {
    body = '';
  }

  if (!body.trim()) {
    body = defaultCopyTemplate(projectTitle || baseName(projectPath));
    try {
      await fs.writeText(filePath, body);
      lastUpdated = now.toISOString();
    } catch (err: any) {
      console.warn('[copywriting] Auto-save of the default template failed:', err?.message);
    }
  }
  return { filePath, body, stats: copyStats(body), lastUpdated, updatedBy: 'Copywriter' };
}

export async function updateCopywriting(
  fs: VaultFs,
  projectPath: string,
  body: string,
  actor: string,
  now: Date
): Promise<Copywriting & { success: true }> {
  const filePath = copyPath(projectPath);
  const text = String(body ?? '');
  await fs.writeText(filePath, text);
  return { success: true, filePath, body: text, stats: copyStats(text), lastUpdated: now.toISOString(), updatedBy: actor };
}
